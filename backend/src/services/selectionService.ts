import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import { ApprovalStatus as PrismaApprovalStatus, SelectionDecision as PrismaSelectionDecision } from "../generated/prisma/enums.js";
import { AppError } from "../errors/AppError.js";
import { withTransaction } from "../lib/db.js";
import { createAuditEvent } from "../repositories/auditRepository.js";
import { findCandidateById } from "../repositories/candidateRepository.js";
import { findJobById } from "../repositories/jobRepository.js";
import {
  countSelectedForJob,
  createSelectionHistory,
  createSelectionRecord,
  findJobForSelection,
  findSelectionBundle,
  findSelectionRecord,
  updateSelectionRecord,
  upsertSelectionApproval,
  type SelectionRecordWithActor,
} from "../repositories/selectionRepository.js";
import type { AuthContext } from "../types/fastify.js";

export interface SelectionScoringWeights {
  experience: number;
  skills: number;
  interview: number;
  documents: number;
  readiness: number;
  communication: number;
}

export type SelectionDecisionInput = "recommended" | "selected" | "reserve" | "rejected";
export type ApprovalStatusInput = "draft" | "pending" | "approved" | "returned";

const decisionMap = {
  recommended: PrismaSelectionDecision.RECOMMENDED,
  selected: PrismaSelectionDecision.SELECTED,
  reserve: PrismaSelectionDecision.RESERVE,
  rejected: PrismaSelectionDecision.REJECTED,
} satisfies Record<SelectionDecisionInput, PrismaSelectionDecision>;

const approvalMap = {
  draft: PrismaApprovalStatus.DRAFT,
  pending: PrismaApprovalStatus.PENDING,
  approved: PrismaApprovalStatus.APPROVED,
  returned: PrismaApprovalStatus.RETURNED,
} satisfies Record<ApprovalStatusInput, PrismaApprovalStatus>;

const frontendDecisionMap = {
  RECOMMENDED: "recommended",
  SELECTED: "selected",
  RESERVE: "reserve",
  REJECTED: "rejected",
} as const satisfies Record<PrismaSelectionDecision, SelectionDecisionInput>;

const frontendApprovalMap = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  RETURNED: "returned",
} as const satisfies Record<PrismaApprovalStatus, ApprovalStatusInput>;

const frontendDecision = (value: PrismaSelectionDecision): SelectionDecisionInput => frontendDecisionMap[value];

const frontendApproval = (value: PrismaApprovalStatus): ApprovalStatusInput => frontendApprovalMap[value];

const defaultWeights: SelectionScoringWeights = {
  experience: 25,
  skills: 25,
  interview: 25,
  documents: 10,
  readiness: 10,
  communication: 5,
};

const normalizeWeights = (input: SelectionScoringWeights): SelectionScoringWeights => {
  const safe = {
    experience: Math.max(0, Math.min(100, Number.isFinite(input.experience) ? input.experience : 0)),
    skills: Math.max(0, Math.min(100, Number.isFinite(input.skills) ? input.skills : 0)),
    interview: Math.max(0, Math.min(100, Number.isFinite(input.interview) ? input.interview : 0)),
    documents: Math.max(0, Math.min(100, Number.isFinite(input.documents) ? input.documents : 0)),
    readiness: Math.max(0, Math.min(100, Number.isFinite(input.readiness) ? input.readiness : 0)),
    communication: Math.max(0, Math.min(100, Number.isFinite(input.communication) ? input.communication : 0)),
  };
  const total = Object.values(safe).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { ...defaultWeights };
  const keys = Object.keys(safe) as Array<keyof SelectionScoringWeights>;
  const normalized = { ...defaultWeights };
  for (const key of keys) normalized[key] = Math.round((safe[key] / total) * 100);
  let remainder = 100 - Object.values(normalized).reduce((sum, value) => sum + value, 0);
  for (const key of keys) {
    if (remainder === 0) break;
    normalized[key] += remainder > 0 ? 1 : -1;
    remainder += remainder > 0 ? -1 : 1;
  }
  return normalized;
};

const strings = (value: Prisma.JsonValue): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

