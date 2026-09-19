import { Prisma } from "../generated/prisma/client.js";
import type { DbClient } from "../lib/db.js";
import { prisma } from "../lib/prisma.js";

export type SelectionRecordWithActor = Prisma.SelectionRecordGetPayload<{
  include: { decidedBy: true };
}>;

export type SelectionHistoryRecord = Prisma.SelectionHistoryGetPayload<{
  include: { occurredBy: true };
}>;

export const findSelectionBundle = async (tenantId: string) => {
  const [jobs, records, history, approvals] = await Promise.all([
    prisma.job.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.selectionRecord.findMany({
      where: { tenantId },
      include: { decidedBy: true },
      orderBy: { decidedAt: "desc" },
    }),
    prisma.selectionHistory.findMany({
      where: { tenantId },
      include: { occurredBy: true },
      orderBy: { occurredAt: "desc" },
      take: 5000,
    }),
    prisma.selectionApproval.findMany({
      where: { tenantId },
      orderBy: { changedAt: "desc" },
    }),
  ]);

  return { jobs, records, history, approvals };
};

export const findJobForSelection = async (tenantId: string, jobId: string) =>
  prisma.job.findFirst({ where: { tenantId, id: jobId } });

export const findSelectionRecord = async (tenantId: string, candidateId: string, jobId: string) =>
  prisma.selectionRecord.findFirst({
    where: { tenantId, candidateId, jobId },
    include: { decidedBy: true },
  });

export const countSelectedForJob = async (tenantId: string, jobId: string) =>
  prisma.selectionRecord.count({
    where: { tenantId, jobId, decision: "SELECTED" },
  });

export const createSelectionRecord = async (tx: DbClient, data: Prisma.SelectionRecordCreateInput) =>
  tx.selectionRecord.create({ data });

export const updateSelectionRecord = async (
  tx: DbClient,
  tenantId: string,
  candidateId: string,
  jobId: string,
  data: Prisma.SelectionRecordUpdateInput,
): Promise<void> => {
  const result = await tx.selectionRecord.updateMany({
    where: { tenantId, candidateId, jobId },
    data,
  });
  if (result.count !== 1) throw new Error("Selection record tenant mismatch.");
};

export const createSelectionHistory = async (tx: DbClient, data: Prisma.SelectionHistoryCreateInput): Promise<void> => {
  await tx.selectionHistory.create({ data });
};

export const upsertSelectionApproval = async (
  tx: DbClient,
  tenantId: string,
  jobId: string,
  data: Prisma.SelectionApprovalCreateInput,
): Promise<void> => {
  const existing = await tx.selectionApproval.findFirst({ where: { tenantId, jobId } });
  if (existing) {
    await tx.selectionApproval.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        note: data.note,
        changedAt: data.changedAt,
        changedBy: data.changedBy,
      },
    });
    return;
  }
  await tx.selectionApproval.create({ data });
};