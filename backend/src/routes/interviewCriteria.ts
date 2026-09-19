import type { FastifyPluginAsync } from 'fastify';
import { requireAgencyAccess, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { validateInterviewCriterionInput, type InterviewCriterionInput } from '../domain/interviewCriterionValidation.js';
import { recordAuditEvent } from '../lib/audit.js';

interface AgencyParams { agencyId: string; }
interface CriterionParams { id: string; }

const select = {
  id: true,
  agencyId: true,
  name: true,
  description: true,
  maxPoints: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const interviewCriterionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: AgencyParams }>(
    '/agencies/:agencyId/interview-criteria',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const criteria = await getPrisma().interviewCriterion.findMany({
        where: { agencyId: request.params.agencyId },
        select,
        orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
      });
      return reply.send({ success: true, data: criteria });
    },
  );

  app.post<{ Params: AgencyParams; Body: InterviewCriterionInput }>(
    '/agencies/:agencyId/interview-criteria',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const errors = validateInterviewCriterionInput(request.body, 'create');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_CRITERION', message: errors.join(' ') } });
      }

      const agency = await getPrisma().agency.findUnique({ where: { id: request.params.agencyId }, select: { id: true, status: true } });
      if (!agency) return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      if (agency.status !== 'ACTIVE') return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Criteria cannot be changed for an inactive agency.' } });

      const criterion = await getPrisma().interviewCriterion.create({
        data: {
          agencyId: agency.id,
          name: request.body.name!.trim(),
          description: request.body.description?.trim() || null,
          maxPoints: request.body.maxPoints ?? 5,
          active: true,
        },
        select,
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'INTERVIEW_CRITERION_CREATED',
        entityType: 'InterviewCriterion',
        entityId: criterion.id,
        summary: 'Created interview criterion "' + criterion.name + '".',
      });

      return reply.code(201).send({ success: true, data: criterion });
    },
  );

  app.patch<{ Params: CriterionParams; Body: InterviewCriterionInput }>(
    '/interview-criteria/:id',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const existing = await getPrisma().interviewCriterion.findUnique({ where: { id: request.params.id }, select });
      if (!existing) return reply.code(404).send({ success: false, error: { code: 'CRITERION_NOT_FOUND', message: 'Interview criterion not found.' } });

      if (request.authUser!.role === 'AGENCY' && request.authUser!.agencyId !== existing.agencyId) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this criterion.' } });
      }

      const errors = validateInterviewCriterionInput(request.body, 'update');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_CRITERION', message: errors.join(' ') } });

      const updated = await getPrisma().interviewCriterion.update({
        where: { id: existing.id },
        data: {
          ...(request.body.name !== undefined ? { name: request.body.name.trim() } : {}),
          ...(request.body.description !== undefined ? { description: request.body.description?.trim() || null } : {}),
          ...(request.body.maxPoints !== undefined ? { maxPoints: request.body.maxPoints } : {}),
          ...(request.body.active !== undefined ? { active: request.body.active } : {}),
        },
        select,
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: existing.agencyId,
        action: 'INTERVIEW_CRITERION_UPDATED',
        entityType: 'InterviewCriterion',
        entityId: updated.id,
        summary: 'Updated interview criterion "' + updated.name + '".',
      });

      return reply.send({ success: true, data: updated });
    },
  );
};
