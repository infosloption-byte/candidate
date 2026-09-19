import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { validateApplicationStatus } from '../domain/applicationValidation.js';
import type { ApplicationStatus } from '../generated/prisma/enums.js';
import { recordAuditEvent } from '../lib/audit.js';
import { notifyAgencyUsers, notifyCandidateAccount } from '../lib/notifications.js';

interface ApplicationParams {
  id: string;
}

interface JobParams {
  jobId: string;
}

interface CreateApplicationBody {
  notes?: string;
}

interface UpdateApplicationBody {
  status?: ApplicationStatus;
  notes?: string | null;
}

const applicationInclude = {
  job: { select: { id: true, agencyId: true, title: true, location: true, openings: true, status: true } },
  candidate: { select: { id: true, agencyId: true, reference: true, name: true, email: true, profession: true } },
} as const;

export const applicationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/applications', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.authUser!;

    const applications = await getPrisma().jobApplication.findMany({
      where: user.role === 'ADMIN'
        ? undefined
        : user.role === 'INTERVIEWEE'
          ? { candidateId: user.candidateId ?? '__missing__' }
          : { job: { agencyId: user.agencyId ?? '__missing__' } },
      include: applicationInclude,
      orderBy: { appliedAt: 'desc' },
    });

    return reply.send({ success: true, data: applications });
  });

  app.get<{ Params: ApplicationParams }>('/applications/:id', { preHandler: requireAuth }, async (request, reply) => {
    const application = await getPrisma().jobApplication.findUnique({
      where: { id: request.params.id },
      include: applicationInclude,
    });

    if (!application) {
      return reply.code(404).send({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' } });
    }

    const user = request.authUser!;
    const allowed =
      user.role === 'ADMIN'
      || (user.role === 'INTERVIEWEE' && user.candidateId === application.candidateId)
      || ((user.role === 'AGENCY' || user.role === 'INTERVIEWER') && user.agencyId === application.job.agencyId);

    if (!allowed) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this application.' } });
    }

    return reply.send({ success: true, data: application });
  });

  app.post<{ Params: JobParams; Body: CreateApplicationBody }>(
    '/jobs/:jobId/applications',
    { preHandler: [requireAuth, requireRole('INTERVIEWEE')] },
    async (request, reply) => {
      const user = request.authUser!;

      if (!user.candidateId) {
        return reply.code(409).send({ success: false, error: { code: 'CANDIDATE_NOT_LINKED', message: 'Your account is not linked to a candidate profile.' } });
      }

      const job = await getPrisma().job.findUnique({
        where: { id: request.params.jobId },
        select: { id: true, agencyId: true, status: true },
      });

      if (!job) {
        return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      }
      if (job.status !== 'PUBLISHED') {
        return reply.code(409).send({ success: false, error: { code: 'JOB_NOT_OPEN', message: 'Applications can only be submitted to published jobs.' } });
      }

      const candidate = await getPrisma().candidate.findUnique({
        where: { id: user.candidateId },
        select: { id: true, agencyId: true },
      });

      if (!candidate || candidate.agencyId !== job.agencyId) {
        return reply.code(403).send({ success: false, error: { code: 'APPLICATION_AGENCY_MISMATCH', message: 'Your candidate profile cannot apply to this agency job.' } });
      }

      try {
        const application = await getPrisma().jobApplication.create({
          data: {
            jobId: job.id,
            candidateId: candidate.id,
            notes: request.body.notes?.trim() || null,
          },
          include: applicationInclude,
        });

        await recordAuditEvent({
          actorId: user.id,
          agencyId: job.agencyId,
          action: 'APPLICATION_CREATED',
          entityType: 'JobApplication',
          entityId: application.id,
          summary: 'New application received for "' + application.job.title + '" from "' + application.candidate.name + '".',
        });
        await notifyAgencyUsers(
          job.agencyId,
          { type: 'APPLICATION_RECEIVED', title: 'New application', message: application.candidate.name + ' applied for "' + application.job.title + '".' },
          ['AGENCY'],
        );
        return reply.code(201).send({ success: true, data: application });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return reply.code(409).send({ success: false, error: { code: 'APPLICATION_EXISTS', message: 'You have already applied to this job.' } });
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: ApplicationParams; Body: UpdateApplicationBody }>(
    '/applications/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const application = await getPrisma().jobApplication.findUnique({
        where: { id: request.params.id },
        include: { job: { select: { agencyId: true } } },
      });

      if (!application) {
        return reply.code(404).send({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' } });
      }

      const user = request.authUser!;
      const isOwnCandidate = user.role === 'INTERVIEWEE' && user.candidateId === application.candidateId;
      const isAgency = user.role === 'AGENCY' && user.agencyId === application.job.agencyId;
      const isAdmin = user.role === 'ADMIN';

      if (!isOwnCandidate && !isAgency && !isAdmin) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to update this application.' } });
      }

      if (request.body.status !== undefined) {
        if (isOwnCandidate && request.body.status !== 'WITHDRAWN') {
          return reply.code(403).send({ success: false, error: { code: 'INVALID_STATUS_CHANGE', message: 'Interviewees may only withdraw their own application.' } });
        }

        const transitionError = validateApplicationStatus(application.status, request.body.status);
        if (transitionError) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_STATUS_CHANGE', message: transitionError } });
        }
      }

      const updated = await getPrisma().jobApplication.update({
        where: { id: application.id },
        data: {
          ...(request.body.status !== undefined ? { status: request.body.status } : {}),
          ...(request.body.notes !== undefined ? { notes: request.body.notes?.trim() || null } : {}),
        },
        include: applicationInclude,
      });

      if (request.body.status !== undefined) {
        await recordAuditEvent({
          actorId: user.id,
          agencyId: application.job.agencyId,
          action: 'APPLICATION_STATUS_CHANGED',
          entityType: 'JobApplication',
          entityId: application.id,
          summary: 'Changed application status to ' + request.body.status + '.',
        });
        await notifyCandidateAccount(
          application.candidateId,
          { type: 'APPLICATION_STATUS_CHANGED', title: 'Application updated', message: 'Your application status is now ' + request.body.status.toLowerCase().replace('_', ' ') + '.' },
        );
      }
      return reply.send({ success: true, data: updated });
    },
  );
};
