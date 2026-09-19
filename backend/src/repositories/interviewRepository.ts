import { Prisma } from "../generated/prisma/client.js";
import { InterviewStatus as PrismaInterviewStatus } from "../generated/prisma/enums.js";
import type { DbClient } from "../lib/db.js";
import { prisma } from "../lib/prisma.js";

export type InterviewWithRelations = Prisma.InterviewGetPayload<{
  include: {
    candidate: true;
    createdBy: true;
    interviewers: { include: { user: true } };
    scorecard: { include: { criteria: true } };
    practicalItems: true;
    decisionHistory: true;
    reschedules: true;
  };
}>;

const includeRelations = {
  candidate: true,
  createdBy: true,
  interviewers: { include: { user: true } },
  scorecard: { include: { criteria: true } },
  practicalItems: true,
  decisionHistory: { orderBy: { changedAt: "asc" as const } },
  reschedules: { orderBy: { changedAt: "asc" as const } },
};

export interface InterviewListFilters {
  tenantId: string;
  status?: PrismaInterviewStatus;
  search?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

const buildWhere = (filters: InterviewListFilters): Prisma.InterviewWhereInput => {
  const and: Prisma.InterviewWhereInput[] = [{ tenantId: filters.tenantId }];
  if (filters.status) and.push({ status: filters.status });
  if (filters.from || filters.to) {
    and.push({
      startsAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {}),
      },
    });
  }
  if (filters.search?.trim()) {
    const query = filters.search.trim();
    and.push({
      OR: [
        { reference: { contains: query } },
        { location: { contains: query } },
        { candidate: { name: { contains: query } } },
        { candidate: { profession: { contains: query } } },
      ],
    });
  }
  return { AND: and };
};

export const findInterviews = async (filters: InterviewListFilters): Promise<{ items: InterviewWithRelations[]; total: number }> => {
  const where = buildWhere(filters);
  const [items, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: includeRelations,
    }),
    prisma.interview.count({ where }),
  ]);
  return { items, total };
};

export const findInterviewById = async (tenantId: string, id: string): Promise<InterviewWithRelations | null> =>
  prisma.interview.findFirst({
    where: { tenantId, id },
    include: includeRelations,
  });

export const findActiveInterviewsForWindow = async (
  tenantId: string,
  from: Date,
  to: Date,
  excludeId?: string,
): Promise<InterviewWithRelations[]> =>
  prisma.interview.findMany({
    where: {
      tenantId,
      status: { in: ["SCHEDULED", "IN_PROGRESS", "EVALUATION"] },
      startsAt: { lt: to },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: includeRelations,
  });

export const findCandidateActiveInterviews = async (
  tenantId: string,
  candidateId: string,
  excludeId?: string,
): Promise<InterviewWithRelations[]> =>
  prisma.interview.findMany({
    where: {
      tenantId,
      candidateId,
      status: { in: ["SCHEDULED", "IN_PROGRESS", "EVALUATION"] },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: includeRelations,
  });

export const createInterview = async (tx: DbClient, data: Prisma.InterviewCreateInput): Promise<void> => {
  await tx.interview.create({ data });
};

export const updateInterview = async (
  tx: DbClient,
  tenantId: string,
  id: string,
  data: Prisma.InterviewUpdateInput,
): Promise<void> => {
  const result = await tx.interview.updateMany({
    where: { tenantId, id },
    data,
  });
  if (result.count !== 1) throw new Error("Interview tenant mismatch.");
};