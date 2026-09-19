import type { Prisma } from "../generated/prisma/client.js";
import type { DbClient } from "../lib/db.js";
import { prisma } from "../lib/prisma.js";

export interface AuditRecord {
  tenantId: string;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata: Prisma.JsonValue;
}

export const createAuditEvent = async (record: AuditRecord, tx?: DbClient): Promise<void> => {
  const client = tx ?? prisma;
  await client.auditEvent.create({
    data: {
      tenantId: record.tenantId,
      actorUserId: record.actorUserId,
      entityType: record.entityType,
      entityId: record.entityId,
      action: record.action,
      metadata: record.metadata,
    },
  });
};