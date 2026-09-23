import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '../generated/prisma/client.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { rangesOverlap, validateInterviewInput, type InterviewInput } from '../domain/interviewValidation.js';
import { recordAuditEvent } from '../lib/audit.js';
import { createNotifications, notifyCandidateAccount } from '../lib/notifications.js';

interface InterviewParams { id: string; }
interface CandidateInterviewParams { candidateId: string; }

const interviewInclude = {
  candidate: {
    select: {
      id: true,
      agencyId: true,
      reference: true,
      name: true,
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
    },
  },
  job: { select: { id: true, agencyId: true, title: true, location: true, status: true } },
  panel: {
    select: {
      userId: true,
      assignedAt: true,
      user: { select: { id: true, agencyId: true, name: true, email: true, role: true, active: true } },
    },
  },
  criterionGroup: {
    select: { id: true, name: true, category: true, description: true, active: true },
  },
  criterionGroups: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      sortOrder: true,
      group: { select: { id: true, name: true, category: true, description: true, active: true } },
    },
  },
  criterionAssignments: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      criterionId: true,
      groupId: true,
      name: true,
      description: true,
      maxPoints: true,
      responseType: true,
      required: true,
      options: true,
      sortOrder: true,
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
      role: 'INTERVIEWER',
      active: true,
      OR: [{ agencyId }, { agencyId: null }],
    },
    select: { id: true },
  });
};

const getCriterionGroups = async (groupIds: string[]) => {
  const groups = await getPrisma().interviewCriterionGroup.findMany({
    where: { id: { in: groupIds }, active: true },
    include: {
      criteria: {
        orderBy: { sortOrder: 'asc' },
        include: {
          criterion: {
            select: {
              id: true,
              name: true,
              description: true,
              maxPoints: true,
              responseType: true,
              required: true,
              options: true,
              active: true,
            },
          },
        },
      },
    },
  });
  const byId = new Map(groups.map((group) => [group.id, group]));
  return groupIds
    .map((id) => byId.get(id))
    .filter((group): group is NonNullable<typeof group> => Boolean(group))
    .map((group) => ({
      group,
      criteria: group.criteria.filter((item) => item.criterion.active),
    }))
    .filter((item) => item.criteria.length > 0);
};

const getCriterionGroupIds = (input: { criterionGroupIds?: string[]; criterionGroupId?: string | null }): string[] => {
  const ids = Array.isArray(input.criterionGroupIds)
    ? input.criterionGroupIds
    : input.criterionGroupId
      ? [input.criterionGroupId]
      : [];
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))];
};

const criterionAssignmentData = (
  setups: Array<{
    group: { id: string };
    criteria: Array<{
      criterionId: string;
      sortOrder: number;
      criterion: {
        id: string;
        name: string;
        description: string | null;
        maxPoints: number;
        responseType: Prisma.InterviewCriterionResponseType;
        required: boolean;
        options: Prisma.JsonValue | null;
      };
    }>;
  }>,
) => {
  const seen = new Set<string>();
  const assignments: Array<{
    criterionId: string;
    groupId: string;
    name: string;
    description: string | null;
    maxPoints: number;
    responseType: Prisma.InterviewCriterionResponseType;
    required: boolean;
    options: Prisma.JsonValue | null;
    sortOrder: number;
  }> = [];
  let sortOrder = 0;
  for (const setup of setups) {
    for (const item of setup.criteria) {
      if (seen.has(item.criterion.id)) continue;
      seen.add(item.criterion.id);
      assignments.push({
        criterionId: item.criterion.id,
        groupId: setup.group.id,
        name: item.criterion.name,
        description: item.criterion.description,
        maxPoints: item.criterion.maxPoints,
        responseType: item.criterion.responseType,
        required: item.criterion.required,
        options: item.criterion.options,
        sortOrder: sortOrder++,
      });
    }
  }
  return assignments;
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
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      id: excludeInterviewId ? { not: excludeInterviewId } : undefined,
      OR: [
        { panel: { some: { userId: { in: interviewerIds } } } },
        { candidateId },
      ],
    },
    select: { id: true, scheduledAt: true, durationMins: true },
  });

  return interviews.some((item) => rangesOverlap(scheduledAt, durationMins, item.scheduledAt, item.durationMins));
};

