import type { FastifyPluginAsync } from 'fastify';
import { denyWhileActing, requireRole, requireTenantAuth } from '../lib/auth.js';
import { inCompany } from '../lib/tenant.js';
import { getPrisma } from '../lib/prisma.js';
import { validateJobInput, type JobInput, type JobPositionInput } from '../domain/jobValidation.js';
import { jobListWhereForUser } from '../domain/jobsAccess.js';
import { recordAuditEvent } from '../lib/audit.js';
import { withCandidateDisplayName } from '../domain/candidateDisplay.js';
import { buildJobComparison } from '../domain/candidateComparison.js';

interface JobParams { id: string; }
interface JobCandidatesBody { candidateIds?: string[]; }

const candidateSelect = {
  id: true,
  agencyId: true,
  reference: true,
  agencyRegisterNo: true,
  firstName: true,
  lastName: true,
  birthdate: true,
  passportNumber: true,
  passportExpiry: true,
  requestedProfession: true,
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
  app.get('/jobs', { preHandler: requireTenantAuth }, async (request, reply) => {
    const user = request.authUser!;
    if (!['ADMIN', 'COMPANY_ADMIN', 'AGENCY'].includes(user.role)) {
      return reply.code(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Jobs are available only to recruitment managers.' },
      });
    }

    const jobs = await getPrisma().job.findMany({
      where: jobListWhereForUser({
        role: user.role,
        companyId: user.companyId,
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

  app.get<{ Params: JobParams }>('/jobs/:id', { preHandler: requireTenantAuth }, async (request, reply) => {
    const user = request.authUser!;
    if (!['COMPANY_ADMIN', 'AGENCY'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
    }

    const job = await getPrisma().job.findUnique({
      where: { id: request.params.id },
      include: {
        positions: { orderBy: { sortOrder: 'asc' } },
        candidatePool: {
          ...(user.role === 'AGENCY' ? { where: { candidate: { agencyId: user.agencyId ?? '__missing__' } } } : {}),
          orderBy: { createdAt: 'desc' },
          include: { candidate: { select: candidateSelect } },
        },
        interviews: {
          ...(user.role === 'AGENCY' ? { where: { candidate: { agencyId: user.agencyId ?? '__missing__' } } } : {}),
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
    if (!inCompany(user, job.companyId)) {
      return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
    }

    const hiredCount = job.candidatePool.filter((item) => item.status === 'HIRED').length;
    return reply.send({
      success: true,
      data: {
        ...job,
        positions: job.positions,
        openings: totalRequired(job.positions),
        candidatePool: job.candidatePool.map((item) => ({ ...item, candidate: withCandidateDisplayName(item.candidate) })),
        interviews: job.interviews.map((item) => ({ ...item, candidate: withCandidateDisplayName(item.candidate) })),
        candidateCount: job.candidatePool.length,
        interviewCount: job.interviews.length,
        filledCount: hiredCount,
      },
    });
  });

  app.get<{ Params: JobParams }>('/jobs/:id/comparison', { preHandler: requireTenantAuth }, async (request, reply) => {
    const user = request.authUser!;
    if (!['COMPANY_ADMIN', 'AGENCY'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
    }

    // Agencies only ever see their own candidates, exactly like GET /jobs/:id.
    const candidateScope = user.role === 'AGENCY' ? { candidate: { agencyId: user.agencyId ?? '__missing__' } } : {};

    const job = await getPrisma().job.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        title: true,
        companyId: true,
        positions: { orderBy: { sortOrder: 'asc' }, select: { id: true, position: true, requiredCount: true } },
        candidatePool: {
          where: candidateScope,
          select: { status: true, candidate: { select: candidateSelect } },
        },
        interviews: {
          where: candidateScope,
          select: {
            id: true,
            candidateId: true,
            type: true,
            status: true,
            scheduledAt: true,
            _count: { select: { panel: true } },
            criterionAssignments: {
              select: {
                criterionId: true,
                maxPoints: true,
                responseType: true,
                groupId: true,
                group: { select: { id: true, name: true } },
              },
            },
            evaluations: {
              where: { status: 'SUBMITTED' },
              select: {
                interviewerId: true,
                status: true,
                interviewer: { select: { id: true, name: true } },
                scores: { select: { criterionId: true, points: true } },
              },
            },
          },
        },
      },
    });

    if (!job || !inCompany(user, job.companyId)) {
      return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
    }

    const comparison = buildJobComparison(
      job.title,
      job.positions,
      job.candidatePool.map((item) => {
        const candidate = withCandidateDisplayName(item.candidate);
        return {
          id: candidate.id,
          name: candidate.name,
          reference: candidate.reference,
          requestedProfession: candidate.requestedProfession,
          agencyId: candidate.agencyId,
          poolStatus: item.status,
        };
      }),
      job.interviews.map(({ _count, ...interview }) => ({ ...interview, panelSize: _count.panel })),
    );

    return reply.send({ success: true, data: comparison });
  });

  app.post<{ Body: JobInput }>(
    '/jobs',
    { preHandler: [requireTenantAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] },
    async (request, reply) => {
      const errors = validateJobInput(request.body, 'create');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_JOB', message: errors.join(' ') } });
      }

      const positions = normalizePositions(request.body.positions!);
      const openings = totalRequired(positions);
      const requestedStatus = 'PUBLISHED';

      const job = await getPrisma().job.create({
        data: {
          companyId: request.authUser!.companyId!,
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
    { preHandler: [requireTenantAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] },
    async (request, reply) => {
      const existing = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        include: { positions: { orderBy: { sortOrder: 'asc' } } },
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }
      if (!inCompany(request.authUser!, existing.companyId)) {
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
    { preHandler: [requireTenantAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] },
    async (request, reply) => {
      const job = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        select: { id: true, companyId: true, title: true, status: true },
      });
      if (!job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      if (!inCompany(request.authUser!, job.companyId)) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }
      if (job.status === 'CLOSED') {
        return reply.code(409).send({ success: false, error: { code: 'JOB_CLOSED', message: 'Candidates cannot be added to a closed job.' } });
      }

      const candidateIds = [...new Set(request.body?.candidateIds ?? [])].filter(Boolean);
      if (!candidateIds.length || candidateIds.length > 500) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATES', message: 'Select between 1 and 500 candidates.' } });
      }

      const candidates = await getPrisma().candidate.findMany({
        where: { id: { in: candidateIds }, companyId: job.companyId },
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
    { preHandler: [requireTenantAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] },
    async (request, reply) => {
      const job = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        select: { id: true, companyId: true, title: true },
      });
      if (!job || !inCompany(request.authUser!, job.companyId)) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });

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
    '/jobs/:id/permanent',
    { preHandler: [requireTenantAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] },
    async (request, reply) => {
      const existing = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        select: {
          id: true,
          companyId: true,
          title: true,
          candidatePool: { select: { status: true } },
          interviews: { select: { id: true } },
        },
      });
      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }
      if (!inCompany(request.authUser!, existing.companyId)) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }

      // Irreversible: platform support may not permanently delete a customer's data.
      const blocked = denyWhileActing(request, reply, 'Platform support cannot permanently delete jobs. Ask the company administrator to do it.');
      if (blocked) return blocked;

      if (existing.interviews.length) {
        return reply.code(409).send({
          success: false,
          error: { code: 'JOB_HAS_INTERVIEWS', message: 'This job cannot be deleted because it has interview records. Close the job instead.' },
        });
      }

      if (existing.candidatePool.some((item) => item.status === 'HIRED')) {
        return reply.code(409).send({
          success: false,
          error: { code: 'JOB_HAS_HIRED_CANDIDATES', message: 'This job cannot be deleted because it has hired candidates.' },
        });
      }

      await getPrisma().job.delete({ where: { id: existing.id } });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: request.authUser!.agencyId,
        action: 'JOB_DELETED',
        entityType: 'Job',
        entityId: existing.id,
        summary: 'Deleted job "' + existing.title + '".',
      });

      return reply.send({ success: true, data: { deleted: true, id: existing.id } });
    },
  );

  app.delete<{ Params: JobParams }>(
    '/jobs/:id',
    { preHandler: [requireTenantAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] },
    async (request, reply) => {
      const existing = await getPrisma().job.findUnique({
        where: { id: request.params.id },
        include: { positions: true },
      });
      if (!existing) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      if (!inCompany(request.authUser!, existing.companyId)) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }

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
