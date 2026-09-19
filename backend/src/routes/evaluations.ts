import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { resolveApplicationStatus, validateEvaluationInput, type EvaluationInput } from '../domain/evaluationValidation.js';

interface InterviewParams {
  interviewId: string;
}

const summary = (evaluations: Array<{ rating: number; recommendation: 'RECOMMENDED' | 'MAYBE' | 'NOT_RECOMMENDED' }>, panelSize: number) => ({
  completed: evaluations.length,
  required: panelSize,
  averageRating: evaluations.length
    ? Math.round((evaluations.reduce((total, item) => total + item.rating, 0) / evaluations.length) * 100) / 100
    : null,
  recommendations: {
    recommended: evaluations.filter((item) => item.recommendation === 'RECOMMENDED').length,
    maybe: evaluations.filter((item) => item.recommendation === 'MAYBE').length,
    notRecommended: evaluations.filter((item) => item.recommendation === 'NOT_RECOMMENDED').length,
  },
});

export const evaluationRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: InterviewParams }>(
    '/interviews/:interviewId/evaluations',
    { preHandler: requireAuth },
    async (request, reply) => {
      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          application: {
            select: {
              candidateId: true,
              job: { select: { agencyId: true } },
            },
          },
          panel: { select: { userId: true } },
          evaluations: {
            include: { interviewer: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!interview) {
        return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      }

      const user = request.authUser!;
      const allowed =
        user.role === 'ADMIN'
        || (user.role === 'AGENCY' && user.agencyId === interview.application.job.agencyId)
        || (user.role === 'INTERVIEWER' && interview.panel.some((item) => item.userId === user.id))
        || (user.role === 'INTERVIEWEE' && user.candidateId === interview.application.candidateId);

      if (!allowed) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to these evaluations.' } });
      }

      return reply.send({
        success: true,
        data: {
          evaluations: interview.evaluations,
          summary: summary(interview.evaluations, interview.panel.length),
        },
      });
    },
  );

  app.post<{ Params: InterviewParams; Body: EvaluationInput }>(
    '/interviews/:interviewId/evaluations',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.authUser!;

      if (user.role !== 'INTERVIEWER') {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only interviewers can submit evaluations.' } });
      }

      const errors = validateEvaluationInput(request.body);
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_EVALUATION', message: errors.join(' ') } });
      }

      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          application: { select: { id: true, candidateId: true, job: { select: { agencyId: true } } } },
          panel: { select: { userId: true } },
        },
      });

      if (!interview) {
        return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      }

      if (!interview.panel.some((item) => item.userId === user.id)) {
        return reply.code(403).send({ success: false, error: { code: 'PANEL_ACCESS_DENIED', message: 'You are not assigned to this interview panel.' } });
      }

      if (interview.status !== 'SCHEDULED') {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_NOT_OPEN', message: 'Evaluations can only be submitted for scheduled interviews.' } });
      }

      try {
        const result = await getPrisma().$transaction(async (tx) => {
          const evaluation = await tx.interviewEvaluation.create({
            data: {
              interviewId: interview.id,
              interviewerId: user.id,
              rating: request.body.rating!,
              recommendation: request.body.recommendation!,
              comments: request.body.comments?.trim() || null,
            },
            include: { interviewer: { select: { id: true, name: true, email: true } } },
          });

          const evaluations = await tx.interviewEvaluation.findMany({
            where: { interviewId: interview.id },
            select: { rating: true, recommendation: true },
          });

          let applicationStatus: 'INTERVIEW' | 'SELECTED' | 'REJECTED' = 'INTERVIEW';

          if (evaluations.length === interview.panel.length) {
            applicationStatus = resolveApplicationStatus(evaluations.map((item) => item.recommendation));
            await tx.interview.update({
              where: { id: interview.id },
              data: { status: 'COMPLETED' },
            });
            await tx.jobApplication.update({
              where: { id: interview.application.id },
              data: { status: applicationStatus },
            });
          }

          return { evaluation, evaluations, applicationStatus };
        });

        return reply.code(201).send({
          success: true,
          data: {
            evaluation: result.evaluation,
            summary: summary(result.evaluations, interview.panel.length),
            interviewCompleted: result.evaluations.length === interview.panel.length,
            applicationStatus: result.applicationStatus,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return reply.code(409).send({ success: false, error: { code: 'EVALUATION_EXISTS', message: 'You have already submitted an evaluation for this interview.' } });
        }
        throw error;
      }
    },
  );
};
