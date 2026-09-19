import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';
import { notifyAgencyUsers, notifyCandidateAccount } from '../lib/notifications.js';
import { calculateEvaluationTotal, validateEvaluationInput, type EvaluationInput } from '../domain/evaluationValidation.js';

interface InterviewParams { interviewId: string; }

const buildSummary = (
  evaluations: Array<{ scores: Array<{ points: number; criterion: { maxPoints: number } }> }>,
  panelSize: number,
) => {
  let totalPoints = 0;
  let maxPoints = 0;
  for (const evaluation of evaluations) {
    totalPoints += calculateEvaluationTotal(evaluation.scores);
    maxPoints += evaluation.scores.reduce((total, score) => total + score.criterion.maxPoints, 0);
  }
  return {
    completed: evaluations.length,
    required: panelSize,
    totalPoints,
    maxPoints,
    averagePercentage: maxPoints ? Math.round((totalPoints / maxPoints) * 10000) / 100 : null,
  };
};

export const evaluationRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: InterviewParams }>(
    '/interviews/:interviewId/evaluations',
    { preHandler: requireAuth },
    async (request, reply) => {
      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          candidate: { select: { id: true, agencyId: true } },
          panel: { select: { userId: true } },
          evaluations: {
            include: {
              interviewer: { select: { id: true, name: true, email: true } },
              scores: { include: { criterion: { select: { id: true, name: true, maxPoints: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!interview) return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });

      const user = request.authUser!;
      const allowed =
        user.role === 'ADMIN'
        || (user.role === 'AGENCY' && user.agencyId === interview.candidate.agencyId)
        || (user.role === 'INTERVIEWER' && interview.panel.some((item) => item.userId === user.id))
        || (user.role === 'INTERVIEWEE' && user.candidateId === interview.candidateId);

      if (!allowed) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to these evaluations.' } });

      return reply.send({
        success: true,
        data: {
          evaluations: interview.evaluations,
          summary: buildSummary(interview.evaluations, interview.panel.length),
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
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_EVALUATION', message: errors.join(' ') } });

      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          candidate: { select: { id: true, agencyId: true, name: true, status: true } },
          panel: { select: { userId: true } },
        },
      });

      if (!interview) return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      if (!interview.panel.some((item) => item.userId === user.id)) {
        return reply.code(403).send({ success: false, error: { code: 'PANEL_ACCESS_DENIED', message: 'You are not assigned to this interview panel.' } });
      }
      if (interview.status !== 'SCHEDULED') {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_NOT_OPEN', message: 'Evaluations can only be submitted for scheduled interviews.' } });
      }

      const criteria = await getPrisma().interviewCriterion.findMany({
        where: { agencyId: interview.candidate.agencyId, active: true },
        select: { id: true, name: true, maxPoints: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!criteria.length) {
        return reply.code(409).send({ success: false, error: { code: 'NO_ACTIVE_CRITERIA', message: 'No active interview criteria are configured for this agency.' } });
      }

      const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));
      const submittedScores = request.body.scores!;
      if (submittedScores.length !== criteria.length || submittedScores.some((score) => !criteriaById.has(score.criterionId))) {
        return reply.code(400).send({ success: false, error: { code: 'CRITERIA_MISMATCH', message: 'Every active interview criterion must be scored exactly once.' } });
      }
      for (const score of submittedScores) {
        const criterion = criteriaById.get(score.criterionId)!;
        if (score.points > criterion.maxPoints) {
          return reply.code(400).send({ success: false, error: { code: 'SCORE_TOO_HIGH', message: 'Score for "' + criterion.name + '" cannot exceed ' + criterion.maxPoints + ' points.' } });
        }
      }

      try {
        const result = await getPrisma().$transaction(async (tx) => {
          const evaluation = await tx.interviewEvaluation.create({
            data: {
              interviewId: interview.id,
              interviewerId: user.id,
              comments: request.body.comments?.trim() || null,
              scores: {
                create: submittedScores.map((score) => ({ criterionId: score.criterionId, points: score.points })),
              },
            },
            include: {
              interviewer: { select: { id: true, name: true, email: true } },
              scores: { include: { criterion: { select: { id: true, name: true, maxPoints: true } } } },
            },
          });

          const evaluations = await tx.interviewEvaluation.findMany({
            where: { interviewId: interview.id },
            include: { scores: { include: { criterion: { select: { maxPoints: true } } } } },
          });

          let interviewCompleted = false;
          if (evaluations.length === interview.panel.length) {
            interviewCompleted = true;
            await tx.interview.update({ where: { id: interview.id }, data: { status: 'COMPLETED' } });

            if (interview.candidate.status !== 'INTERVIEW_COMPLETED') {
              await tx.candidate.update({
                where: { id: interview.candidateId },
                data: { status: 'INTERVIEW_COMPLETED', statusUpdatedAt: new Date() },
              });
              await tx.candidateStatusHistory.create({
                data: {
                  candidateId: interview.candidateId,
                  fromStatus: interview.candidate.status,
                  toStatus: 'INTERVIEW_COMPLETED',
                  reason: 'All interview panel evaluations were submitted.',
                  changedById: user.id,
                },
              });
            }
          }

          return { evaluation, evaluations, interviewCompleted };
        });

        const summary = buildSummary(result.evaluations, interview.panel.length);

        await recordAuditEvent({
          actorId: user.id,
          agencyId: interview.candidate.agencyId,
          action: 'EVALUATION_SUBMITTED',
          entityType: 'InterviewEvaluation',
          entityId: result.evaluation.id,
          summary: 'Submitted criteria scores for interview ' + interview.id + '.',
        });

        if (result.interviewCompleted) {
          await notifyCandidateAccount(
            interview.candidate.id,
            { type: 'INTERVIEW_COMPLETED', title: 'Interview completed', message: 'Your interview has been completed. The recruitment team will update your candidate status after review.' },
          );
          await notifyAgencyUsers(
            interview.candidate.agencyId,
            { type: 'INTERVIEW_COMPLETED', title: 'Interview completed', message: 'All panel evaluations are complete for ' + interview.candidate.name + '. Please review the score summary and update the candidate status.' },
            ['AGENCY'],
          );
        }

        return reply.code(201).send({
          success: true,
          data: {
            evaluation: result.evaluation,
            summary,
            interviewCompleted: result.interviewCompleted,
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
