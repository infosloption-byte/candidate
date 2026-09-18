import type { DbClient } from "../lib/db.js";
import { prisma } from "../lib/prisma.js";

export interface CreateSessionRecord {
  tenantId: string;
  userId: string;
  jti: string;
  csrfHash: string;
  expiresAt: Date;
}

export const createSession = async (data: CreateSessionRecord, tx?: DbClient): Promise<void> => {
  const client = tx ?? prisma;
  await client.session.create({ data });
};

export const findActiveSession = async (tenantId: string, userId: string, jti: string) =>
  prisma.session.findFirst({
    where: {
      tenantId,
      userId,
      jti,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

export const revokeSession = async (tenantId: string, userId: string, jti: string): Promise<void> => {
  await prisma.session.updateMany({
    where: { tenantId, userId, jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};