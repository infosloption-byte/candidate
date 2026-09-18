import { prisma } from "../lib/prisma.js";

export const findActiveUserWithTenantByEmail = async (email: string) =>
  prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

export const findActiveUserById = async (tenantId: string, userId: string) =>
  prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
      active: true,
      tenant: { active: true },
    },
    include: { tenant: true },
  });
