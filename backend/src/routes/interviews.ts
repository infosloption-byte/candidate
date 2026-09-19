import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { rangesOverlap, validateInterviewInput, type InterviewInput } from '../domain/interviewValidation.js';
import { recordAuditEvent } from '../lib/audit.js';
import { createNotifications, notifyCandidateAccount } from '../lib/notifications.js';

interface InterviewParams {
  id: string;
}

interface ApplicationParams {
  applicationId: string;
}

const interviewInclude = {
  application: {
    select: {
      id: true,
      status: true,
      job: { select: { id: true, agencyId: true, title: true, location: true } },
      candidate: { select: { id: true, name: true, reference: true, email: true, profession: true } },
    },
  },
  panel: {
    select: {
      userId: true,
      assignedAt: true,
      user: { select: { id: true, name: true, email: true, role: true, active: true } },
    },
  },
} as const;

const canManage = (role: string, agencyId: string | null, interviewAgencyId: string): boolean =>
  role === 'ADMIN' || (role === 'AGENCY' && agencyId === interviewAgencyId);

const getInterviewers = async (ids: string[], agencyId: string) => {
  const uniqueIds = [...new Set(ids)];
  return getPrisma().user.findMany({
    where: {
      id: { in: uniqueIds },
      agencyId,
      role: 'INTERVIEWER',
      active: true,
    },
    select: { id: true },
  });
};

const hasScheduleConflict = async (
  interviewerIds: string[],
  candidateId: string,
  scheduledAt: Date,
  durationMins: number,
  excludeInterviewId?: string,
): Promise<boolean> => {
  const interviews = await getPrisma().interview.findMany({
    where: {
      status: 'SCHEDULED',
      id: excludeInterviewId ? { not: excludeInterviewId } : undefined,
      OR: [
        { panel: { some: { userId: { in: interviewerIds } } } },
        { application: { candidateId } },
      ],
    },
    select: {
      id: true,
      scheduledAt: true,
      durationMins: true,
    },
  });

  return interviews.some((item) =>
    rangesOverlap(scheduledAt, durationMins, item.scheduledAt, item.durationMins),
  );
};