export const toSelectionJobDto = (job: Prisma.JobGetPayload<{}>) => {
  return {
    id: job.id,
    title: job.title,
    project: job.project,
    location: job.location,
    openings: job.openings,
    profession: job.profession,
    requiredExperience: job.requiredExperience,
    requiredSkills: strings(job.requiredSkills),
    preferredSkills: strings(job.preferredSkills),
    client: job.client,
    status: ({
      DRAFT: "draft",
      OPEN: "open",
      PAUSED: "paused",
      FILLED: "filled",
      CLOSED: "closed",
    } as const)[job.status],
    startDate: job.startDate?.toISOString().slice(0, 10),
    deadline: job.deadline?.toISOString().slice(0, 10),
  };
};

const toRecordDto = (record: SelectionRecordWithActor) => ({
  candidateId: record.candidateId,
  jobId: record.jobId,
  decision: frontendDecision(record.decision),
  reason: record.reason,
  note: record.note,
  decidedAt: record.decidedAt.toISOString(),
  decidedBy: record.decidedBy.name,
});

export const getSelectionWorkspace = async (tenantId: string) => {
  const bundle = await findSelectionBundle(tenantId);
  const jobs = bundle.jobs.map(toSelectionJobDto);
  const records = bundle.records.map(toRecordDto);
  const history = bundle.history.map((entry) => ({
    candidateId: entry.candidateId,
    jobId: entry.jobId,
    relatedJobId: entry.relatedJobId ?? undefined,
    action: ({
      DECISION_CHANGED: "decision_changed",
      REASSIGNED: "reassigned",
      APPROVAL_CHANGED: "approval_changed",
      ALLOCATED: "allocated",
    } as const)[entry.action],
    fromDecision: entry.fromDecision ? frontendDecision(entry.fromDecision) : null,
    toDecision: entry.toDecision ? frontendDecision(entry.toDecision) : null,
    reason: entry.reason,
    note: entry.note,
    occurredAt: entry.occurredAt.toISOString(),
    occurredBy: entry.occurredBy.name,
  }));

  const approvalByJob: Record<string, { status: ApprovalStatusInput; note: string }> = {};
  for (const approval of bundle.approvals) {
    approvalByJob[approval.jobId] = {
      status: frontendApproval(approval.status),
      note: approval.note,
    };
  }

  const scoringByJob: Record<string, SelectionScoringWeights> = {};
  for (const job of bundle.jobs) {
    const raw = job.scoringWeights;
    const parsed = raw && typeof raw === "object" && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
    scoringByJob[job.id] = normalizeWeights({
      experience: typeof parsed.experience === "number" ? parsed.experience : defaultWeights.experience,
      skills: typeof parsed.skills === "number" ? parsed.skills : defaultWeights.skills,
      interview: typeof parsed.interview === "number" ? parsed.interview : defaultWeights.interview,
      documents: typeof parsed.documents === "number" ? parsed.documents : defaultWeights.documents,
      readiness: typeof parsed.readiness === "number" ? parsed.readiness : defaultWeights.readiness,
      communication: typeof parsed.communication === "number" ? parsed.communication : defaultWeights.communication,
    });
  }

  return { jobs, records, history, approvalByJob, scoringByJob };
};

const selectedCountInTx = async (tx: Prisma.TransactionClient, tenantId: string, jobId: string) =>
  tx.selectionRecord.count({ where: { tenantId, jobId, decision: PrismaSelectionDecision.SELECTED } });

const ensureJobAndCandidate = async (auth: AuthContext, jobId: string, candidateId: string) => {
  const [job, candidate] = await Promise.all([
    findJobForSelection(auth.tenantId, jobId),
    findCandidateById(auth.tenantId, candidateId),
  ]);
  if (!job) throw AppError.notFound("Job not found.");
  if (!candidate) throw AppError.notFound("Candidate not found.");
  return { job, candidate };
};

