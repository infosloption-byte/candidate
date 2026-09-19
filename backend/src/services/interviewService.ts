import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import {
  InterviewDecision as PrismaInterviewDecision,
  InterviewStatus as PrismaInterviewStatus,
  InterviewType as PrismaInterviewType,
  UserRole,
} from "../generated/prisma/enums.js";
import { AppError } from "../errors/AppError.js";
import { withTransaction } from "../lib/db.js";
import { createAuditEvent } from "../repositories/auditRepository.js";
import { findActiveUserById } from "../repositories/userRepository.js";
import { findCandidateById } from "../repositories/candidateRepository.js";
import {
  createInterview,
  findCandidateActiveInterviews,
  findInterviewById,
  findInterviews,
  findActiveInterviewsForWindow,
  updateInterview,
  type InterviewWithRelations,
  type InterviewListFilters,
} from "../repositories/interviewRepository.js";
import { createJourneyEvent } from "../repositories/candidateRepository.js";
import { localDateTimeToUtc, formatLocalDate, formatLocalTime } from "./timezoneService.js";
import type { AuthContext } from "../types/fastify.js";

interface InterviewInput {
  candidateId: string;
  type: "Screening" | "Technical" | "Practical" | "Client" | "Final";
  date: string;
  time: string;
  durationMinutes: number;
  location: string;
  timezone?: string;
  interviewerIds: string[];
  notes?: string;
}

const typeMap = {
  Screening: PrismaInterviewType.SCREENING,
  Technical: PrismaInterviewType.TECHNICAL,
  Practical: PrismaInterviewType.PRACTICAL,
  Client: PrismaInterviewType.CLIENT,
  Final: PrismaInterviewType.FINAL,
} satisfies Record<InterviewInput["type"], PrismaInterviewType>;

const statusMap: Record<string, PrismaInterviewStatus> = {
  scheduled: PrismaInterviewStatus.SCHEDULED,
  "in-progress": PrismaInterviewStatus.IN_PROGRESS,
  evaluation: PrismaInterviewStatus.EVALUATION,
  completed: PrismaInterviewStatus.COMPLETED,
  "no-show": PrismaInterviewStatus.NO_SHOW,
  cancelled: PrismaInterviewStatus.CANCELLED,
};

const decisionMap: Record<string, PrismaInterviewDecision> = {
  pending: PrismaInterviewDecision.PENDING,
  selected: PrismaInterviewDecision.SELECTED,
  reserve: PrismaInterviewDecision.RESERVE,
  rejected: PrismaInterviewDecision.REJECTED,
};

const activeStatuses = new Set<PrismaInterviewStatus>([
  PrismaInterviewStatus.SCHEDULED,
  PrismaInterviewStatus.IN_PROGRESS,
  PrismaInterviewStatus.EVALUATION,
]);

const overlaps = (start: Date, durationMinutes: number, other: InterviewWithRelations): boolean => {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const otherEnd = new Date(other.startsAt.getTime() + other.durationMinutes * 60_000);
  return start < otherEnd && other.startsAt < end;
};

const validateInterviewerPool = async (auth: AuthContext, interviewerIds: string[]) => {
  const uniqueIds = [...new Set(interviewerIds)];
  if (uniqueIds.length !== interviewerIds.length) throw AppError.invalidInput("Interviewer panel contains duplicates.");
  const users = await Promise.all(uniqueIds.map((id) => findActiveUserById(auth.tenantId, id)));
  if (users.some((user) => !user || user.role !== UserRole.INTERVIEWER)) {
    throw AppError.invalidInput("Every assigned interviewer must be an active interviewer in this workspace.");
  }
  return uniqueIds;
};

