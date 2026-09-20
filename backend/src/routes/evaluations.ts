import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';
import { notifyAgencyUsers, notifyCandidateAccount } from '../lib/notifications.js';
import { calculateEvaluationTotal, validateEvaluationInput, type EvaluationInput } from '../domain/evaluationValidation.js';

interface InterviewParams { interviewId: string; }

type Assignment = {
  id: string;
  criterionId: string;
  groupId: string | null;
  name: string;
  description: string | null;
  maxPoints: number;
  sortOrder: number;
};

const isPanelInterviewer = (interview: { panel: Array<{ userId: string }> }, userId: string): boolean =>
  interview.panel.some((item) => item.userId === userId);

const assignmentSelect = {
  id: true,
  criterionId: true,
  groupId: true,
  name: true,
  description: true,
  maxPoints: true,
  sortOrder: true,
} as const;

const getAssignments = async (interviewId: string): Promise<Assignment[]> => {
  const existing = await getPrisma().interviewCriterionAssignment.findMany({
    where: { interviewId },
    select: assignmentSelect,
    orderBy: { sortOrder: 'asc' },
  });
  if (existing.length) return existing;

  const criteria = await getPrisma().interviewCriterion.findMany({
    where: { active: true },
    select: { id: true, name: true, description: true, maxPoints: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return criteria.map((criterion, index) => ({
    id: 'legacy-' + criterion.id,
    criterionId: criterion.id,
    groupId: null,
    name: criterion.name,
    description: criterion.description,
    maxPoints: criterion.maxPoints,
    sortOrder: index,
  }));
};

const toSummary = (
  evaluations: Array<{ status: string; scores: Array<{ criterionId: string; points: number }> }>,
  assignments: Assignment[],
  panelSize: number,
) => {
  const submitted = evaluations.filter((evaluation) => evaluation.status === 'SUBMITTED');
  const assignmentByCriterion = new Map(assignments.map((item) => [item.criterionId, item]));
  let totalPoints = 0;
  let maxPoints = 0;

  for (const evaluation of submitted) {
    totalPoints += calculateEvaluationTotal(evaluation.scores);
    maxPoints += evaluation.scores.reduce(
      (total, score) => total + (assignmentByCriterion.get(score.criterionId)?.maxPoints ?? 0),
      0,
    );
  }

  return {
    submitted: submitted.length,
    drafts: evaluations.filter((evaluation) => evaluation.status === 'DRAFT').length,
    required: panelSize,
    totalPoints,
    maxPoints,
    averagePercentage: maxPoints ? Math.round((totalPoints / maxPoints) * 10000) / 100 : null,
    allSubmitted: submitted.length >= panelSize && panelSize > 0,
  };
};

const validateScores = (scores: EvaluationInput['scores'], assignments: Assignment[]): string[] => {
  if (!Array.isArray(scores)) return ['Scores must be an array.'];
  const errors: string[] = [];
  const assignmentById = new Map(assignments.map((item) => [item.criterionId, item]));

  for (const score of scores) {
    const assignment = assignmentById.get(score.criterionId);
    if (!assignment) {
      errors.push('Score references a criterion that is not assigned to this interview.');
      continue;
    }
    if (score.points > assignment.maxPoints) {
      errors.push('Score for "' + assignment.name + '" cannot exceed ' + assignment.maxPoints + ' points.');
    }
  }
  return errors;
};

const ensureInterviewAssignments = async (interviewId: string) => {
  const existing = await getPrisma().interviewCriterionAssignment.count({ where: { interviewId } });
  if (existing > 0) return;

  const criteria = await getPrisma().interviewCriterion.findMany({
    where: { active: true },
    select: { id: true, name: true, description: true, maxPoints: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!criteria.length) return;

  await getPrisma().interviewCriterionAssignment.createMany({
    data: criteria.map((criterion, index) => ({
      interviewId,
      criterionId: criterion.id,
      name: criterion.name,
      description: criterion.description,
      maxPoints: criterion.maxPoints,
      sortOrder: index,
    })),
  });
};

export const evaluationRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: InterviewParams }>(
    '/interviews/:interviewId/start',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.authUser!;
      if (user.role !== 'INTERVIEWER') {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only assigned interviewers can start an interview.' } });
      }

      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          panel: { select: { userId: true } },
          candidate: { select: { id: true, agencyId: true, name: true } },
        },
      });
      if (!interview) return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      if (!isPanelInterviewer(interview, user.id)) {
        return reply.code(403).send({ success: false, error: { code: 'PANEL_ACCESS_DENIED', message: 'You are not assigned to this interview panel.' } });
      }
      if (interview.status !== 'SCHEDULED') {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_NOT_STARTABLE', message: 'Only scheduled interviews can be started.' } });
      }

      const earliestStart = interview.scheduledAt.getTime() - 15 * 60_000;
      const latestStart = interview.scheduledAt.getTime() + interview.durationMins * 60_000;
      if (Date.now() < earliestStart) {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_TOO_EARLY', message: 'This interview can be started 15 minutes before the scheduled time.' } });
      }
      if (Date.now() > latestStart) {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_START_WINDOW_PASSED', message: 'The scheduled start window has passed. Review the interview instead of starting a new session.' } });
      }

      await ensureInterviewAssignments(interview.id);

      const updated = await getPrisma().interview.update({
        where: { id: interview.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
        include: {
          candidate: { select: { id: true, name: true, reference: true, profession: true } },
          criterionGroup: { select: { id: true, name: true, category: true, description: true } },
          criterionAssignments: { select: assignmentSelect, orderBy: { sortOrder: 'asc' } },
        },
      });

      await recordAuditEvent({
        actorId: user.id,
        agencyId: interview.candidate.agencyId,
        action: 'INTERVIEW_STARTED',
        entityType: 'Interview',
        entityId: interview.id,
        summary: 'Started interview for "' + interview.candidate.name + '".',
      });

      return reply.send({ success: true, data: updated });
    },
  );

  app.get<{ Params: InterviewParams }>(
    '/interviews/:interviewId/evaluation',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.authUser!;
      if (user.role !== 'INTERVIEWER') {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only interviewers can access the interview workspace.' } });
      }

      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          panel: { select: { userId: true } },
          candidate: { select: { id: true, agencyId: true, name: true, reference: true, profession: true } },
          criterionGroup: { select: { id: true, name: true, category: true, description: true } },
          evaluations: {
            include: {
              interviewer: { select: { id: true, name: true, email: true } },
              scores: { select: { criterionId: true, points: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (!interview) return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      if (!isPanelInterviewer(interview, user.id)) {
        return reply.code(403).send({ success: false, error: { code: 'PANEL_ACCESS_DENIED', message: 'You are not assigned to this interview panel.' } });
      }

      const assignments = await getAssignments(interview.id);
      const ownEvaluation = interview.evaluations.find((item) => item.interviewerId === user.id) ?? null;
      return reply.send({
        success: true,
        data: {
          interview: {
            id: interview.id,
            candidate: interview.candidate,
            status: interview.status,
            scheduledAt: interview.scheduledAt,
            durationMins: interview.durationMins,
            startedAt: interview.startedAt,
            completedAt: interview.completedAt,
            location: interview.location,
            criterionGroup: interview.criterionGroup,
          },
          assignments,
          evaluation: ownEvaluation,
          summary: toSummary(interview.evaluations, assignments, interview.panel.length),
        },
      });
    },
  );

  app.put<{ Params: InterviewParams; Body: EvaluationInput }>(
    '/interviews/:interviewId/evaluation',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.authUser!;
      if (user.role !== 'INTERVIEWER') {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only interviewers can save interview evaluations.' } });
      }

      const errors = validateEvaluationInput({ ...request.body, scores: request.body.scores ?? [] }, { allowEmptyScores: true });
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_EVALUATION', message: errors.join(' ') } });

      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          panel: { select: { userId: true } },
          candidate: { select: { id: true, agencyId: true, name: true } },
        },
      });
      if (!interview) return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      if (!isPanelInterviewer(interview, user.id)) {
        return reply.code(403).send({ success: false, error: { code: 'PANEL_ACCESS_DENIED', message: 'You are not assigned to this interview panel.' } });
      }
      if (interview.status !== 'IN_PROGRESS') {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_NOT_IN_PROGRESS', message: 'Start the interview before saving the scorecard.' } });
      }

      await ensureInterviewAssignments(interview.id);
      const assignments = await getAssignments(interview.id);
      const scoreErrors = validateScores(request.body.scores, assignments);
      if (scoreErrors.length) return reply.code(400).send({ success: false, error: { code: 'CRITERIA_MISMATCH', message: scoreErrors.join(' ') } });

      const existingEvaluation = await getPrisma().interviewEvaluation.findUnique({
        where: { interviewId_interviewerId: { interviewId: interview.id, interviewerId: user.id } },
        select: { id: true, status: true },
      });
      if (existingEvaluation?.status === 'SUBMITTED') {
        return reply.code(409).send({ success: false, error: { code: 'EVALUATION_LOCKED', message: 'Your submitted interview scorecard is locked and cannot be edited.' } });
      }

      const result = await getPrisma().$transaction(async (tx) => {
        const evaluation = await tx.interviewEvaluation.upsert({
          where: { interviewId_interviewerId: { interviewId: interview.id, interviewerId: user.id } },
          create: {
            interviewId: interview.id,
            interviewerId: user.id,
            status: 'DRAFT',
            comments: request.body.comments?.trim() || null,
            scores: { create: (request.body.scores ?? []).map((score) => ({ criterionId: score.criterionId, points: score.points })) },
          },
          update: {
            comments: request.body.comments?.trim() || null,
            scores: {
              deleteMany: {},
              create: (request.body.scores ?? []).map((score) => ({ criterionId: score.criterionId, points: score.points })),
            },
          },
          include: {
            interviewer: { select: { id: true, name: true, email: true } },
            scores: { select: { criterionId: true, points: true } },
          },
        });

        const allEvaluations = await tx.interviewEvaluation.findMany({
          where: { interviewId: interview.id },
          select: { status: true, scores: { select: { criterionId: true, points: true } } },
        });
        return { evaluation, allEvaluations };
      });

      const summary = toSummary(result.allEvaluations, assignments, interview.panel.length);

      if (!existingEvaluation) {
        await recordAuditEvent({
          actorId: user.id,
          agencyId: interview.candidate.agencyId,
          action: 'EVALUATION_STARTED',
          entityType: 'InterviewEvaluation',
          entityId: result.evaluation.id,
          summary: 'Started interview scorecard for "' + interview.candidate.name + '".',
        });
      }

      return reply.send({ success: true, data: { evaluation: result.evaluation, assignments, summary } });
    },
  );

  app.post<{ Params: InterviewParams }>(
    '/interviews/:interviewId/evaluation/submit',
    { preHandler: requireAuth },
    async (request, reply) => {
      const user = request.authUser!;
      if (user.role !== 'INTERVIEWER') {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only interviewers can submit interview evaluations.' } });
      }

      const interview = await getPrisma().interview.findUnique({
        where: { id: request.params.interviewId },
        include: {
          panel: { select: { userId: true } },
          candidate: { select: { id: true, agencyId: true, name: true, status: true } },
        },
      });
      if (!interview) return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });
      if (!isPanelInterviewer(interview, user.id)) {
        return reply.code(403).send({ success: false, error: { code: 'PANEL_ACCESS_DENIED', message: 'You are not assigned to this interview panel.' } });
      }
      if (interview.status !== 'IN_PROGRESS') {
        return reply.code(409).send({ success: false, error: { code: 'INTERVIEW_NOT_IN_PROGRESS', message: 'The interview is not currently in progress.' } });
      }

      await ensureInterviewAssignments(interview.id);
      const assignments = await getAssignments(interview.id);
      const existingEvaluation = await getPrisma().interviewEvaluation.findUnique({
        where: { interviewId_interviewerId: { interviewId: interview.id, interviewerId: user.id } },
        include: { scores: { select: { criterionId: true, points: true } } },
      });
      if (!existingEvaluation) {
        return reply.code(409).send({ success: false, error: { code: 'EVALUATION_NOT_STARTED', message: 'Save the scorecard before submitting it.' } });
      }
      if (existingEvaluation.status === 'SUBMITTED') {
        return reply.code(409).send({ success: false, error: { code: 'EVALUATION_ALREADY_SUBMITTED', message: 'You have already submitted this interview scorecard.' } });
      }

      const note = existingEvaluation.comments?.trim() ?? '';
      if (!note) {
        return reply.code(400).send({ success: false, error: { code: 'INTERVIEW_NOTE_REQUIRED', message: 'Add interview notes before submitting your scorecard.' } });
      }

      const currentScores = existingEvaluation.scores;
      const submittedScoreErrors = validateScores(currentScores, assignments);
      if (submittedScoreErrors.length || currentScores.length !== assignments.length) {
        return reply.code(400).send({ success: false, error: { code: 'CRITERIA_MISMATCH', message: 'Every assigned interview criterion must be scored before submission.' } });
      }

      const requiredCriterionIds = new Set(assignments.map((item) => item.criterionId));
      if (currentScores.some((score) => !requiredCriterionIds.has(score.criterionId))) {
        return reply.code(400).send({ success: false, error: { code: 'CRITERIA_MISMATCH', message: 'Every submitted score must belong to the interview criteria group.' } });
      }

      const result = await getPrisma().$transaction(async (tx) => {
        const evaluation = await tx.interviewEvaluation.update({
          where: { id: existingEvaluation.id },
          data: { status: 'SUBMITTED', submittedAt: new Date() },
          include: {
            interviewer: { select: { id: true, name: true, email: true } },
            scores: { select: { criterionId: true, points: true } },
          },
        });

        const submissions = await tx.interviewEvaluation.findMany({
          where: { interviewId: interview.id, status: 'SUBMITTED' },
          select: { status: true, scores: { select: { criterionId: true, points: true } } },
        });

        let interviewCompleted = false;
        if (submissions.length === interview.panel.length) {
          interviewCompleted = true;
          await tx.interview.update({
            where: { id: interview.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });

          if (!['PASSED', 'REJECTED', 'HIRED', 'INACTIVE'].includes(interview.candidate.status)) {
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

        return { evaluation, submissions, interviewCompleted };
      });

      const summary = toSummary(result.submissions, assignments, interview.panel.length);

      await recordAuditEvent({
        actorId: user.id,
        agencyId: interview.candidate.agencyId,
        action: 'EVALUATION_SUBMITTED',
        entityType: 'InterviewEvaluation',
        entityId: result.evaluation.id,
        summary: 'Submitted interview scorecard for "' + interview.candidate.name + '".',
      });

      if (result.interviewCompleted) {
        await recordAuditEvent({
          actorId: user.id,
          agencyId: interview.candidate.agencyId,
          action: 'INTERVIEW_COMPLETED',
          entityType: 'Interview',
          entityId: interview.id,
          summary: 'Completed interview for "' + interview.candidate.name + '".',
        });

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

      return reply.code(201).send({ success: true, data: { evaluation: result.evaluation, summary, interviewCompleted: result.interviewCompleted } });
    },
  );

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
        || (user.role === 'INTERVIEWER' && isPanelInterviewer(interview, user.id))
        || (user.role === 'INTERVIEWEE' && user.candidateId === interview.candidateId);

      if (!allowed) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to these evaluations.' } });

      const assignments = await getAssignments(interview.id);
      const evaluations = user.role === 'INTERVIEWER'
        ? interview.evaluations.filter((item) => item.status === 'SUBMITTED' || item.interviewerId === user.id)
        : interview.evaluations.filter((item) => item.status === 'SUBMITTED');

      return reply.send({
        success: true,
        data: {
          evaluations,
          summary: toSummary(evaluations, assignments, interview.panel.length),
        },
      });
    },
  );
};