export const saveDecision = async (
  auth: AuthContext,
  jobId: string,
  candidateId: string,
  decision: SelectionDecisionInput,
  reason: string,
  note: string,
) => {
  const { job, candidate } = await ensureJobAndCandidate(auth, jobId, candidateId);
  if (job.status === "CLOSED") throw AppError.conflict("Closed jobs cannot receive selection decisions.");

  const existing = await findSelectionRecord(auth.tenantId, candidateId, jobId);

  await withTransaction(async (tx) => {
    const currentSelected = await selectedCountInTx(tx, auth.tenantId, jobId);
    const wasSelected = existing?.decision === PrismaSelectionDecision.SELECTED;
    if (decision === "selected" && !wasSelected && currentSelected >= job.openings) {
      throw AppError.conflict("The job's selection capacity is already full.", [
        { field: "candidateId", code: "CAPACITY_EXCEEDED", message: `All ${job.openings} openings are already selected.` },
      ]);
    }

    const recordData: Prisma.SelectionRecordCreateInput = {
      id: existing?.id ?? crypto.randomUUID(),
      tenant: { connect: { id: auth.tenantId } },
      candidate: { connect: { id: candidateId } },
      job: { connect: { id: jobId } },
      decision: decisionMap[decision],
      reason: reason.trim(),
      note: note.trim(),
      decidedBy: { connect: { id: auth.userId } },
    };

    if (existing) {
      await updateSelectionRecord(tx, auth.tenantId, candidateId, jobId, {
        decision: decisionMap[decision],
        reason: reason.trim(),
        note: note.trim(),
        decidedBy: { connect: { id: auth.userId } },
        decidedAt: new Date(),
      });
    } else {
      await createSelectionRecord(tx, recordData);
    }

    const previousDecision = existing?.decision ?? null;
    await createSelectionHistory(tx, {
      id: crypto.randomUUID(),
      tenant: { connect: { id: auth.tenantId } },
      candidate: { connect: { id: candidateId } },
      job: { connect: { id: jobId } },
      action: "DECISION_CHANGED",
      fromDecision: previousDecision,
      toDecision: decisionMap[decision],
      reason: reason.trim(),
      note: note.trim(),
      occurredBy: { connect: { id: auth.userId } },
    });

    if (existing?.decision !== decisionMap[decision]) {
      await tx.selectionApproval.updateMany({
        where: { tenantId: auth.tenantId, jobId, status: "APPROVED" },
        data: { status: "DRAFT", note: "" },
      });
    }

    const candidateStatus = decision === "selected"
      ? "SELECTED"
      : decision === "reserve"
        ? "RESERVE"
        : decision === "rejected"
          ? "REJECTED"
          : null;

    if (candidateStatus) {
      await tx.candidate.updateMany({
        where: { tenantId: auth.tenantId, id: candidate.id },
        data: {
          status: candidateStatus,
          rejectionNote: decision === "rejected" ? note.trim() : null,
        },
      });
    }

    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "SelectionRecord",
      entityId: existing?.id ?? recordData.id as string,
      action: "selection.decision_changed",
      metadata: { jobId, candidateId, from: previousDecision, to: decision },
    }, tx);
  });

  const refreshed = await findSelectionRecord(auth.tenantId, candidateId, jobId);
  if (!refreshed) throw AppError.internal();
  return toRecordDto(refreshed);
};

export const setApproval = async (
  auth: AuthContext,
  jobId: string,
  status: ApprovalStatusInput,
  note: string,
) => {
  const job = await findJobForSelection(auth.tenantId, jobId);
  if (!job) throw AppError.notFound("Job not found.");

  const selectedCount = await countSelectedForJob(auth.tenantId, jobId);
  if (status === "pending" || status === "approved") {
    if (selectedCount === 0) throw AppError.invalidState("At least one selected candidate is required before approval.");
    if (selectedCount > job.openings) throw AppError.conflict("The selected shortlist exceeds the job capacity.");
  }

  await withTransaction(async (tx) => {
    await upsertSelectionApproval(tx, auth.tenantId, jobId, {
      tenant: { connect: { id: auth.tenantId } },
      job: { connect: { id: jobId } },
      status: approvalMap[status],
      note: note.trim(),
      changedAt: new Date(),
      changedBy: { connect: { id: auth.userId } },
    });

    await createSelectionHistory(tx, {
      id: crypto.randomUUID(),
      tenant: { connect: { id: auth.tenantId } },
      job: { connect: { id: jobId } },
      action: "APPROVAL_CHANGED",
      reason: `Approval changed to ${status}`,
      note: note.trim(),
      occurredBy: { connect: { id: auth.userId } },
    });

    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "SelectionApproval",
      entityId: jobId,
      action: "selection.approval_changed",
      metadata: { status, selectedCount },
    }, tx);
  });

  return { status, note: note.trim() };
};