const conflictReasons = (
  candidateName: string,
  location: string,
  interviewerIds: string[],
  candidateInterviews: InterviewWithRelations[],
  windowInterviews: InterviewWithRelations[],
  startsAt: Date,
  durationMinutes: number,
): string[] => {
  const reasons = new Set<string>();
  for (const interview of candidateInterviews) {
    if (activeStatuses.has(interview.status) && overlaps(startsAt, durationMinutes, interview)) {
      reasons.add(`Candidate already has an overlapping interview (${formatLocalDate(interview.startsAt, interview.timezone)} ${formatLocalTime(interview.startsAt, interview.timezone)}).`);
    }
  }
  const assigned = new Set(interviewerIds);
  for (const interview of windowInterviews) {
    if (!overlaps(startsAt, durationMinutes, interview)) continue;
    if (interview.interviewers.some((item) => assigned.has(item.userId))) {
      reasons.add(`Interviewer overlap with ${interview.candidate.name}.`);
    }
    if (location.trim().toLowerCase() !== "online" && interview.location.trim().toLowerCase() === location.trim().toLowerCase()) {
      reasons.add(`Room conflict with ${interview.candidate.name}.`);
    }
  }
  return [...reasons];
};

const toDto = (interview: InterviewWithRelations) => ({
  id: interview.id,
  reference: interview.reference,
  candidateId: interview.candidateId,
  candidateName: interview.candidate.name,
  profession: interview.candidate.profession,
  type: ({
    SCREENING: "Screening",
    TECHNICAL: "Technical",
    PRACTICAL: "Practical",
    CLIENT: "Client",
    FINAL: "Final",
  } as const)[interview.type],
  status: ({
    SCHEDULED: "scheduled",
    IN_PROGRESS: "in-progress",
    EVALUATION: "evaluation",
    COMPLETED: "completed",
    NO_SHOW: "no-show",
    CANCELLED: "cancelled",
  } as const)[interview.status],
  date: formatLocalDate(interview.startsAt, interview.timezone),
  time: formatLocalTime(interview.startsAt, interview.timezone),
  durationMinutes: interview.durationMinutes,
  location: interview.location,
  interviewers: interview.interviewers.map((item) => ({
    id: item.user.id,
    name: item.user.name,
    role: item.user.email,
    specialties: [],
    active: item.user.active,
  })),
  notes: interview.notes,
  scorecard: {
    templateId: interview.scorecard?.templateId ?? "default",
    criteria: (interview.scorecard?.criteria ?? []).map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      weight: criterion.weight,
      score: criterion.score,
      note: criterion.note ?? "",
    })),
  },
  practicalTest: interview.practicalItems.map((item) => ({
    id: item.id,
    label: item.label,
    required: item.required,
    result: item.result,
    note: item.note ?? "",
  })),
  decision: {
    decision: ({
      PENDING: "pending",
      SELECTED: "selected",
      RESERVE: "reserve",
      REJECTED: "rejected",
    } as const)[interview.decision],
    reason: interview.decisionReason ?? "",
    note: interview.decisionNote ?? "",
  },
  decisionHistory: interview.decisionHistory.map((item) => ({
    id: item.id,
    fromDecision: item.fromDecision.toLowerCase(),
    toDecision: item.toDecision.toLowerCase(),
    reason: item.reason,
    note: item.note,
    changedAt: item.changedAt.toISOString(),
  })),
  rescheduleHistory: interview.reschedules.map((item) => ({
    id: item.id,
    fromDate: formatLocalDate(item.fromStartsAt, interview.timezone),
    fromTime: formatLocalTime(item.fromStartsAt, interview.timezone),
    fromInterviewerIds: Array.isArray(item.fromInterviewerIds) ? item.fromInterviewerIds.filter((value): value is string => typeof value === "string") : [],
    toDate: formatLocalDate(item.toStartsAt, interview.timezone),
    toTime: formatLocalTime(item.toStartsAt, interview.timezone),
    toInterviewerIds: Array.isArray(item.toInterviewerIds) ? item.toInterviewerIds.filter((value): value is string => typeof value === "string") : [],
    reason: item.reason ?? "",
    changedAt: item.changedAt.toISOString(),
    undoneAt: item.undoneAt?.toISOString() ?? null,
  })),
  createdAt: interview.createdAt.toISOString(),
});