const isTerminalCandidateStatus = (status: string): boolean =>
  ['PASSED', 'REJECTED', 'HIRED', 'INACTIVE'].includes(status);

const addCandidateStatusHistory = async (
  tx: Prisma.TransactionClient,
  candidateId: string,
  fromStatus: 'POOL' | 'READY_FOR_INTERVIEW' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'PASSED' | 'REJECTED' | 'ON_HOLD' | 'HIRED' | 'INACTIVE',
  toStatus: 'POOL' | 'READY_FOR_INTERVIEW' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'PASSED' | 'REJECTED' | 'ON_HOLD' | 'HIRED' | 'INACTIVE',
  reason: string,
  changedById: string,
): Promise<void> => {
  if (fromStatus === toStatus) return;
  await tx.candidateStatusHistory.create({
    data: { candidateId, fromStatus, toStatus, reason, changedById },
  });
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
            ? { candidateId: user.candidateId ?? '__missing__' }
            : { candidate: { agencyId: user.agencyId ?? '__missing__' } },
      include: {
        ...interviewInclude,
        evaluations: {
          where: { interviewerId: user.id },
          select: { id: true, status: true, submittedAt: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return reply.send({ success: true, data: interviews });
  });

  app.get<{ Params: InterviewParams }>('/interviews/:id', { preHandler: requireAuth }, async (request, reply) => {
    const interview = await getPrisma().interview.findUnique({
      where: { id: request.params.id },
      include: {
        ...interviewInclude,
        evaluations: {
          include: {
            interviewer: { select: { id: true, name: true, email: true } },
            scores: { include: { criterion: { select: { id: true, name: true, maxPoints: true } } } },
            responses: { select: { criterionId: true, textValue: true, selectedOptions: true } },
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
      || (user.role === 'INTERVIEWEE' && user.candidateId === interview.candidate.id);

    if (!allowed) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this interview.' } });

    const visibleEvaluations = user.role === 'INTERVIEWER'
      ? interview.evaluations.filter((evaluation) => evaluation.status === 'SUBMITTED' || evaluation.interviewerId === user.id)
      : interview.evaluations;
    const submittedEvaluations = interview.evaluations.filter((evaluation) => evaluation.status === 'SUBMITTED');
    const maxPoints = interview.criterionAssignments.reduce((sum, assignment) => sum + assignment.maxPoints, 0);
    const interviewerTotals = submittedEvaluations.map((evaluation) => ({
      interviewerId: evaluation.interviewerId,
      interviewer: evaluation.interviewer,
      totalPoints: evaluation.scores.reduce((sum, score) => sum + score.points, 0),
      maxPoints,
      percentage: maxPoints
        ? Math.round((evaluation.scores.reduce((sum, score) => sum + score.points, 0) / maxPoints) * 10000) / 100
        : 0,
    }));
    const averagePercentage = interviewerTotals.length
      ? Math.round((interviewerTotals.reduce((sum, item) => sum + item.percentage, 0) / interviewerTotals.length) * 100) / 100
      : null;
    const safeInterview = {
      ...interview,
      evaluations: visibleEvaluations,
      finalScore: {
        averagePercentage,
        submittedInterviewers: submittedEvaluations.length,
        requiredInterviewers: interview.panel.length,
        complete: interview.status === 'COMPLETED',
        interviewerTotals,
      },
    };

    return reply.send({ success: true, data: safeInterview });
  });

  app.post<{
    Body: InterviewInput & { jobId?: string | null; candidateIds?: string[] }
  }>(
    '/interviews/bulk',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const candidateIds = [...new Set(request.body.candidateIds ?? [])];
      if (!candidateIds.length || candidateIds.length > 100) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATES', message: 'Select between 1 and 100 candidates.' } });
      }

      const errors = validateInterviewInput(request.body, 'create');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW', message: errors.join(' ') } });

      const candidates = await getPrisma().candidate.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true, agencyId: true, name: true, status: true },
      });
      if (candidates.length !== candidateIds.length) {
        return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'One or more selected candidates could not be found.' } });
      }

      const agencyIds = new Set(candidates.map((candidate) => candidate.agencyId));
      if (agencyIds.size !== 1) {
        return reply.code(400).send({ success: false, error: { code: 'AGENCY_MISMATCH', message: 'Bulk interview candidates must belong to the same agency.' } });
      }
      const agencyId = candidates[0]!.agencyId;
      if (!canManage(request.authUser!.role, request.authUser!.agencyId, agencyId)) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to schedule these candidates.' } });
      }

      const unavailable = candidates.filter((candidate) => isTerminalCandidateStatus(candidate.status));
      if (unavailable.length) {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'CANDIDATES_NOT_AVAILABLE',
            message: 'One or more selected candidates have a final or inactive status.',
            candidates: unavailable.map((candidate) => ({ id: candidate.id, name: candidate.name, status: candidate.status })),
          },
        });
      }

      let job: { id: string; agencyId: string; title: string; location: string | null } | null = null;
      if (request.body.jobId) {
        job = await getPrisma().job.findUnique({
          where: { id: request.body.jobId },
          select: { id: true, agencyId: true, title: true, location: true },
        });
        if (!job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
        if (job.agencyId !== agencyId) return reply.code(409).send({ success: false, error: { code: 'AGENCY_MISMATCH', message: 'The selected job does not belong to the candidate agency.' } });
      }

      const interviewerIds = [...new Set(request.body.interviewerIds!)];
      const interviewers = await getInterviewers(interviewerIds, agencyId);
      if (interviewers.length !== interviewerIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_PANEL', message: 'Every panel member must be an active interviewer assigned to the candidate agency or a global interviewer.' } });
      }

      const criterionGroupIds = getCriterionGroupIds(request.body);
      if (!criterionGroupIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'CRITERION_GROUP_REQUIRED', message: 'Select at least one active interview criteria group before scheduling.' } });
      }
      const criterionSetups = await getCriterionGroups(criterionGroupIds);
      if (criterionSetups.length !== criterionGroupIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CRITERION_GROUP', message: 'One or more selected interview criteria groups are missing, inactive, or have no active criteria.' } });
      }

      const scheduledAt = new Date(request.body.scheduledAt!);
      const durationMins = request.body.durationMins ?? 30;
      if (scheduledAt.getTime() <= Date.now()) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_TIME', message: 'Interview date and time must be in the future.' } });
      }

      const schedule = candidateIds.map((candidateId, index) => ({
        candidateId,
        scheduledAt: new Date(scheduledAt.getTime() + index * durationMins * 60_000),
      }));

      for (const slot of schedule) {
        if (await hasScheduleConflict(interviewerIds, slot.candidateId, slot.scheduledAt, durationMins)) {
          const candidate = candidates.find((item) => item.id === slot.candidateId)!;
          return reply.code(409).send({
            success: false,
            error: {
              code: 'SCHEDULE_CONFLICT',
              message: 'Schedule conflict for "' + candidate.name + '" at ' + slot.scheduledAt.toISOString() + '.',
            },
          });
        }
      }

      const prisma = getPrisma();
      const created = await prisma.$transaction(async (tx) => {
        const records = [];
        for (const slot of schedule) {
          const candidate = candidates.find((item) => item.id === slot.candidateId)!;
          const interview = await tx.interview.create({
            data: {
              candidateId: candidate.id,
              jobId: job?.id ?? null,
              type: request.body.type!,
              scheduledAt: slot.scheduledAt,
              durationMins,
              location: request.body.location?.trim() || null,
              notes: request.body.notes?.trim() || null,
              criterionGroupId: criterionSetups[0]!.group.id,
              criterionGroups: { create: criterionSetups.map((setup, index) => ({ groupId: setup.group.id, sortOrder: index })) },
              panel: { create: interviewerIds.map((userId) => ({ userId })) },
              criterionAssignments: {
                create: criterionAssignmentData(criterionSetups),
              },
            },
            include: interviewInclude,
          });
          await tx.candidate.update({
            where: { id: candidate.id },
            data: { status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: new Date() },
          });
          await addCandidateStatusHistory(
            tx,
            candidate.id,
            candidate.status,
            'INTERVIEW_SCHEDULED',
            'Interview ' + interview.id + ' scheduled.',
            request.authUser!.id,
          );
          records.push(interview);
        }
        return records;
      });

      for (const result of created) {
        await recordAuditEvent({
          actorId: request.authUser!.id,
          agencyId,
          action: 'INTERVIEW_SCHEDULED',
          entityType: 'Interview',
          entityId: result.id,
          summary: 'Scheduled ' + result.type + ' interview for "' + result.candidate.name + '".',
        });
        await createNotifications(result.panel.map((participant) => ({
          userId: participant.userId,
          type: 'INTERVIEW_SCHEDULED',
          title: 'Interview scheduled',
          message: 'Your panel interview for "' + result.candidate.name + '" is scheduled for ' + result.scheduledAt.toISOString() + '.',
        })));
        await notifyCandidateAccount(
          result.candidate.id,
          { type: 'INTERVIEW_SCHEDULED', title: 'Interview scheduled', message: 'Your ' + result.type.toLowerCase() + ' interview is scheduled for ' + result.scheduledAt.toISOString() + '.' },
        );
      }

      return reply.code(201).send({
        success: true,
        data: {
          importedCount: created.length,
          candidates: created,
          slotMinutes: durationMins,
        },
      });
    },
  );

  app.post<{ Params: CandidateInterviewParams; Body: InterviewInput & { jobId?: string | null } }>(
    '/candidates/:candidateId/interviews',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const errors = validateInterviewInput(request.body, 'create');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW', message: errors.join(' ') } });

      const candidate = await getPrisma().candidate.findUnique({
        where: { id: request.params.candidateId },
        select: { id: true, agencyId: true, name: true, status: true },
      });
      if (!candidate) return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' } });

      if (!canManage(request.authUser!.role, request.authUser!.agencyId, candidate.agencyId)) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to schedule this candidate.' } });
      }
      if (isTerminalCandidateStatus(candidate.status)) {
        return reply.code(409).send({ success: false, error: { code: 'CANDIDATE_NOT_AVAILABLE', message: 'A candidate with a final or inactive status cannot be scheduled for a new interview.' } });
      }

      let job: { id: string; agencyId: string; title: string; location: string | null } | null = null;
      if (request.body.jobId) {
        job = await getPrisma().job.findUnique({
          where: { id: request.body.jobId },
          select: { id: true, agencyId: true, title: true, location: true },
        });
        if (!job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
        if (job.agencyId !== candidate.agencyId) return reply.code(409).send({ success: false, error: { code: 'AGENCY_MISMATCH', message: 'The selected job does not belong to the candidate agency.' } });
      }

      const interviewerIds = [...new Set(request.body.interviewerIds!)];
      const interviewers = await getInterviewers(interviewerIds, candidate.agencyId);
      if (interviewers.length !== interviewerIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_PANEL', message: 'Every panel member must be an active interviewer assigned to the candidate agency or a global interviewer.' } });
      }

      const criterionGroupIds = getCriterionGroupIds(request.body);
      if (!criterionGroupIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'CRITERION_GROUP_REQUIRED', message: 'Select at least one active interview criteria group before scheduling.' } });
      }
      const criterionSetups = await getCriterionGroups(criterionGroupIds);
      if (criterionSetups.length !== criterionGroupIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CRITERION_GROUP', message: 'One or more selected interview criteria groups are missing, inactive, or have no active criteria.' } });
      }

      const scheduledAt = new Date(request.body.scheduledAt!);
      const durationMins = request.body.durationMins ?? 30;
      if (scheduledAt.getTime() <= Date.now()) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_TIME', message: 'Interview date and time must be in the future.' } });
      }
      if (await hasScheduleConflict(interviewerIds, candidate.id, scheduledAt, durationMins)) {
        return reply.code(409).send({ success: false, error: { code: 'SCHEDULE_CONFLICT', message: 'The selected interviewer or candidate already has an overlapping scheduled interview.' } });
      }

      const result = await getPrisma().$transaction(async (tx) => {
        const interview = await tx.interview.create({
          data: {
            candidateId: candidate.id,
            jobId: job?.id ?? null,
            type: request.body.type!,
            scheduledAt,
            durationMins,
            location: request.body.location?.trim() || null,
            notes: request.body.notes?.trim() || null,
            criterionGroupId: criterionSetups[0]!.group.id,
            criterionGroups: { create: criterionSetups.map((setup, index) => ({ groupId: setup.group.id, sortOrder: index })) },
            panel: { create: interviewerIds.map((userId) => ({ userId })) },
            criterionAssignments: {
              create: criterionAssignmentData(criterionSetups),
            },
          },
          include: interviewInclude,
        });

        const updatedCandidate = await tx.candidate.update({
          where: { id: candidate.id },
          data: { status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: new Date() },
          select: { status: true },
        });
        await addCandidateStatusHistory(
          tx,
          candidate.id,
          candidate.status,
          'INTERVIEW_SCHEDULED',
          'Interview ' + interview.id + ' scheduled.',
          request.authUser!.id,
        );

        return {
          ...interview,
          candidate: {
            ...interview.candidate,
            status: updatedCandidate.status,
          },
        };
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: candidate.agencyId,
        action: 'INTERVIEW_SCHEDULED',
        entityType: 'Interview',
        entityId: result.id,
        summary: 'Scheduled ' + result.type + ' interview for "' + result.candidate.name + '".',
      });
      await createNotifications(result.panel.map((participant) => ({
        userId: participant.userId,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview scheduled',
        message: 'Your panel interview for "' + result.candidate.name + '" is scheduled for ' + result.scheduledAt.toISOString() + '.',
      })));
      await notifyCandidateAccount(
        result.candidate.id,
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
          candidate: { select: { id: true, agencyId: true, name: true, status: true } },
          panel: { select: { userId: true } },
        },
      });
      if (!existing) return reply.code(404).send({ success: false, error: { code: 'INTERVIEW_NOT_FOUND', message: 'Interview not found.' } });

      const agencyId = existing.candidate.agencyId;
      if (!canManage(request.authUser!.role, request.authUser!.agencyId, agencyId)) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this interview.' } });
      }

      const errors = validateInterviewInput(request.body, 'update');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW', message: errors.join(' ') } });
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
      if ((request.body.criterionGroupIds !== undefined || request.body.criterionGroupId !== undefined) && existing.status !== 'SCHEDULED') {
        return reply.code(409).send({ success: false, error: { code: 'CRITERION_GROUP_LOCKED', message: 'The scoring criteria groups cannot be changed after the interview has started or completed.' } });
      }

      const criterionGroupsChanged = request.body.criterionGroupIds !== undefined || request.body.criterionGroupId !== undefined;
      const nextCriterionGroupIds = getCriterionGroupIds(request.body);
      if (criterionGroupsChanged && !nextCriterionGroupIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'CRITERION_GROUP_REQUIRED', message: 'Select at least one active interview criteria group.' } });
      }
      const nextCriterionSetups = criterionGroupsChanged ? await getCriterionGroups(nextCriterionGroupIds) : [];
      if (criterionGroupsChanged && nextCriterionSetups.length !== nextCriterionGroupIds.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CRITERION_GROUP', message: 'One or more selected interview criteria groups are missing, inactive, or have no active criteria.' } });
      }

      if (nextStatus === 'SCHEDULED') {
        if (!nextPanel.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_PANEL', message: 'At least one interviewer is required.' } });
        if (nextScheduledAt.getTime() <= Date.now()) return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEW_TIME', message: 'Interview date and time must be in the future.' } });

        const interviewers = await getInterviewers(nextPanel, agencyId);
        const activeIds = new Set(interviewers.map((item) => item.id));
        const existingPanelIds = new Set(existing.panel.map((item) => item.userId));
        if (nextPanel.some((userId) => !activeIds.has(userId) && !existingPanelIds.has(userId))) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_PANEL', message: 'Every new panel member must be an active interviewer assigned to the candidate agency or a global interviewer.' } });
        }
        if (await hasScheduleConflict(nextPanel, existing.candidateId, nextScheduledAt, nextDuration, existing.id)) {
          return reply.code(409).send({ success: false, error: { code: 'SCHEDULE_CONFLICT', message: 'The selected interviewer or candidate already has an overlapping scheduled interview.' } });
        }
      }

      const result = await getPrisma().$transaction(async (tx) => {
        if (request.body.interviewerIds !== undefined) {
          await tx.interviewParticipant.deleteMany({ where: { interviewId: existing.id } });
        }
        if (criterionGroupsChanged) {
          await tx.interviewCriterionGroupAssignment.deleteMany({ where: { interviewId: existing.id } });
          await tx.interviewCriterionAssignment.deleteMany({ where: { interviewId: existing.id } });
        }

        const updated = await tx.interview.update({
          where: { id: existing.id },
          data: {
            ...(request.body.type !== undefined ? { type: request.body.type } : {}),
            ...(request.body.status !== undefined ? { status: request.body.status } : {}),
            ...(request.body.scheduledAt !== undefined ? { scheduledAt: nextScheduledAt } : {}),
            ...(request.body.durationMins !== undefined ? { durationMins: nextDuration } : {}),
            ...(request.body.location !== undefined ? { location: request.body.location?.trim() || null } : {}),
            ...(request.body.notes !== undefined ? { notes: request.body.notes?.trim() || null } : {}),
            ...(criterionGroupsChanged ? {
              criterionGroupId: nextCriterionSetups[0]!.group.id,
              criterionGroups: { create: nextCriterionSetups.map((setup, index) => ({ groupId: setup.group.id, sortOrder: index })) },
              criterionAssignments: { create: criterionAssignmentData(nextCriterionSetups) },
            } : {}),
            ...(request.body.interviewerIds !== undefined ? { panel: { create: [...new Set(nextPanel)].map((userId) => ({ userId })) } } : {}),
          },
          include: interviewInclude,
        });

        if (request.body.status === 'CANCELLED' && existing.candidate.status === 'INTERVIEW_SCHEDULED') {
          await tx.candidate.update({ where: { id: existing.candidateId }, data: { status: 'READY_FOR_INTERVIEW', statusUpdatedAt: new Date() } });
          await addCandidateStatusHistory(tx, existing.candidateId, existing.candidate.status, 'READY_FOR_INTERVIEW', 'Interview was cancelled.', request.authUser!.id);
        }
        if (request.body.status === 'NO_SHOW' && existing.candidate.status === 'INTERVIEW_SCHEDULED') {
          await tx.candidate.update({ where: { id: existing.candidateId }, data: { status: 'ON_HOLD', statusUpdatedAt: new Date() } });
          await addCandidateStatusHistory(tx, existing.candidateId, existing.candidate.status, 'ON_HOLD', 'Candidate was marked as a no-show for the interview.', request.authUser!.id);
        }
        if (request.body.status === 'SCHEDULED' && existing.candidate.status !== 'INTERVIEW_SCHEDULED') {
          await tx.candidate.update({ where: { id: existing.candidateId }, data: { status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: new Date() } });
          await addCandidateStatusHistory(tx, existing.candidateId, existing.candidate.status, 'INTERVIEW_SCHEDULED', 'Interview was rescheduled.', request.authUser!.id);
        }

        return updated;
      });

      const auditAction =
        request.body.status === 'CANCELLED'
          ? 'INTERVIEW_CANCELLED'
          : request.body.status === 'NO_SHOW'
            ? 'INTERVIEW_NO_SHOW'
            : request.body.status === 'SCHEDULED' || request.body.scheduledAt !== undefined
              ? 'INTERVIEW_RESCHEDULED'
              : request.body.interviewerIds !== undefined
                ? 'INTERVIEW_PANEL_UPDATED'
                : 'INTERVIEW_UPDATED';
      const auditSummary =
        auditAction === 'INTERVIEW_CANCELLED'
          ? 'Cancelled interview for "' + result.candidate.name + '".'
          : auditAction === 'INTERVIEW_NO_SHOW'
            ? 'Recorded no-show for interview with "' + result.candidate.name + '".'
            : auditAction === 'INTERVIEW_RESCHEDULED'
              ? 'Rescheduled interview for "' + result.candidate.name + '".'
              : auditAction === 'INTERVIEW_PANEL_UPDATED'
                ? 'Updated interview panel for "' + result.candidate.name + '".'
                : 'Updated interview for "' + result.candidate.name + '".';

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId,
        action: auditAction,
        entityType: 'Interview',
        entityId: result.id,
        summary: auditSummary,
      });
      await createNotifications(result.panel.map((participant) => ({
        userId: participant.userId,
        type: 'INTERVIEW_UPDATED',
        title: 'Interview updated',
        message: 'Your interview for "' + result.candidate.name + '" has been updated.',
      })));
      await notifyCandidateAccount(
        result.candidate.id,
        { type: 'INTERVIEW_UPDATED', title: 'Interview updated', message: 'Your interview schedule has been updated.' },
      );

      return reply.send({ success: true, data: result });
    },
  );
};
