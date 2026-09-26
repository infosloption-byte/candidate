import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { validateJobInput, type JobInput, type JobPositionInput } from '../domain/jobValidation.js';
import { jobListWhereForUser } from '../domain/jobsAccess.js';
import { recordAuditEvent } from '../lib/audit.js';

interface JobParams { id: string; }
interface JobCandidatesBody { candidateIds?: string[]; }

const candidateSelect = {
  id: true,
  agencyId: true,
  reference: true,
  name: true,
  birthdate: true,
  email: true,
  phone: true,
  alternatePhone: true,
  country: true,
  passportNumber: true,
  passportExpiry: true,
  currentLocation: true,
  availability: true,
  visaStatus: true,
  profession: true,
  experienceYears: true,
  skills: true,
  onboardingStatus: true,
  source: true,
  status: true,
  statusUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const normalizePositions = (positions: JobPositionInput[] = []) =>
  positions.map((item, index) => ({
    position: item.position!.trim(),
    requiredCount: item.requiredCount!,
    sortOrder: index,
  }));

const totalRequired = (positions: Array<{ requiredCount: number }>): number =>
  positions.reduce((sum, item) => sum + item.requiredCount, 0);

export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.get('/jobs', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.authUser!;
    if (!['ADMIN', 'AGENCY'].includes(user.role)) {
      return reply.code(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Jobs are available only to recruitment managers.' },
      });
    }

    const jobs = await getPrisma().job.findMany({
      where: jobListWhereForUser({
        role: user.role,
        agencyId: user.agencyId,
        candidateAgencyId: null,
      }),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        positions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { candidatePool: true, interviews: true } },
        candidatePool: {
          where: { status: 'HIRED' },
          select: { id: true },
        },
      },
    });

    return reply.send({
      success: true,
      data: jobs.map(({ candidatePool, _count, positions, ...job }) => ({
        ...job,
        positions,
        openings: totalRequired(positions),
        candidateCount: _count.candidatePool,
        interviewCount: _count.interviews,
        filledCount: candidatePool.length,
      })),
    });
  });

  app.get<{ Params: JobParams }>('/jobs/:id', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.authUser!;
    if (!['ADMIN', 'AGENCY'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
    }

    const job = await getPrisma().job.findUnique({
      where: { id: request.params.id },
      include: {
        positions: { orderBy: { sortOrder: 'asc' } },
        agency: { select: { id: true, name: true, slug: true, status: true } },
        candidatePool: {
          orderBy: { createdAt: 'desc' },
          include: { candidate: { select: candidateSelect } },
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            candidate: { select: candidateSelect },
            panel: {
              select: {
                userId: true,
                assignedAt: true,
                user: { select: { id: true, agencyId: true, name: true, email: true, active: true } },
              },
            },
            evaluations: {
              select: { id: true, interviewerId: true, status: true, submittedAt: true },
            },
          },
        },
      },
    });

    if (!job) {
      return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
    }

    const hiredCount = job.candidatePool.filter((item) => item.status === 'HIRED').length;
    return reply.send({
      success: true,
      data: {
        ...job,
        positions: job.positions,
        openings: totalRequired(job.positions),
        candidatePool: job.candidatePool,
        candidateCount: job.candidatePool.length,
        interviewCount: job.interviews.length,
        filledCount: hiredCount,
      },
    });
  });

  app.post<{ Body: JobInput }>(
    '/jobs',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const errors = validateJobInput(request.body, 'create');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_JOB', message: errors.join(' ') } });
      }

      const positions = normalizePositions(request.body.positions!);
      const openings = totalRequired(positions);
      const requestedStatus = request.body.status ?? 'DRAFT';

      const job = await getPrisma().job.create({
        data: {
          agencyId: null,
          title: request.body.title!.trim(),
          description: request.body.description?.trim() || null,
          location: request.body.location?.trim() || null,
          openings,
          status: requestedStatus,
          publishedAt: requestedStatus === 'PUBLISHED' ? new Date() : null,
          positions: { create: positions },
        },
        include: {
          positions: { orderBy: { sortOrder: 'asc' } },
        },
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: request.authUser!.agencyId,
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Created job "' + job.title + '" with ' + positions.length + ' position type(s).',
      });

      return reply.code(201).send({ success: true, data: job });
    },
  );

  app.patch<{ Params: JobParams; Body: JobInput }>(
    '/jobs/:id',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const existing = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        include: { positions: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }

      const errors = validateJobInput(request.body, 'update');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_JOB', message: errors.join(' ') } });
      }

      const nextPositions = request.body.positions !== undefined
        ? normalizePositions(request.body.positions)
        : existing.positions;
      const nextOpenings = totalRequired(nextPositions);

      if (request.body.status === 'CLOSED' && existing.status !== 'CLOSED') {
        const filledCount = await getPrisma().jobCandidate.count({
          where: { jobId: existing.id, status: 'HIRED' },
        });
        if (filledCount < nextOpenings) {
          return reply.code(409).send({
            success: false,
            error: {
              code: 'JOB_NOT_FILLED',
              message: 'The job cannot be closed until all required workers are filled.',
              filledCount,
              openings: nextOpenings,
            },
          });
        }
      }

      const job = await getPrisma().job.update({
        where: { id: existing.id },
        data: {
          ...(request.body.title !== undefined ? { title: request.body.title.trim() } : {}),
          ...(request.body.description !== undefined ? { description: request.body.description?.trim() || null } : {}),
          ...(request.body.location !== undefined ? { location: request.body.location?.trim() || null } : {}),
          ...(request.body.positions !== undefined ? {
            openings: nextOpenings,
            positions: {
              deleteMany: {},
              create: nextPositions,
            },
          } : {}),
          ...(request.body.status !== undefined ? {
            status: request.body.status,
            publishedAt: request.body.status === 'PUBLISHED'
              ? (existing.publishedAt ?? new Date())
              : request.body.status === 'DRAFT' ? null : existing.publishedAt,
          } : {}),
        },
        include: {
          positions: { orderBy: { sortOrder: 'asc' } },
        },
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: request.authUser!.agencyId,
        action: 'JOB_UPDATED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Updated job "' + job.title + '".',
      });

      return reply.send({ success: true, data: job });
    },
  );

  app.post<{ Params: JobParams; Body: JobCandidatesBody }>(
    '/jobs/:id/candidates',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const job = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        select: { id: true, title: true, status: true },
      });
      if (!job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      if (job.status === 'CLOSED') {
        return reply.code(409).send({ success: false, error: { code: 'JOB_CLOSED', message: 'Candidates cannot be added to a closed job.' } });
      }

      const candidateIds = [...new Set(request.body?.candidateIds ?? [])].filter(Boolean);
      if (!candidateIds.length || candidateIds.length > 500) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATES', message: 'Select between 1 and 500 candidates.' } });
      }

      const candidates = await getPrisma().candidate.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true },
      });
      if (candidates.length !== candidateIds.length) {
        return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'One or more selected candidates could not be found.' } });
      }

      const existing = await getPrisma().jobCandidate.findMany({
        where: { jobId: job.id, candidateId: { in: candidateIds } },
        select: { candidateId: true },
      });
      const existingIds = new Set(existing.map((item) => item.candidateId));
      const toCreate = candidateIds.filter((id) => !existingIds.has(id));

      if (toCreate.length) {
        await getPrisma().jobCandidate.createMany({
          data: toCreate.map((candidateId) => ({ jobId: job.id, candidateId, status: 'POOL' })),
        });
      }

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: request.authUser!.agencyId,
        action: 'JOB_CANDIDATES_ADDED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Added ' + toCreate.length + ' candidate(s) to "' + job.title + '".',
      });

      return reply.code(201).send({
        success: true,
        data: { addedCount: toCreate.length, existingCount: existingIds.size },
      });
    },
  );

  app.delete<{ Params: { id: string; candidateId: string } }>(
    '/jobs/:id/candidates/:candidateId',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const job = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        select: { id: true, title: true },
      });
      if (!job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });

      const membership = await getPrisma().jobCandidate.findUnique({
        where: { jobId_candidateId: { jobId: job.id, candidateId: request.params.candidateId } },
        select: { status: true },
      });
      if (!membership) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_CANDIDATE_NOT_FOUND', message: 'Candidate is not in this job pool.' } });
      }

      const scheduledInterview = await getPrisma().interview.findFirst({
        where: {
          jobId: job.id,
          candidateId: request.params.candidateId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
        select: { id: true },
      });
      if (scheduledInterview) {
        return reply.code(409).send({ success: false, error: { code: 'JOB_CANDIDATE_IN_USE', message: 'A candidate with a scheduled or in-progress interview cannot be removed from the job pool.' } });
      }

      await getPrisma().jobCandidate.delete({
        where: { jobId_candidateId: { jobId: job.id, candidateId: request.params.candidateId } },
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: request.authUser!.agencyId,
        action: 'JOB_CANDIDATE_REMOVED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Removed a candidate from "' + job.title + '".',
      });

      return reply.send({ success: true, data: { removed: true } });
    },
  );

  app.delete<{ Params: JobParams }>(
    '/jobs/:id',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const existing = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        include: { positions: true },
      });
      if (!existing) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });

      const filledCount = await getPrisma().jobCandidate.count({
        where: { jobId: existing.id, status: 'HIRED' },
      });
      const openings = totalRequired(existing.positions);
      if (filledCount < openings) {
        return reply.code(409).send({
          success: false,
          error: { code: 'JOB_NOT_FILLED', message: 'The job cannot be closed until all required workers are filled.', filledCount, openings },
        });
      }

      const job = await getPrisma().job.update({
        where: { id: existing.id },
        data: { status: 'CLOSED' },
        include: { positions: { orderBy: { sortOrder: 'asc' } } },
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: request.authUser!.agencyId,
        action: 'JOB_CLOSED',
        entityType: 'Job',
        entityId: job.id,
        summary: 'Closed job "' + job.title + '".',
      });
      return reply.send({ success: true, data: job });
    },
  );
};
