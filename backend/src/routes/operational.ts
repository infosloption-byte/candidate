import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';

const candidateStatuses = [
  'POOL',
  'READY_FOR_INTERVIEW',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'PASSED',
  'REJECTED',
  'ON_HOLD',
  'HIRED',
  'INACTIVE',
] as const;

const interviewStatuses = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;

const interviewTypes = ['SCREENING', 'TECHNICAL', 'PRACTICAL', 'FINAL'] as const;

interface AnalyticsQuery {
  jobId?: string;
}

export const operationalRoutes: FastifyPluginAsync = async (app) => {
  app.get('/notifications', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser!.id;
    const notifications = await getPrisma().notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    const unreadCount = await getPrisma().notification.count({
      where: { userId, readAt: null },
    });
    return reply.send({ success: true, data: { notifications, unreadCount } });
  });

  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = await getPrisma().notification.updateMany({
        where: { id: request.params.id, userId: request.authUser!.id, readAt: null },
        data: { readAt: new Date() },
      });
      if (result.count === 0) {
        const existing = await getPrisma().notification.findFirst({
          where: { id: request.params.id, userId: request.authUser!.id },
          select: { id: true },
        });
        if (!existing) {
          return reply.code(404).send({ success: false, error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' } });
        }
      }
      return reply.send({ success: true, data: { read: true } });
    },
  );

  app.get<{ Querystring: AnalyticsQuery }>(
    '/analytics/summary',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY', 'INTERVIEWER')] },
    async (request, reply) => {
      const prisma = getPrisma();
      const user = request.authUser!;
      const jobId = request.query.jobId?.trim() || undefined;

      const baseCandidateWhere = user.role === 'INTERVIEWER'
        ? { interviews: { some: { panel: { some: { userId: user.id } } } } }
        : { agencyId: user.agencyId ?? undefined };
      const baseJobWhere = user.role === 'INTERVIEWER'
        ? { interviews: { some: { panel: { some: { userId: user.id } } } } }
        : { agencyId: user.role === 'ADMIN' ? undefined : user.agencyId ?? '__missing__' };
      const baseInterviewWhere = user.role === 'INTERVIEWER'
        ? { panel: { some: { userId: user.id } } }
        : { candidate: { agencyId: user.agencyId ?? '__missing__' } };
      const baseEvaluationWhere = user.role === 'INTERVIEWER'
        ? { interviewerId: user.id }
        : { interview: { candidate: { agencyId: user.agencyId ?? '__missing__' } } };

      let selectedJob: { id: string; title: string; location: string | null; status: string } | null = null;
      if (jobId) {
        selectedJob = await prisma.job.findFirst({
          where: { id: jobId, ...baseJobWhere },
          select: { id: true, title: true, location: true, status: true },
        });
        if (!selectedJob) {
          return reply.code(404).send({
            success: false,
            error: { code: 'JOB_NOT_FOUND', message: 'The selected job is not available in your workspace.' },
          });
        }
      }

      const candidateWhere = jobId
        ? { ...baseCandidateWhere, jobMemberships: { some: { jobId } } }
        : baseCandidateWhere;
      const jobWhere = jobId ? { ...baseJobWhere, id: jobId } : baseJobWhere;
      const interviewWhere = jobId ? { ...baseInterviewWhere, jobId } : baseInterviewWhere;
      const evaluationWhere = jobId
        ? { ...baseEvaluationWhere, interview: { ...('interview' in baseEvaluationWhere && typeof baseEvaluationWhere.interview === 'object' ? baseEvaluationWhere.interview : {}), jobId } }
        : baseEvaluationWhere;

      const [
        agencies,
        activeAgencies,
        candidates,
        jobs,
        publishedJobs,
        interviews,
        submittedEvaluations,
        draftEvaluations,
        pendingDecisions,
        candidateStatusRows,
        interviewStatusRows,
        interviewTypeRows,
        scoreRows,
        recentCandidates,
        recentInterviews,
        upcomingInterviews,
      ] = await Promise.all([
        user.role === 'ADMIN' ? prisma.agency.count() : Promise.resolve(0),
        user.role === 'ADMIN' ? prisma.agency.count({ where: { status: 'ACTIVE' } }) : Promise.resolve(0),
        prisma.candidate.count({ where: candidateWhere }),
        prisma.job.count({ where: jobWhere }),
        prisma.job.count({ where: { ...jobWhere, status: 'PUBLISHED' } }),
        prisma.interview.count({ where: interviewWhere }),
        prisma.interviewEvaluation.count({ where: { ...evaluationWhere, status: 'SUBMITTED' } }),
        prisma.interviewEvaluation.count({ where: { ...evaluationWhere, status: 'DRAFT' } }),
        user.role === 'INTERVIEWER'
          ? Promise.resolve(0)
          : prisma.candidate.count({ where: { ...candidateWhere, status: 'INTERVIEW_COMPLETED' } }),
        Promise.all(candidateStatuses.map(async (status) => [status, await prisma.candidate.count({ where: { ...candidateWhere, status } })] as const)),
        Promise.all(interviewStatuses.map(async (status) => [status, await prisma.interview.count({ where: { ...interviewWhere, status } })] as const)),
        Promise.all(interviewTypes.map(async (type) => [type, await prisma.interview.count({ where: { ...interviewWhere, type } })] as const)),
        prisma.interviewEvaluationScore.findMany({
          where: { evaluation: { ...evaluationWhere, status: 'SUBMITTED' } },
          select: { points: true },
        }),
        prisma.candidate.findMany({
          where: candidateWhere,
          orderBy: { statusUpdatedAt: 'desc' },
          take: 8,
          select: {
            id: true,
            name: true,
            reference: true,
            profession: true,
            status: true,
            statusUpdatedAt: true,
          },
        }),
        prisma.interview.findMany({
          where: interviewWhere,
          orderBy: { scheduledAt: 'desc' },
          take: 8,
          select: {
            id: true,
            status: true,
            type: true,
            scheduledAt: true,
            candidate: { select: { name: true, reference: true, passportNumber: true } },
            job: { select: { id: true, title: true, location: true } },
          },
        }),
        prisma.interview.findMany({
          where: {
            ...interviewWhere,
            status: 'SCHEDULED',
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 8,
          select: {
            id: true,
            scheduledAt: true,
            type: true,
            candidate: { select: { name: true, reference: true, passportNumber: true } },
            job: { select: { id: true, title: true, location: true } },
          },
        }),
      ]);

      const averageScorePoints = scoreRows.length
        ? scoreRows.reduce((sum, row) => sum + row.points, 0) / scoreRows.length
        : null;

      return reply.send({
        success: true,
        data: {
          scope: user.role,
          selectedJob,
          counts: {
            agencies,
            activeAgencies,
            candidates,
            jobs,
            publishedJobs,
            interviews,
            submittedEvaluations,
            draftEvaluations,
            pendingDecisions,
          },
          candidateStatuses: Object.fromEntries(candidateStatusRows),
          interviewStatuses: Object.fromEntries(interviewStatusRows),
          interviewTypes: Object.fromEntries(interviewTypeRows),
          averageScorePoints,
          recentCandidates,
          recentInterviews,
          upcomingInterviews,
        },
      });
    },
  );

  app.get(
    '/audit-events',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const user = request.authUser!;
      const events = await getPrisma().auditEvent.findMany({
        where: user.role === 'ADMIN' ? undefined : { agencyId: user.agencyId ?? '__missing__' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      });
      return reply.send({ success: true, data: events });
    },
  );
};