export const interviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/interviews', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.authUser!;

    const interviews = await getPrisma().interview.findMany({
      where: user.role === 'ADMIN'
        ? undefined
        : user.role === 'INTERVIEWER'
          ? { panel: { some: { userId: user.id } } }
          : user.role === 'INTERVIEWEE'
            ? { application: { candidateId: user.candidateId ?? '__missing__' } }
            : { application: { job: { agencyId: user.agencyId ?? '__missing__' } } },
      include: {
        ...interviewInclude,
        evaluations: {
          where: { interviewerId: user.id },
          select: { id: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return reply.send({ success: true, data: interviews });
  });

  app.get<{ Params: InterviewParams }>('/interviews/:id', { preHandler: requireAuth }, async (request, reply) => {
    const interview = await getPrisma().interview.findUnique({
      where: { id: request.params.id },
      include: interviewInclude,
    });

    if (!interview) {
      return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
    }

    const user = request.authUser!;
    const agencyId = interview.application.job.agencyId;
    const allowed =
      user.role === 'ADMIN'
      || (user.role === 'AGENCY' && user.agencyId === agencyId)
      || (user.role === 'INTERVIEWER' && interview.panel.some((item) => item.userId === user.id))
      || (user.role === 'INTERVIEWEE' && user.candidateId === interview.application.candidate.id);

    if (!allowed) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this interview.' } });
    }

    return reply.send({ success: true, data: interview });
  });

  app.post<{ Params: ApplicationParams; Body: InterviewInput }>(
    '/applications/:applicationId/interviews',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const errors = validateInterviewInput(request.body, 'create');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW', message: errors.join(' ') } });
      }

      const application = await getPrisma().jobApplication.findUnique({
        where: { id: request.params.applicationId },
        include: {
          job: { select: { id: true, agencyId: true } },
          candidate: { select: { id: true, agencyId: true } },
        },
      });

      if (!application) {
        return reply.code(404).send({ success: false, error: { code: 'APPLICATION_NOT_FOUND', message: 'Application not found.' } });
      }

      if (!canManage(request.authUser!.role, request.authUser!.agencyId, application.job.agencyId)) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to schedule this interview.' } });
      }

      if (!['SHORTLISTED', 'INTERVIEW'].includes(application.status)) {
        return reply.code(409).send({ success: false, error: { code: 'APPLICATION_NOT_READY', message: 'Only shortlisted or in-interview applications can be scheduled.' } });
      }

      if (application.candidate.agencyId !== application.job.agencyId) {
        return reply.code(409).send({ success: false, error: { code: 'APPLICATION_AGENCY_MISMATCH', message: 'Candidate and job agencies do not match.' } });
      }

      const interviewerIds = [...new Set(request.body.interviewerIds!)];
      const interviewers = await getInterviewers(interviewerIds, application.job.agencyId);
      if (interviewers.length !== interviewerIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_PANEL', message: 'Every panel member must be an active interviewer in the job agency.' } });
      }

      const scheduledAt = new Date(request.body.scheduledAt!);
      const durationMins = request.body.durationMins ?? 30;
      if (scheduledAt.getTime() <= Date.now()) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_TIME', message: 'Interview date and time must be in the future.' } });
      }

      if (await hasScheduleConflict(interviewerIds, application.candidate.id, scheduledAt, durationMins)) {
        return reply.code(409).send({ success: false, error: { code: 'SCHEDULE_CONFLICT', message: 'The selected interviewer or candidate already has an overlapping scheduled interview.' } });
      }

      const result = await getPrisma().$transaction(async (tx) => {
        const interview = await tx.interview.create({
          data: {
            applicationId: application.id,
            type: request.body.type!,
            scheduledAt,
            durationMins,
            location: request.body.location?.trim() || null,
            notes: request.body.notes?.trim() || null,
            panel: {
              create: interviewerIds.map((userId) => ({ userId })),
            },
          },
          include: interviewInclude,
        });

        if (application.status === 'SHORTLISTED') {
          await tx.jobApplication.update({
            where: { id: application.id },
            data: { status: 'INTERVIEW' },
          });
        }

        return interview;
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: application.job.agencyId,
        action: 'INTERVIEW_SCHEDULED',
        entityType: 'Interview',
        entityId: result.id,
        summary: 'Scheduled ' + result.type + ' interview for "' + result.application.candidate.name + '".',
      });
      await createNotifications(
        result.panel.map((participant) => ({
          userId: participant.userId,
          type: 'INTERVIEW_SCHEDULED',
          title: 'Interview scheduled',
          message: 'Your panel interview for "' + result.application.candidate.name + '" is scheduled for ' + result.scheduledAt.toISOString() + '.',
        })),
      );
      await notifyCandidateAccount(
        result.application.candidate.id,
        { type: 'INTERVIEW_SCHEDULED', title: 'Interview scheduled', message: 'Your ' + result.type.toLowerCase() + ' interview is scheduled for ' + result.scheduledAt.toISOString() + '.' },
      );

      return reply.code(201).send({ success: true, data: result });
    },
  );

  app.patch<{ Params: InterviewParams; Body: InterviewInput }>(
    '/interviews/:id',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const existing = await getPrisma().interview.findUnique({
        where: { id: request.params.id },
        include: {
          application: {
            select: {
              candidateId: true,
              job: { select: { agencyId: true } },
            },
          },
          panel: { select: { userId: true } },
        },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      }

      const agencyId = existing.application.job.agencyId;
      if (!canManage(request.authUser!.role, request.authUser!.agencyId, agencyId)) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this interview.' } });
      }

      const errors = validateInterviewInput(request.body, 'update');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW', message: errors.join(' ') } });
      }

      if (existing.status !== 'SCHEDULED') {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_NOT_OPEN', message: 'Only scheduled interviews can be edited or rescheduled.' } });
      }

      const nextScheduledAt = request.body.scheduledAt ? new Date(request.body.scheduledAt) : existing.scheduledAt;
      const nextDuration = request.body.durationMins ?? existing.durationMins;
      const nextPanel = request.body.interviewerIds ?? existing.panel.map((item) => item.userId);
      const nextStatus = request.body.status ?? existing.status;

      if (request.body.status !== undefined && !['SCHEDULED', 'CANCELLED', 'NO_SHOW'].includes(request.body.status)) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_STATUS', message: 'Interview can only be scheduled, cancelled, or marked as a no-show from the scheduler.' } });
      }

      if (nextStatus === 'SCHEDULED' && nextScheduledAt.getTime() <= Date.now()) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_TIME', message: 'Interview date and time must be in the future.' } });
      }

      if (nextStatus === 'SCHEDULED') {
        if (!nextPanel.length) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_PANEL', message: 'At least one interviewer is required.' } });
        }

        const interviewers = await getInterviewers(nextPanel, agencyId);
        if (interviewers.length !== new Set(nextPanel).size) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_PANEL', message: 'Every panel member must be an active interviewer in the job agency.' } });
        }

        if (await hasScheduleConflict(nextPanel, existing.application.candidateId, nextScheduledAt, nextDuration, existing.id)) {
          return reply.code(409).send({ success: false, error: { code: 'SCHEDULE_CONFLICT', message: 'The selected interviewer or candidate already has an overlapping scheduled interview.' } });
        }
      }

      const result = await getPrisma().$transaction(async (tx) => {
        if (request.body.interviewerIds !== undefined) {
          await tx.interviewParticipant.deleteMany({ where: { interviewId: existing.id } });
        }

        return tx.interview.update({
          where: { id: existing.id },
          data: {
            ...(request.body.type !== undefined ? { type: request.body.type } : {}),
            ...(request.body.status !== undefined ? { status: request.body.status } : {}),
            ...(request.body.scheduledAt !== undefined ? { scheduledAt: nextScheduledAt } : {}),
            ...(request.body.durationMins !== undefined ? { durationMins: nextDuration } : {}),
            ...(request.body.location !== undefined ? { location: request.body.location?.trim() || null } : {}),
            ...(request.body.notes !== undefined ? { notes: request.body.notes?.trim() || null } : {}),
            ...(request.body.interviewerIds !== undefined ? {
              panel: { create: [...new Set(nextPanel)].map((userId) => ({ userId })) },
            } : {}),
          },
          include: interviewInclude,
        });
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId,
        action: 'INTERVIEW_UPDATED',
        entityType: 'Interview',
        entityId: result.id,
        summary: 'Updated interview for "' + result.application.candidate.name + '".',
      });
      await createNotifications(
        result.panel.map((participant) => ({
          userId: participant.userId,
          type: 'INTERVIEW_UPDATED',
          title: 'Interview updated',
          message: 'Your panel interview for "' + result.application.candidate.name + '" has been updated.',
        })),
      );
      await notifyCandidateAccount(
        result.application.candidate.id,
        { type: 'INTERVIEW_UPDATED', title: 'Interview updated', message: 'Your interview schedule has been updated.' },
      );

      return reply.send({ success: true, data: result });
    },
  );
};
