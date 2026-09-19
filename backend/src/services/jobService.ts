import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import { JobStatus as PrismaJobStatus } from "../generated/prisma/enums.js";
import { AppError } from "../errors/AppError.js";
import { withTransaction } from "../lib/db.js";
import { createAuditEvent } from "../repositories/auditRepository.js";
import { createJob, findJobById, findJobs, updateJob } from "../repositories/jobRepository.js";
import type { AuthContext } from "../types/fastify.js";

export interface JobInput {
  title: string;
  project: string;
  location: string;
  client: string;
  profession: string;
  openings: number;
  requiredExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
  startDate: string | null;
  deadline: string | null;
  status: "draft" | "open" | "paused" | "filled" | "closed";
}

const statusMap = {
  draft: PrismaJobStatus.DRAFT,
  open: PrismaJobStatus.OPEN,
  paused: PrismaJobStatus.PAUSED,
  filled: PrismaJobStatus.FILLED,
  closed: PrismaJobStatus.CLOSED,
} satisfies Record<JobInput["status"], PrismaJobStatus>;

const dateOnly = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fromStatus = (status: PrismaJobStatus): JobInput["status"] => ({
  DRAFT: "draft",
  OPEN: "open",
  PAUSED: "paused",
  FILLED: "filled",
  CLOSED: "closed",
}[status]);

const strings = (value: Prisma.JsonValue): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

export const toJobDto = (job: Awaited<ReturnType<typeof findJobById>> & object) => {
  if (!job) throw AppError.notFound("Job not found.");
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
    status: fromStatus(job.status),
    startDate: job.startDate?.toISOString().slice(0, 10),
    deadline: job.deadline?.toISOString().slice(0, 10),
  };
};

const toCreateData = (auth: AuthContext, input: JobInput): Prisma.JobCreateInput => ({
  id: randomUUID(),
  tenant: { connect: { id: auth.tenantId } },
  title: input.title.trim(),
  project: input.project.trim(),
  location: input.location.trim(),
  openings: input.openings,
  profession: input.profession.trim(),
  requiredExperience: input.requiredExperience,
  requiredSkills: input.requiredSkills,
  preferredSkills: input.preferredSkills,
  client: input.client.trim(),
  status: statusMap[input.status],
  scoringWeights: {
    experience: 25,
    skills: 25,
    interview: 25,
    documents: 10,
    readiness: 10,
    communication: 5,
  },
  startDate: dateOnly(input.startDate),
  deadline: dateOnly(input.deadline),
});

export const listJobs = async (filters: Parameters<typeof findJobs>[0]) => {
  const result = await findJobs(filters);
  return {
    items: result.items.map(toJobDto),
    total: result.total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / filters.pageSize)),
  };
};

export const getJob = async (tenantId: string, id: string) => {
  const job = await findJobById(tenantId, id);
  return toJobDto(job);
};

export const createJobRecord = async (auth: AuthContext, input: JobInput) => {
  if (input.deadline && input.startDate && input.deadline < input.startDate) {
    throw AppError.invalidInput("Deadline cannot be before the job start date.", [
      { field: "deadline", code: "INVALID_RANGE", message: "Use a deadline on or after the start date." },
    ]);
  }
  const id = randomUUID();
  await withTransaction(async (tx) => {
    await createJob(tx, { ...toCreateData(auth, input), id });
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Job",
      entityId: id,
      action: "job.created",
      metadata: { title: input.title.trim(), openings: input.openings },
    }, tx);
  });
  return getJob(auth.tenantId, id);
};

export const updateJobRecord = async (auth: AuthContext, id: string, input: JobInput) => {
  const existing = await findJobById(auth.tenantId, id);
  if (!existing) throw AppError.notFound("Job not found.");
  if (input.deadline && input.startDate && input.deadline < input.startDate) {
    throw AppError.invalidInput("Deadline cannot be before the job start date.");
  }
  await withTransaction(async (tx) => {
    await updateJob(tx, auth.tenantId, id, {
      title: input.title.trim(),
      project: input.project.trim(),
      location: input.location.trim(),
      openings: input.openings,
      profession: input.profession.trim(),
      requiredExperience: input.requiredExperience,
      requiredSkills: input.requiredSkills,
      preferredSkills: input.preferredSkills,
      client: input.client.trim(),
      status: statusMap[input.status],
      startDate: dateOnly(input.startDate),
      deadline: dateOnly(input.deadline),
    });
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Job",
      entityId: id,
      action: "job.updated",
      metadata: { title: input.title.trim() },
    }, tx);
  });
  return getJob(auth.tenantId, id);
};

export const closeJobRecord = async (auth: AuthContext, id: string) => {
  const existing = await findJobById(auth.tenantId, id);
  if (!existing) throw AppError.notFound("Job not found.");
  if (existing.status === PrismaJobStatus.CLOSED) return toJobDto(existing);
  await withTransaction(async (tx) => {
    await updateJob(tx, auth.tenantId, id, { status: PrismaJobStatus.CLOSED });
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Job",
      entityId: id,
      action: "job.closed",
      metadata: {},
    }, tx);
  });
  return getJob(auth.tenantId, id);
};