const validateWindow = async (
  auth: AuthContext,
  candidateId: string,
  location: string,
  interviewerIds: string[],
  startsAt: Date,
  durationMinutes: number,
  excludeId?: string,
): Promise<void> => {
  const candidate = await findCandidateById(auth.tenantId, candidateId);
  if (!candidate) throw AppError.notFound("Candidate not found.");

  await validateInterviewerPool(auth, interviewerIds);
  const windowFrom = new Date(startsAt.getTime() - durationMinutes * 60_000);
  const windowTo = new Date(startsAt.getTime() + durationMinutes * 60_000 * 2);
  const [candidateInterviews, windowInterviews] = await Promise.all([
    findCandidateActiveInterviews(auth.tenantId, candidateId, excludeId),
    findActiveInterviewsForWindow(auth.tenantId, windowFrom, windowTo, excludeId),
  ]);
  const reasons = conflictReasons(candidate.name, location, interviewerIds, candidateInterviews, windowInterviews, startsAt, durationMinutes);
  if (reasons.length > 0) {
    throw new AppError(409, "SCHEDULE_CONFLICT", "The interview slot conflicts with an existing booking.", reasons.map((message) => ({
      code: "CONFLICT",
      message,
    })));
  }
};

export const listInterviews = async (filters: InterviewListFilters) => {
  const result = await findInterviews(filters);
  return {
    items: result.items.map(toDto),
    total: result.total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / filters.pageSize)),
  };
};

export const listInterviewers = async (tenantId: string) => {
  const users = await findActiveInterviewerUsers(tenantId);
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.email,
    specialties: [],
    active: user.active,
  }));
};

export const createInterviewRecord = async (auth: AuthContext, input: InterviewInput) => {
  const timezone = input.timezone?.trim() || "Asia/Colombo";
  const startsAt = localDateTimeToUtc(input.date, input.time, timezone);
  const reference = `IV-${Date.now().toString(36).toUpperCase().slice(-7)}`;
  const interviewId = randomUUID();

  await validateWindow(auth, input.candidateId, input.location, input.interviewerIds, startsAt, input.durationMinutes);

  await withTransaction(async (tx) => {
    await createInterview(tx, {
      id: interviewId,
      tenant: { connect: { id: auth.tenantId } },
      reference,
      candidate: { connect: { id: input.candidateId } },
      type: typeMap[input.type],
      status: PrismaInterviewStatus.SCHEDULED,
      startsAt,
      timezone,
      durationMinutes: input.durationMinutes,
      location: input.location.trim(),
      notes: input.notes?.trim() ?? "",
      decision: PrismaInterviewDecision.PENDING,
      createdBy: { connect: { id: auth.userId } },
      interviewers: {
        create: input.interviewerIds.map((userId) => ({
          tenantId: auth.tenantId,
          userId,
        })),
      },
    });

    await createJourneyEvent(tx, {
      id: randomUUID(),
      tenantId: auth.tenantId,
      candidateId: input.candidateId,
      title: "Interview scheduled",
      detail: `${input.date} at ${input.time} · ${input.location.trim()}`,
      tone: "NEUTRAL",
      occurredAt: new Date(),
    });

    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Interview",
      entityId: interviewId,
      action: "interview.created",
      metadata: { reference, candidateId: input.candidateId, startsAt: startsAt.toISOString() },
    }, tx);
  });

  const created = await findInterviewById(auth.tenantId, interviewId);
  if (!created) throw AppError.internal();
  return toDto(created);
};

export const updateInterviewStatus = async (auth: AuthContext, id: string, status: string) => {
  const existing = await findInterviewById(auth.tenantId, id);
  if (!existing) throw AppError.notFound("Interview not found.");
  const next = statusMap[status];
  if (!next) throw AppError.invalidInput("Invalid interview status.");

  await withTransaction(async (tx) => {
    await updateInterview(tx, auth.tenantId, id, { status: next });
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Interview",
      entityId: id,
      action: "interview.status_changed",
      metadata: { from: existing.status, to: next },
    }, tx);
  });

  const updated = await findInterviewById(auth.tenantId, id);
  if (!updated) throw AppError.internal();
  return toDto(updated);
};

