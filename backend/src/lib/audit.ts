import { getPrisma } from './prisma.js';

export interface AuditEventInput {
  actorId: string | null;
  agencyId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}

export const recordAuditEvent = async (input: AuditEventInput): Promise<void> => {
  try {
    await getPrisma().auditEvent.create({ data: input });
  } catch {
    // Audit logging must never interrupt the core workflow.
  }
};
