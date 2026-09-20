import type { FastifyPluginAsync } from 'fastify';
import { requireAgencyAccess, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { validateInterviewCriterionGroupInput, type InterviewCriterionGroupInput } from '../domain/interviewCriterionGroupValidation.js';
import { recordAuditEvent } from '../lib/audit.js';

interface AgencyParams { agencyId: string; }
interface GroupParams { id: string; }

const criterionSelect = {
  id: true,
  name: true,
  description: true,
  maxPoints: true,
  active: true,
} as const;

const groupInclude = {
  criteria: {
    orderBy: { sortOrder: 'asc' as const },
    include: { criterion: { select: criterionSelect } },
  },
} as const;

const buildGroup = (group: Awaited<ReturnType<typeof getPrisma>['interviewCriterionGroup']['findFirst']>) => group;

export const interviewCriterionGroupRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: AgencyParams }>(
    '/agencies/:agencyId/interview-criteria-groups',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const groups = await getPrisma().interviewCriterionGroup.findMany({
        where: { agencyId: request.params.agencyId },
        include: groupInclude,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      });
      return reply.send({ success: true, data: groups });
    },
  );

  app.post<{ Params: AgencyParams; Body: InterviewCriterionGroupInput }>(
    '/agencies/:agencyId/interview-criteria-groups',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const errors = validateInterviewCriterionGroupInput(request.body, 'create');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_CRITERION_GROUP', message: errors.join(' ') } });

      const agency = await getPrisma().agency.findUnique({
        where: { id: request.params.agencyId },
        select: { id: true, status: true },
      });
      if (!agency) return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      if (agency.status !== 'ACTIVE') return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Criteria groups cannot be changed for an inactive agency.' } });

      const criterionIds = [...new Set(request.body.criterionIds ?? [])];
      const criteria = await getPrisma().interviewCriterion.findMany({
        where: { id: { in: criterionIds }, agencyId: agency.id, active: true },
        select: criterionSelect,
      });
      if (criteria.length !== criterionIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CRITERIA', message: 'Every selected criterion must be active and belong to this agency.' } });
      }

      const order = new Map(criterionIds.map((id, index) => [id, index]));
      const group = await getPrisma().interviewCriterionGroup.create({
        data: {
          agencyId: agency.id,
          name: request.body.name!.trim(),
          category: request.body.category?.trim() || null,
          description: request.body.description?.trim() || null,
          active: true,
          criteria: {
            create: criteria.map((criterion) => ({ criterionId: criterion.id, sortOrder: order.get(criterion.id) ?? 0 })),
          },
        },
        include: groupInclude,
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'INTERVIEW_CRITERION_GROUP_CREATED',
        entityType: 'InterviewCriterionGroup',
        entityId: group.id,
        summary: 'Created interview criteria group "' + group.name + '".',
      });

      return reply.code(201).send({ success: true, data: group });
    },
  );

  app.patch<{ Params: GroupParams; Body: InterviewCriterionGroupInput }>(
    '/interview-criteria-groups/:id',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const existing = await getPrisma().interviewCriterionGroup.findUnique({
        where: { id: request.params.id },
        include: { criteria: { select: { criterionId: true, sortOrder: true } } },
      });
      if (!existing) return reply.code(404).send({ success: false, error: { code: 'CRITERIA_GROUP_NOT_FOUND', message: 'Interview criteria group not found.' } });
      if (request.authUser!.role === 'AGENCY' && request.authUser!.agencyId !== existing.agencyId) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this criteria group.' } });
      }

      const errors = validateInterviewCriterionGroupInput(request.body, 'update');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_CRITERION_GROUP', message: errors.join(' ') } });

      const criterionIds = request.body.criterionIds === undefined
        ? existing.criteria.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => item.criterionId)
        : [...new Set(request.body.criterionIds)];
      const criteria = await getPrisma().interviewCriterion.findMany({
        where: { id: { in: criterionIds }, agencyId: existing.agencyId, active: true },
        select: criterionSelect,
      });
      if (criteria.length !== criterionIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CRITERIA', message: 'Every selected criterion must be active and belong to this agency.' } });
      }

      const order = new Map(criterionIds.map((id, index) => [id, index]));
      const updated = await getPrisma().$transaction(async (tx) => {
        if (request.body.criterionIds !== undefined) {
          await tx.interviewCriterionGroupItem.deleteMany({ where: { groupId: existing.id } });
          await tx.interviewCriterionGroupItem.createMany({
            data: criteria.map((criterion) => ({ groupId: existing.id, criterionId: criterion.id, sortOrder: order.get(criterion.id) ?? 0 })),
          });
        }
        return tx.interviewCriterionGroup.update({
          where: { id: existing.id },
          data: {
            ...(request.body.name !== undefined ? { name: request.body.name.trim() } : {}),
            ...(request.body.category !== undefined ? { category: request.body.category?.trim() || null } : {}),
            ...(request.body.description !== undefined ? { description: request.body.description?.trim() || null } : {}),
            ...(request.body.active !== undefined ? { active: request.body.active } : {}),
          },
          include: groupInclude,
        });
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: existing.agencyId,
        action: 'INTERVIEW_CRITERION_GROUP_UPDATED',
        entityType: 'InterviewCriterionGroup',
        entityId: updated.id,
        summary: 'Updated interview criteria group "' + updated.name + '".',
      });

      return reply.send({ success: true, data: updated });
    },
  );
};