export const setScoringWeights = async (auth: AuthContext, jobId: string, weights: SelectionScoringWeights) => {
  const job = await findJobForSelection(auth.tenantId, jobId);
  if (!job) throw AppError.notFound("Job not found.");
  const normalized = normalizeWeights(weights);

  await withTransaction(async (tx) => {
    await updateJobScoreWeights(tx, auth.tenantId, jobId, normalized);
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Job",
      entityId: jobId,
      action: "selection.scoring_weights_changed",
      metadata: { ...normalized },
    }, tx);
  });

  return normalized;
};

const updateJobScoreWeights = async (tx: Prisma.TransactionClient, tenantId: string, jobId: string, weights: SelectionScoringWeights): Promise<void> => {
  const result = await tx.job.updateMany({
    where: { tenantId, id: jobId },
    data: { scoringWeights: { ...weights } },
  });
  if (result.count !== 1) throw AppError.notFound("Job not found.");
};

export const reassignCandidates = async (
  auth: AuthContext,
  fromJobId: string,
  toJobId: string,
  candidateIds: string[],
  reason: string,
  note: string,
) => {
  if (fromJobId === toJobId) throw AppError.invalidInput("The target job must be different from the source job.");
  const [fromJob, toJob] = await Promise.all([
    findJobForSelection(auth.tenantId, fromJobId),
    findJobForSelection(auth.tenantId, toJobId),
  ]);
  if (!fromJob || !toJob) throw AppError.notFound("Source or target job not found.");

  const uniqueIds = [...new Set(candidateIds)];
  if (uniqueIds.length === 0) throw AppError.invalidInput("Select at least one candidate.");

  await withTransaction(async (tx) => {
    for (const candidateId of uniqueIds) {
      const candidate = await findCandidateById(auth.tenantId, candidateId);
      if (!candidate) throw AppError.notFound("One or more candidates could not be found.");

      const existingTarget = await tx.selectionRecord.findFirst({
        where: { tenantId: auth.tenantId, candidateId, jobId: toJobId },
      });
      if (existingTarget) throw AppError.conflict("A target-job selection record already exists for one of the candidates.");

      const source = await tx.selectionRecord.findFirst({
        where: { tenantId: auth.tenantId, candidateId, jobId: fromJobId },
      });
      if (!source) continue;

      await tx.selectionRecord.delete({ where: { id: source.id } });
      await tx.selectionRecord.create({
        data: {
          id: crypto.randomUUID(),
          tenant: { connect: { id: auth.tenantId } },
          candidate: { connect: { id: candidateId } },
          job: { connect: { id: toJobId } },
          decision: PrismaSelectionDecision.RECOMMENDED,
          reason: reason.trim(),
          note: note.trim(),
          decidedBy: { connect: { id: auth.userId } },
        },
      });

      await createSelectionHistory(tx, {
        id: crypto.randomUUID(),
        tenant: { connect: { id: auth.tenantId } },
        candidate: { connect: { id: candidateId } },
        job: { connect: { id: fromJobId } },
        relatedJob: { connect: { id: toJobId } },
        action: "REASSIGNED",
        fromDecision: source.decision,
        toDecision: PrismaSelectionDecision.RECOMMENDED,
        reason: reason.trim(),
        note: note.trim(),
        occurredBy: { connect: { id: auth.userId } },
      });
    }

    await tx.selectionApproval.updateMany({
      where: { tenantId: auth.tenantId, jobId: fromJobId, status: "APPROVED" },
      data: { status: "DRAFT", note: "" },
    });

    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "SelectionRecord",
      entityId: fromJobId,
      action: "selection.candidates_reassigned",
      metadata: { toJobId, candidateIds: uniqueIds },
    }, tx);
  });

  return getSelectionWorkspace(auth.tenantId);
};