export const recordDecision = async (
  auth: AuthContext,
  id: string,
  decision: "selected" | "reserve" | "rejected",
  reason: string,
  note: string,
) => {
  const existing = await findInterviewById(auth.tenantId, id);
  if (!existing) throw AppError.notFound("Interview not found.");

  await withTransaction(async (tx) => {
    await updateInterview(tx, auth.tenantId, id, {
      decision: decisionMap[decision],
      decisionReason: reason.trim(),
      decisionNote: note.trim(),
      status: PrismaInterviewStatus.COMPLETED,
    });

    await tx.interviewDecisionHistory.create({
      data: {
        id: randomUUID(),
        tenantId: auth.tenantId,
        interviewId: id,
        fromDecision: existing.decision,
        toDecision: decisionMap[decision],
        reason: reason.trim(),
        note: note.trim(),
      },
    });

    await createJourneyEvent(tx, {
      id: randomUUID(),
      tenantId: auth.tenantId,
      candidateId: existing.candidateId,
      title: `Interview decision: ${decision}`,
      detail: `${reason.trim()}: ${note.trim()}`,
      tone: decision === "rejected" ? "NEGATIVE" : decision === "selected" ? "POSITIVE" : "WARNING",
      occurredAt: new Date(),
    });

    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Interview",
      entityId: id,
      action: "interview.decision_recorded",
      metadata: { from: existing.decision, to: decision, reason: reason.trim() },
    }, tx);
  });

  const updated = await findInterviewById(auth.tenantId, id);
  if (!updated) throw AppError.internal();
  return toDto(updated);
};

export const rescheduleInterview = async (
  auth: AuthContext,
  id: string,
  date: string,
  time: string,
  interviewerIds: string[],
  reason = "",
  timezone = "Asia/Colombo",
) => {
  const existing = await findInterviewById(auth.tenantId, id);
  if (!existing) throw AppError.notFound("Interview not found.");

  const startsAt = localDateTimeToUtc(date, time, timezone);
  await validateWindow(auth, existing.candidateId, existing.location, interviewerIds, startsAt, existing.durationMinutes, id);

  await withTransaction(async (tx) => {
    await updateInterview(tx, auth.tenantId, id, {
      startsAt,
      timezone,
      interviewers: {
        deleteMany: {},
        create: interviewerIds.map((userId) => ({
          tenantId: auth.tenantId,
          userId,
        })),
      },
    });

    await tx.interviewReschedule.create({
      data: {
        id: randomUUID(),
        tenantId: auth.tenantId,
        interviewId: id,
        fromStartsAt: existing.startsAt,
        fromDurationMinutes: existing.durationMinutes,
        fromInterviewerIds: existing.interviewers.map((item) => item.userId),
        toStartsAt: startsAt,
        toInterviewerIds: interviewerIds,
        reason: reason.trim(),
      },
    });

    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Interview",
      entityId: id,
      action: "interview.rescheduled",
      metadata: {
        from: existing.startsAt.toISOString(),
        to: startsAt.toISOString(),
        interviewerIds,
        reason: reason.trim(),
      },
    }, tx);
  });

  const updated = await findInterviewById(auth.tenantId, id);
  if (!updated) throw AppError.internal();
  return toDto(updated);
};

const findActiveInterviewerUsers = async (tenantId: string) =>
  (await Promise.all(
    (["INTERVIEWER"] as const).map(() =>
      prismaUserFindMany(tenantId),
    ),
  )).flat();

const prismaUserFindMany = async (tenantId: string) => {
  const { prisma } = await import("../lib/prisma.js");
  return prisma.user.findMany({
    where: { tenantId, role: UserRole.INTERVIEWER, active: true },
    orderBy: { name: "asc" },
  });
};