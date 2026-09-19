import type { FastifyPluginAsync } from 'fastify';
import { requireAgencyAccess, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { validateJobInput, type JobInput } from '../domain/jobValidation.js';
import { jobListWhereForUser } from '../domain/jobsAccess.js';
import { recordAuditEvent } from '../lib/audit.js';
import { notifyAgencyUsers } from '../lib/notifications.js';

interface JobParams {
  id: string;
}

interface AgencyJobParams {
  agencyId: string;
}

export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.get('/jobs', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.authUser!;
    let candidateAgencyId: string | null = null;

    if (user.role === 'INTERVIEWEE' && user.candidateId) {
      const candidate = await getPrisma().candidate.findUnique({
        where: { id: user.candidateId },
        select: { agencyId: true },
      });
      candidateAgencyId = candidate?.agencyId ?? null;
    }

    const jobs = await getPrisma().job.findMany({
      where: jobListWhereForUser({
        role: user.role,
        agencyId: user.agencyId,
        candidateAgencyId,
      }),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { agency: { select: { id: true, name: true, slug: true } } },
    });

    return reply.send({ success: true, data: jobs });
  });

  app.get<{ Params: JobParams }>('/jobs/:id', { preHandler: requireAuth }, async (request, reply) => {
    const job = await getPrisma().job.findUnique({
      where: { id: request.params.id },
      include: { agency: { select: { id: true, name: true, slug: true } } },
    });

    if (!job) {
      return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
    }

    const user = request.authUser!;
    let candidateAgencyId: string | null = null;

    if (user.role === 'INTERVIEWEE' && user.candidateId) {
      const candidate = await getPrisma().candidate.findUnique({
        where: { id: user.candidateId },
        select: { agencyId: true },
      });
      candidateAgencyId = candidate?.agencyId ?? null;
    }

    const canRead =
      user.role === 'ADMIN'
      || (user.role === 'AGENCY' && user.agencyId === job.agencyId)
      || (user.role === 'INTERVIEWEE' && job.status === 'PUBLISHED' && candidateAgencyId === job.agencyId);

    if (!canRead) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
    }

    return reply.send({ success: true, data: job });
  });

  app.post<{ Params: AgencyJobParams; Body: JobInput }>(
    '/agencies/:agencyId/jobs',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const errors = validateJobInput(request.body, 'create');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_JOB', message: errors.join(' ') } });
      }

      const agency = await getPrisma().agency.findUnique({ where: { id: request.params.agencyId } });
      if (!agency) {
        return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      }
      if (agency.status !== 'ACTIVE') {
        return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Jobs cannot be created for an inactive agency.' } });
      }

      const requestedStatus = request.body.status ?? 'DRAFT';

      const job = await getPrisma().job.create({
        data: {
          agencyId: agency.id,
          title: request.body.title!.trim(),
          description: request.body.description?.trim() || null,
          location: request.body.location?.trim() || null,
          openings: request.body.openings ?? 1,
          status: requestedStatus,
          publishedAt: requestedStatus === 'PUBLISHED' ? new Date() : null,
        },
        include: { agency: { select: { id: true, name: true, slug: true } } },
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Created job "' + job.title + '".',
      });
      if (job.status === 'PUBLISHED') {
        await notifyAgencyUsers(
          agency.id,
          { type: 'JOB_PUBLISHED', title: 'New job published', message: '"' + job.title + '" is now open for applications.' },
          ['AGENCY'],
        );
      }
      return reply.code(201).send({ success: true, data: job });
    },
  );

  app.patch<{ Params: JobParams; Body: JobInput }>(
    '/jobs/:id',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const existing = await getPrisma().job.findUnique({ where: { id: request.params.id } });

      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }

      if (request.authUser!.role === 'AGENCY' && request.authUser!.agencyId !== existing.agencyId) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
      }

      const errors = validateJobInput(request.body, 'update');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_JOB', message: errors.join(' ') } });
      }

      const data: {
        title?: string;
        description?: string | null;
        location?: string | null;
        openings?: number;
        status?: JobInput['status'];
        publishedAt?: Date | null;
      } = {};

      if (request.body.title !== undefined) data.title = request.body.title.trim();
      if (request.body.description !== undefined) data.description = request.body.description?.trim() || null;
      if (request.body.location !== undefined) data.location = request.body.location?.trim() || null;
      if (request.body.openings !== undefined) data.openings = request.body.openings;

      if (request.body.status !== undefined) {
        data.status = request.body.status;
        if (request.body.status === 'PUBLISHED') {
          data.publishedAt = existing.publishedAt ?? new Date();
        } else if (request.body.status === 'DRAFT') {
          data.publishedAt = null;
        }
      }

      const job = await getPrisma().job.update({
        where: { id: existing.id },
        data,
        include: { agency: { select: { id: true, name: true, slug: true } } },
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: existing.agencyId,
        action: 'JOB_UPDATED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Updated job "' + job.title + '".',
      });
      if (request.body.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
        await notifyAgencyUsers(
          existing.agencyId,
          { type: 'JOB_PUBLISHED', title: 'Job published', message: '"' + job.title + '" is now open for applications.' },
          ['AGENCY'],
        );
      }
      return reply.send({ success: true, data: job });
    },
  );

  app.delete<{ Params: JobParams }>(
    '/jobs/:id',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const existing = await getPrisma().job.findUnique({ where: { id: request.params.id } });

      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }

      if (request.authUser!.role === 'AGENCY' && request.authUser!.agencyId !== existing.agencyId) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
      }

      const job = await getPrisma().job.update({
        where: { id: existing.id },
        data: { status: 'CLOSED' },
        include: { agency: { select: { id: true, name: true, slug: true } } },
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: existing.agencyId,
        action: 'JOB_CLOSED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Closed job "' + job.title + '".',
      });
      return reply.send({ success: true, data: job });
    },
  );
};