export const bulkSaveDecisions = async (
  auth: AuthContext,
  jobId: string,
  candidateIds: string[],
  decision: SelectionDecisionInput,
  reason: string,
  note: string,
) => {
  const job = await findJobForSelection(auth.tenantId, jobId);
  if (!job) throw AppError.notFound("Job not found.");
  if (job.status === "CLOSED") throw AppError.conflict("Closed jobs cannot receive selection decisions.");

  const uniqueCandidateIds = [...new Set(candidateIds)];
  if (uniqueCandidateIds.length === 0) throw AppError.invalidInput("Select at least one candidate.");

  const candidates = await Promise.all(uniqueCandidateIds.map((candidateId) =>
    findCandidateById(auth.tenantId, candidateId),
  ));
  if (candidates.some((candidate) => !candidate)) {
    throw AppError.notFound("One or more candidates could not be found.");
  }

  const existingRecords = await Promise.all(uniqueCandidateIds.map((candidateId) =>
    findSelectionRecord(auth.tenantId, candidateId, jobId),
  ));

  await withTransaction(async (tx) => {
    const existingSelected = await selectedCountInTx(tx, auth.tenantId, jobId);
    const selectedDelta = existingRecords.reduce((delta, existing) => {
      const wasSelected = existing?.decision === PrismaSelectionDecision.SELECTED;
      const willBeSelected = decision === "selected";
      if (willBeSelected && !wasSelected) return delta + 1;
      if (!willBeSelected && wasSelected) return delta - 1;
      return delta;
    }, 0);

    if (existingSelected + selectedDelta > job.openings) {
      throw AppError.conflict("The selected shortlist exceeds the job capacity.", [
        { field: "candidateIds", code: "CAPACITY_EXCEEDED", message: `The job has ${job.openings} openings.` },
      ]);
    }

    for (let index = 0; index < uniqueCandidateIds.length; index += 1) {
      const candidateId = uniqueCandidateIds[index];
      const existing = existingRecords[index];
      if (!candidateId) continue;

      const nextDecision = decisionMap[decision];
      if (existing) {
        await updateSelectionRecord(tx, auth.tenantId, candidateId, jobId, {
          decision: nextDecision,
          reason: reason.trim(),
          note: note.trim(),
          decidedBy: { connect: { id: auth.userId } },
          decidedAt: new Date(),
        });
      } else {
        await createSelectionRecord(tx, {
          id: randomUUID(),
          tenant: { connect: { id: auth.tenantId } },
          candidate: { connect: { id: candidateId } },
          job: { connect: { id: jobId } },
          decision: nextDecision,
          reason: reason.trim(),
          note: note.trim(),
          decidedBy: { connect: { id: auth.userId } },
        });
      }

      await createSelectionHistory(tx, {
        id: randomUUID(),
        tenant: { connect: { id: auth.tenantId } },
        candidate: { connect: { id: candidateId } },
        job: { connect: { id: jobId } },
        action: "DECISION_CHANGED",
        fromDecision: existing?.decision ?? null,
        toDecision: nextDecision,
        reason: reason.trim(),
        note: note.trim(),
        occurredBy: { connect: { id: auth.userId } },
      });

      const candidateStatus = decision === "selected"
        ? "SELECTED"
        : decision === "reserve"
          ? "RESERVE"
          : decision === "rejected"
            ? "REJECTED"
            : null;

      if (candidateStatus) {
        await tx.candidate.updateMany({
          where: { tenantId: auth.tenantId, id: candidateId },
          data: {
            status: candidateStatus,
            rejectionNote: decision === "rejected" ? note.trim() : null,
          },
        });
      }
    }

    if (existingRecords.some((existing) => existing?.decision !== decisionMap[decision])) {
      await tx.selectionApproval.updateMany({
        where: { tenantId: auth.tenantId, jobId, status: "APPROVED" },
        data: { status: "DRAFT", note: "" },
      });
    }

    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "SelectionRecord",
      entityId: jobId,
      action: "selection.bulk_decision_changed",
      metadata: {
        candidateIds: uniqueCandidateIds,
        decision,
      },
    }, tx);
  });

  return getSelectionWorkspace(auth.tenantId);
};
