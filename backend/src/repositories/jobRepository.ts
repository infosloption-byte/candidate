import { Prisma } from "../generated/prisma/client.js";
import type { DbClient } from "../lib/db.js";
import { prisma } from "../lib/prisma.js";

export type JobRecord = Prisma.JobGetPayload<{
  include: {
    approval: true;
  };
}>;

export interface JobFilters {
  tenantId: string;
  search?: string;
  status?: "DRAFT" | "OPEN" | "PAUSED" | "FILLED" | "CLOSED";
  page: number;
  pageSize: number;
}

const whereFor = (filters: JobFilters): Prisma.JobWhereInput => {
  const and: Prisma.JobWhereInput[] = [{ tenantId: filters.tenantId }];
  if (filters.status) and.push({ status: filters.status });
  if (filters.search?.trim()) {
    const query = filters.search.trim();
    and.push({
      OR: [
        { title: { contains: query } },
        { project: { contains: query } },
        { location: { contains: query } },
        { client: { contains: query } },
        { profession: { contains: query } },
      ],
    });
  }
  return { AND: and };
};

export const findJobs = async (filters: JobFilters): Promise<{ items: JobRecord[]; total: number }> => {
  const where = whereFor(filters);
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { approval: true },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.job.count({ where }),
  ]);
  return { items, total };
};

export const findJobById = async (tenantId: string, id: string): Promise<JobRecord | null> =>
  prisma.job.findFirst({
    where: { tenantId, id },
    include: { approval: true },
  });

export const createJob = async (tx: DbClient, data: Prisma.JobCreateInput): Promise<void> => {
  await tx.job.create({ data });
};

export const updateJob = async (tx: DbClient, tenantId: string, id: string, data: Prisma.JobUpdateInput): Promise<void> => {
  const result = await tx.job.updateMany({ where: { tenantId, id }, data });
  if (result.count !== 1) throw new Error("Job tenant mismatch.");
};