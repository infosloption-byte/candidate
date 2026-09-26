import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { requireAgencyAccess, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { validateCandidateInput, type CandidateInput } from '../domain/candidateValidation.js';
import { csvRowsToObjects } from '../domain/csv.js';
import { recordAuditEvent } from '../lib/audit.js';
import { notifyAgencyUsers } from '../lib/notifications.js';

interface CandidateParams { id: string; }
interface AgencyCandidateParams { agencyId: string; }
interface CandidateListQuery { jobId?: string; }
interface CandidateWorkflowBody { jobId?: string | null; }

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

const getReference = (): string => 'CA-' + randomBytes(5).toString('hex').toUpperCase();

const canManageCandidate = (role: string, agencyId: string | null, candidateAgencyId: string): boolean =>
  role === 'ADMIN' || (role === 'AGENCY' && agencyId === candidateAgencyId);

const canSetFinalCandidateStatus = (role: string, agencyId: string | null, candidateAgencyId: string): boolean =>
  role === 'ADMIN' || (role === 'AGENCY' && agencyId === candidateAgencyId) || role === 'INTERVIEWER';

const canManageJobPlaceholder = (role: string, agencyId: string | null, jobAgencyId: string): boolean =>
  role === 'ADMIN' || (role === 'AGENCY' && agencyId === jobAgencyId);

export const candidateRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser('text/csv', { parseAs: 'string' }, (_request, body, done) => done(null, body));

  app.get<{ Querystring: CandidateListQuery }>('/candidates', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.authUser!;
    if (!['ADMIN', 'AGENCY', 'INTERVIEWEE'].includes(user.role)) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Interviewers can only access candidate details through assigned interviews.' } });
    }

    if (request.query.jobId) {
      const job = await getPrisma().job.findUnique({
        where: { id: request.query.jobId },
        select: { id: true, agencyId: true, status: true },
      });
      if (!job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      const canReadJob =
        user.role === 'ADMIN'
        || (user.role === 'AGENCY' && user.agencyId === job.agencyId)
        || (user.role === 'INTERVIEWEE' && user.candidateId
          ? job.status === 'PUBLISHED' && (await getPrisma().jobCandidate.count({ where: { jobId: job.id, candidateId: user.candidateId } })) > 0
          : false);
      if (!canReadJob) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
    }

    const candidates = await getPrisma().candidate.findMany({
      where: request.query.jobId
        ? { jobMemberships: { some: { jobId: request.query.jobId } } }
        : user.role === 'ADMIN'
          ? undefined
          : user.role === 'INTERVIEWEE'
            ? user.candidateId ? { id: user.candidateId } : { id: '__not_found__' }
            : { agencyId: user.agencyId ?? '__missing__' },
      select: candidateSelect,
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: candidates });
  });

  app.get<{ Params: CandidateParams }>('/candidates/:id', { preHandler: requireAuth }, async (request, reply) => {
    const candidate = await getPrisma().candidate.findUnique({ where: { id: request.params.id }, select: candidateSelect });
    if (!candidate) return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' } });

    const user = request.authUser!;
    const allowed = canManageCandidate(user.role, user.agencyId, candidate.agencyId)
      || (user.role === 'INTERVIEWEE' && user.candidateId === candidate.id);
    if (!allowed) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this candidate.' } });

    return reply.send({ success: true, data: candidate });
  });

  app.get<{ Params: CandidateParams }>(
    '/candidates/:id/history',
    { preHandler: requireAuth },
    async (request, reply) => {
      const candidate = await getPrisma().candidate.findUnique({
        where: { id: request.params.id },
        select: {
          ...candidateSelect,
          agency: { select: { id: true, name: true, slug: true, status: true } },
          account: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true } },
        },
      });
      if (!candidate) return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' } });

      const user = request.authUser!;
      const isInterviewerAssigned = user.role === 'INTERVIEWER'
        ? await getPrisma().interviewParticipant.findFirst({
            where: { interview: { candidateId: candidate.id }, userId: user.id },
            select: { interviewId: true },
          })
        : null;
      const allowed = canManageCandidate(user.role, user.agencyId, candidate.agencyId) || Boolean(isInterviewerAssigned);
      if (!allowed) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this candidate history.' } });
      }

      const [statusHistory, interviews, documents] = await Promise.all([
        getPrisma().candidateStatusHistory.findMany({
          where: { candidateId: candidate.id },
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        getPrisma().interview.findMany({
          where: { candidateId: candidate.id },
          include: {
            job: { select: { id: true, title: true, location: true } },
            panel: { select: { userId: true, assignedAt: true, user: { select: { id: true, name: true, email: true, active: true } } } },
            evaluations: {
              where: user.role === 'INTERVIEWER' ? { interviewerId: user.id } : undefined,
              select: {
                id: true,
                interviewerId: true,
                status: true,
                comments: true,
                submittedAt: true,
                createdAt: true,
                updatedAt: true,
                interviewer: { select: { id: true, name: true, email: true } },
                scores: { select: { criterionId: true, points: true, criterion: { select: { id: true, name: true, maxPoints: true } } } },
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
        }),
        getPrisma().candidateDocument.findMany({
          where: { candidateId: candidate.id },
          select: { id: true },
        }),
      ]);

      const relatedAuditFilters = [
        { entityType: 'Candidate', entityId: candidate.id },
        ...interviews.map((item) => ({ entityType: 'Interview', entityId: item.id })),
        ...interviews.flatMap((item) => item.evaluations.map((evaluation) => ({ entityType: 'InterviewEvaluation', entityId: evaluation.id }))),
        ...documents.map((item) => ({ entityType: 'CandidateDocument', entityId: item.id })),
      ];

      const auditEvents = relatedAuditFilters.length
        ? await getPrisma().auditEvent.findMany({
            where: { OR: relatedAuditFilters },
            include: { actor: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
          })
        : [];

      return reply.send({
        success: true,
        data: {
          profile: {
            agency: candidate.agency,
            account: candidate.account,
            createdAt: candidate.createdAt,
            updatedAt: candidate.updatedAt,
          },
          jobMemberships: await getPrisma().jobCandidate.findMany({
            where: { candidateId: candidate.id },
            include: { job: { select: { id: true, title: true, location: true, status: true } } },
            orderBy: { createdAt: 'desc' },
          }),
          statusHistory,
          interviews,
          auditEvents,
        },
      });
    },
  );

  app.post<{ Params: AgencyCandidateParams; Body: CandidateInput & CandidateWorkflowBody }>(
    '/agencies/:agencyId/candidates',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const errors = validateCandidateInput(request.body, 'create');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATE', message: errors.join(' ') } });

      const agency = await getPrisma().agency.findUnique({ where: { id: request.params.agencyId } });
      if (!agency) return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      if (agency.status !== 'ACTIVE') return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Candidates cannot be added to an inactive agency.' } });

      const job = request.body.jobId
        ? await getPrisma().job.findUnique({ where: { id: request.body.jobId }, select: { id: true, agencyId: true, title: true, status: true } })
        : null;
      if (request.body.jobId && !job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      if (job && (job.status === 'CLOSED' || (request.authUser!.role === 'AGENCY' && job.agencyId !== request.authUser!.agencyId))) {
        return reply.code(409).send({ success: false, error: { code: job.status === 'CLOSED' ? 'JOB_CLOSED' : 'FORBIDDEN', message: job.status === 'CLOSED' ? 'Candidates cannot be added to a closed job.' : 'You do not have access to this job.' } });
      }
      if (job && job.agencyId !== agency.id && request.authUser!.role !== 'ADMIN') {
        return reply.code(409).send({ success: false, error: { code: 'AGENCY_MISMATCH', message: 'The selected job does not belong to this agency workspace.' } });
      }

      const prisma = getPrisma();
      const candidate = await prisma.$transaction(async (tx) => {
        const created = await tx.candidate.create({
          data: {
            agencyId: agency.id,
            reference: getReference(),
            name: request.body.name!.trim(),
            birthdate: request.body.birthdate?.trim() ? new Date(request.body.birthdate) : null,
            email: request.body.email?.trim().toLowerCase() || null,
            phone: request.body.phone?.trim() || null,
            alternatePhone: request.body.alternatePhone?.trim() || null,
            country: request.body.country?.trim() || null,
            passportNumber: request.body.passportNumber?.trim() || null,
            passportExpiry: request.body.passportExpiry?.trim() ? new Date(request.body.passportExpiry) : null,
            currentLocation: request.body.currentLocation?.trim() || null,
            availability: request.body.availability?.trim() || null,
            visaStatus: request.body.visaStatus?.trim() || null,
            profession: request.body.profession?.trim() || null,
            experienceYears: request.body.experienceYears ?? null,
            skills: (request.body.skills ?? []).map((skill) => skill.trim()).filter(Boolean),
            onboardingStatus: 'NOT_STARTED',
            source: 'AGENCY_ADDED',
            status: 'POOL',
          },
          select: candidateSelect,
        });

        await tx.candidateStatusHistory.create({
          data: { candidateId: created.id, fromStatus: null, toStatus: 'POOL', reason: job ? 'Candidate added to the candidate pool for "' + job.title + '".' : 'Candidate added to the candidate pool.', changedById: request.authUser!.id },
        });
        if (job) {
          await tx.jobCandidate.create({
            data: { jobId: job.id, candidateId: created.id, status: 'POOL' },
          });
        }
        return created;
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'CANDIDATE_CREATED',
        entityType: 'Candidate',
        entityId: candidate.id,
        summary: job ? 'Added candidate "' + candidate.name + '" to the candidate pool for "' + job.title + '".' : 'Added candidate "' + candidate.name + '" to the candidate pool.',
      });
      return reply.code(201).send({ success: true, data: candidate });
    },
  );

  app.post<{ Params: AgencyCandidateParams; Body: string; Querystring: CandidateWorkflowBody }>(
    '/agencies/:agencyId/candidates/bulk',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const csv = request.body;
      if (typeof csv !== 'string' || !csv.trim()) return reply.code(400).send({ success: false, error: { code: 'INVALID_CSV', message: 'CSV content is required.' } });
      if (csv.length > 2_000_000) return reply.code(413).send({ success: false, error: { code: 'CSV_TOO_LARGE', message: 'CSV must be 2 MB or smaller.' } });

      let rows: Array<Record<string, string>>;
      try { rows = csvRowsToObjects(csv); }
      catch (error) { return reply.code(400).send({ success: false, error: { code: 'INVALID_CSV', message: error instanceof Error ? error.message : 'CSV could not be parsed.' } }); }

      if (!rows.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_CSV', message: 'CSV must contain a header row and at least one candidate row.' } });
      if (rows.length > 500) return reply.code(400).send({ success: false, error: { code: 'CSV_ROW_LIMIT', message: 'A single import can contain at most 500 candidate rows.' } });

      const agency = await getPrisma().agency.findUnique({ where: { id: request.params.agencyId } });
      if (!agency) return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      if (agency.status !== 'ACTIVE') return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Candidates cannot be imported into an inactive agency.' } });

      const job = request.query.jobId
        ? await getPrisma().job.findUnique({ where: { id: request.query.jobId }, select: { id: true, agencyId: true, title: true, status: true } })
        : null;
      if (request.query.jobId && !job) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      if (job && (job.status === 'CLOSED' || (request.authUser!.role === 'AGENCY' && job.agencyId !== request.authUser!.agencyId))) {
        return reply.code(409).send({ success: false, error: { code: job.status === 'CLOSED' ? 'JOB_CLOSED' : 'FORBIDDEN', message: job.status === 'CLOSED' ? 'Candidates cannot be added to a closed job.' : 'You do not have access to this job.' } });
      }
      if (job && job.agencyId !== agency.id && request.authUser!.role !== 'ADMIN') {
        return reply.code(409).send({ success: false, error: { code: 'AGENCY_MISMATCH', message: 'The selected job does not belong to this agency workspace.' } });
      }

      const errors: string[] = [];
      const emails = new Set<string>();
      const candidateInputs: CandidateInput[] = [];

      rows.forEach((row, index) => {
        const email = row.email?.trim().toLowerCase() || null;
        const skills = (row.skills ?? '').split(/[,;|]/).map((skill) => skill.trim()).filter(Boolean);
        const experienceRaw = row.experienceyears?.trim() || row.experience?.trim() || '';
        const experienceYears = experienceRaw ? Number(experienceRaw) : null;
        const passportExpiryRaw = row.passportexpiry?.trim() || row.passport_expiry?.trim() || '';
        const birthdateRaw = row.birthdate?.trim() || row.birth_date?.trim() || row.dateofbirth?.trim() || row.date_of_birth?.trim() || row.dob?.trim() || '';
        const input: CandidateInput = {
          name: row.name,
          birthdate: birthdateRaw || null,
          email,
          phone: row.phone || row.contactnumber || row.contact_number || null,
          alternatePhone: row.alternatephone || row.alternate_phone || null,
          country: row.country || row.nationality || null,
          passportNumber: row.passportnumber || row.passport_number || null,
          passportExpiry: passportExpiryRaw || null,
          currentLocation: row.currentlocation || row.current_location || row.location || null,
          availability: row.availability || null,
          visaStatus: row.visastatus || row.visa_status || null,
          profession: row.profession || null,
          experienceYears,
          skills,
        };
        const rowErrors = validateCandidateInput(input, 'create');
        if (email && emails.has(email)) rowErrors.push('Email is duplicated in this file.');
        if (email) emails.add(email);
        if (rowErrors.length) errors.push('Row ' + (index + 2) + ': ' + rowErrors.join(' '));
        candidateInputs.push(input);
      });

      const existingEmails = emails.size
        ? await getPrisma().candidate.findMany({ where: { agencyId: agency.id, email: { in: [...emails] } }, select: { email: true } })
        : [];
      const existingEmailSet = new Set(existingEmails.map((item) => item.email).filter(Boolean).map((item) => item!.toLowerCase()));
      candidateInputs.forEach((input, index) => {
        if (input.email && existingEmailSet.has(input.email.toLowerCase())) errors.push('Row ' + (index + 2) + ': Email is already registered for this agency.');
      });

      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'CSV_VALIDATION_FAILED', message: 'CSV import was not applied because one or more rows are invalid.', rows: errors } });

      const prisma = getPrisma();
      const imported = await prisma.$transaction(async (tx) => {
        const created = [];
        for (const input of candidateInputs) {
          const candidate = await tx.candidate.create({
            data: {
              agencyId: agency.id,
              reference: getReference(),
              name: input.name!.trim(),
              birthdate: input.birthdate?.trim() ? new Date(input.birthdate) : null,
              email: input.email?.trim().toLowerCase() || null,
              phone: input.phone?.trim() || null,
              alternatePhone: input.alternatePhone?.trim() || null,
              country: input.country?.trim() || null,
              passportNumber: input.passportNumber?.trim() || null,
              passportExpiry: input.passportExpiry?.trim() ? new Date(input.passportExpiry) : null,
              currentLocation: input.currentLocation?.trim() || null,
              availability: input.availability?.trim() || null,
              visaStatus: input.visaStatus?.trim() || null,
              profession: input.profession?.trim() || null,
              experienceYears: input.experienceYears ?? null,
              skills: input.skills ?? [],
              onboardingStatus: 'NOT_STARTED',
              source: 'BULK_IMPORTED',
              status: 'POOL',
            },
            select: candidateSelect,
          });
          await tx.candidateStatusHistory.create({
            data: { candidateId: candidate.id, fromStatus: null, toStatus: 'POOL', reason: job ? 'Candidate imported into the candidate pool for "' + job.title + '".' : 'Candidate imported into the candidate pool.', changedById: request.authUser!.id },
          });
          if (job) {
            await tx.jobCandidate.create({
              data: { jobId: job.id, candidateId: candidate.id, status: 'POOL' },
            });
          }
          created.push(candidate);
        }
        return created;
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'CANDIDATES_IMPORTED',
        entityType: 'CandidateImport',
        entityId: agency.id,
        summary: job ? 'Imported ' + imported.length + ' candidates into the candidate pool for "' + job.title + '".' : 'Imported ' + imported.length + ' candidates into the candidate pool.',
      });
      return reply.code(201).send({ success: true, data: { importedCount: imported.length, candidates: imported } });
    },
  );

  app.post<{ Body: CandidateInput & { agencyId?: string } }>(
    '/me/candidate',
    { preHandler: [requireAuth, requireRole('INTERVIEWEE')] },
    async (request, reply) => {
      const user = request.authUser!;
      if (user.candidateId) return reply.code(409).send({ success: false, error: { code: 'CANDIDATE_ALREADY_LINKED', message: 'This account is already linked to a candidate.' } });

      const errors = validateCandidateInput(request.body, 'self');
      if (!request.body.agencyId) errors.push('Agency is required for self-onboarding.');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATE', message: errors.join(' ') } });

      const agency = await getPrisma().agency.findUnique({ where: { id: request.body.agencyId! } });
      if (!agency) return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      if (agency.status !== 'ACTIVE') return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Self-onboarding is not available for this agency.' } });

      const result = await getPrisma().$transaction(async (tx) => {
        const candidate = await tx.candidate.create({
          data: {
            agencyId: agency.id,
            reference: getReference(),
            name: request.body.name!.trim(),
            birthdate: request.body.birthdate?.trim() ? new Date(request.body.birthdate) : null,
              email: request.body.email?.trim().toLowerCase() || null,
              phone: request.body.phone?.trim() || null,
              alternatePhone: request.body.alternatePhone?.trim() || null,
              country: request.body.country?.trim() || null,
              passportNumber: request.body.passportNumber?.trim() || null,
              passportExpiry: request.body.passportExpiry?.trim() ? new Date(request.body.passportExpiry) : null,
              currentLocation: request.body.currentLocation?.trim() || null,
              availability: request.body.availability?.trim() || null,
              visaStatus: request.body.visaStatus?.trim() || null,
              profession: request.body.profession?.trim() || null,
              experienceYears: request.body.experienceYears ?? null,
            skills: (request.body.skills ?? []).map((skill) => skill.trim()).filter(Boolean),
            onboardingStatus: 'SUBMITTED',
            source: 'SELF_ONBOARDED',
            status: 'POOL',
          },
          select: candidateSelect,
        });

        await tx.candidateStatusHistory.create({
          data: { candidateId: candidate.id, fromStatus: null, toStatus: 'POOL', reason: 'Candidate joined the candidate pool through self-onboarding.', changedById: user.id },
        });

        await tx.user.update({ where: { id: user.id }, data: { candidateId: candidate.id } });
        return candidate;
      });

      await recordAuditEvent({
        actorId: user.id,
        agencyId: agency.id,
        action: 'CANDIDATE_SELF_SUBMITTED',
        entityType: 'Candidate',
        entityId: result.id,
        summary: 'Candidate "' + result.name + '" completed self-onboarding and entered the candidate pool.',
      });
      await notifyAgencyUsers(
        agency.id,
        { type: 'CANDIDATE_SUBMITTED', title: 'Candidate profile submitted', message: '"' + result.name + '" submitted a profile for review.' },
        ['AGENCY'],
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  app.patch<{
    Params: CandidateParams;
    Body: Pick<CandidateInput, 'birthdate'>;
  }>(
    '/candidates/:id/birthdate',
    { preHandler: requireAuth },
    async (request, reply) => {
      const candidate = await getPrisma().candidate.findUnique({ where: { id: request.params.id }, select: candidateSelect });
      if (!candidate) return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' } });

      const user = request.authUser!;
      const canManage = canManageCandidate(user.role, user.agencyId, candidate.agencyId);
      const isAssignedInterviewer = user.role === 'INTERVIEWER'
        ? Boolean(await getPrisma().interviewParticipant.findFirst({
            where: {
              userId: user.id,
              interview: { candidateId: candidate.id, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
            },
            select: { interviewId: true },
          }))
        : false;
      if (!canManage && !isAssignedInterviewer) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only the assigned interview panel or candidate managers can update the birthdate.' } });
      }

      const errors = validateCandidateInput(request.body, 'update');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_BIRTHDATE', message: errors.join(' ') } });

      const updated = await getPrisma().candidate.update({
        where: { id: candidate.id },
        data: { birthdate: request.body.birthdate?.trim() ? new Date(request.body.birthdate) : null },
        select: candidateSelect,
      });

      await recordAuditEvent({
        actorId: user.id,
        agencyId: updated.agencyId,
        action: 'CANDIDATE_BIRTHDATE_UPDATED',
        entityType: 'Candidate',
        entityId: updated.id,
        summary: 'Updated birthdate for candidate "' + updated.name + '".',
      });
      return reply.send({ success: true, data: updated });
    },
  );

  app.patch<{ Params: CandidateParams; Body: CandidateInput & CandidateWorkflowBody }>(
    '/candidates/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const existing = await getPrisma().candidate.findUnique({ where: { id: request.params.id }, select: candidateSelect });
      if (!existing) return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' } });

      const user = request.authUser!;
      const isSelf = user.role === 'INTERVIEWEE' && user.candidateId === existing.id;
      const canManage = canManageCandidate(user.role, user.agencyId, existing.agencyId);
      const canSetFinalStatus = canSetFinalCandidateStatus(user.role, user.agencyId, existing.agencyId);
      const requestedFinalStatus = request.body.status !== undefined && ['PASSED', 'REJECTED', 'HIRED'].includes(request.body.status);
      const requestedJob = request.body.jobId
        ? await getPrisma().job.findUnique({ where: { id: request.body.jobId }, select: { id: true, agencyId: true, title: true, openings: true, status: true } })
        : null;
      if (request.body.jobId && !requestedJob) return reply.code(404).send({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
      if (requestedJob && !canManageJobPlaceholder(user.role, user.agencyId, requestedJob.agencyId)) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this job.' } });
      }
      if (requestedJob && requestedJob.status === 'CLOSED' && request.body.status !== undefined) {
        return reply.code(409).send({ success: false, error: { code: 'JOB_CLOSED', message: 'A closed job cannot have its candidate workflow changed.' } });
      }
      if (!isSelf && !canManage && !(canSetFinalStatus && requestedFinalStatus)) return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to update this candidate.' } });

      const errors = validateCandidateInput(request.body, 'update');
      if (errors.length) return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATE', message: errors.join(' ') } });

      if (isSelf && (request.body.status !== undefined || request.body.statusReason !== undefined)) {
        return reply.code(403).send({ success: false, error: { code: 'INVALID_STATUS_CHANGE', message: 'Interviewees cannot change candidate lifecycle status.' } });
      }
      if (isSelf && request.body.onboardingStatus !== undefined && request.body.onboardingStatus !== 'SUBMITTED') {
        return reply.code(403).send({ success: false, error: { code: 'INVALID_STATUS_CHANGE', message: 'Interviewees may only submit their own profile.' } });
      }

      const linkedAccount = await getPrisma().user.findUnique({
        where: { candidateId: existing.id },
        select: { id: true },
      });
      if (linkedAccount && request.body.email !== undefined && !request.body.email?.trim()) {
        return reply.code(400).send({
          success: false,
          error: { code: 'EMAIL_REQUIRED_FOR_ACCOUNT', message: 'A candidate linked to an Interviewee account must keep an email address.' },
        });
      }

      if (request.body.status !== undefined && (canManage || (canSetFinalStatus && requestedFinalStatus))) {
        const lifecycleManagedByWorkflow = ['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(request.body.status);
        if (lifecycleManagedByWorkflow) {
          return reply.code(409).send({
            success: false,
            error: { code: 'STATUS_WORKFLOW_MANAGED', message: 'Interview-scheduled and interview-completed statuses are managed automatically by the interview workflow.' },
          });
        }

        if (['PASSED', 'REJECTED', 'HIRED'].includes(request.body.status)) {
          if (requestedJob) {
            const membership = await getPrisma().jobCandidate.findUnique({
              where: { jobId_candidateId: { jobId: requestedJob.id, candidateId: existing.id } },
              select: { status: true },
            });
            if (!membership) {
              return reply.code(409).send({ success: false, error: { code: 'CANDIDATE_NOT_IN_JOB_POOL', message: 'The candidate is not part of the selected job pool.' } });
            }
          }
          const [completedInterview, scheduledInterview] = await Promise.all([
            getPrisma().interview.findFirst({
              where: { candidateId: existing.id, status: 'COMPLETED' },
              select: { id: true },
            }),
            getPrisma().interview.findFirst({
              where: { candidateId: existing.id, status: 'SCHEDULED' },
              select: { id: true },
            }),
          ]);
          if (!completedInterview) {
            return reply.code(409).send({
              success: false,
              error: { code: 'INTERVIEW_REQUIRED', message: 'A candidate can only receive a final pass, reject, or hire status after at least one interview is completed.' },
            });
          }
          if (scheduledInterview) {
            return reply.code(409).send({
              success: false,
              error: { code: 'SCHEDULED_INTERVIEW_EXISTS', message: 'A final candidate status cannot be recorded while another interview is still scheduled.' },
            });
          }
        }

        if (request.body.status === 'INACTIVE') {
          const scheduledInterview = await getPrisma().interview.findFirst({
            where: { candidateId: existing.id, status: 'SCHEDULED' },
            select: { id: true },
          });
          if (scheduledInterview) {
            return reply.code(409).send({
              success: false,
              error: { code: 'SCHEDULED_INTERVIEW_EXISTS', message: 'Cancel or complete the scheduled interview before marking the candidate inactive.' },
            });
          }
        }
      }

      const data: Record<string, unknown> = {};
      if (request.body.name !== undefined) data.name = request.body.name.trim();
      if (request.body.birthdate !== undefined) data.birthdate = request.body.birthdate?.trim() ? new Date(request.body.birthdate) : null;
      if (request.body.email !== undefined) data.email = request.body.email?.trim().toLowerCase() || null;
      if (request.body.phone !== undefined) data.phone = request.body.phone?.trim() || null;
      if (request.body.alternatePhone !== undefined) data.alternatePhone = request.body.alternatePhone?.trim() || null;
      if (request.body.country !== undefined) data.country = request.body.country?.trim() || null;
      if (request.body.passportNumber !== undefined) data.passportNumber = request.body.passportNumber?.trim() || null;
      if (request.body.passportExpiry !== undefined) data.passportExpiry = request.body.passportExpiry?.trim() ? new Date(request.body.passportExpiry) : null;
      if (request.body.currentLocation !== undefined) data.currentLocation = request.body.currentLocation?.trim() || null;
      if (request.body.availability !== undefined) data.availability = request.body.availability?.trim() || null;
      if (request.body.visaStatus !== undefined) data.visaStatus = request.body.visaStatus?.trim() || null;
      if (request.body.profession !== undefined) data.profession = request.body.profession?.trim() || null;
      if (request.body.experienceYears !== undefined) data.experienceYears = request.body.experienceYears;
      if (request.body.skills !== undefined) data.skills = request.body.skills.map((skill) => skill.trim()).filter(Boolean);
      if (request.body.onboardingStatus !== undefined && canManage) data.onboardingStatus = request.body.onboardingStatus;
      if (isSelf) data.onboardingStatus = 'SUBMITTED';

      if (request.body.status !== undefined && (canManage || (canSetFinalStatus && requestedFinalStatus)) && request.body.status !== existing.status) {
        data.status = request.body.status;
        data.statusUpdatedAt = new Date();
      }

      const prisma = getPrisma();
      const updateCandidate = () => prisma.$transaction(async (tx) => {
        const updated = await tx.candidate.update({
          where: { id: existing.id },
          data,
          select: candidateSelect,
        });

        if (linkedAccount && (data.name !== undefined || data.email !== undefined)) {
          await tx.user.update({
            where: { id: linkedAccount.id },
            data: {
              ...(data.name !== undefined ? { name: data.name as string } : {}),
              ...(data.email !== undefined ? { email: data.email as string } : {}),
            },
          });
        }

        if (request.body.status !== undefined && (canManage || (canSetFinalStatus && requestedFinalStatus)) && request.body.status !== existing.status) {
          await tx.candidateStatusHistory.create({
            data: {
              candidateId: existing.id,
              fromStatus: existing.status,
              toStatus: request.body.status,
              reason: request.body.statusReason?.trim() || null,
              changedById: user.id,
            },
          });
        }

        if (requestedJob && requestedFinalStatus) {
          await tx.jobCandidate.update({
            where: { jobId_candidateId: { jobId: requestedJob.id, candidateId: existing.id } },
            data: { status: request.body.status!, statusUpdatedAt: new Date() },
          });
          if (request.body.status === 'HIRED') {
            const hiredCount = await tx.jobCandidate.count({ where: { jobId: requestedJob.id, status: 'HIRED' } });
            if (hiredCount >= requestedJob.openings) {
              await tx.job.update({ where: { id: requestedJob.id }, data: { status: 'CLOSED' } });
            }
          }
        }

        return updated;
      });

      let candidate: Awaited<ReturnType<typeof updateCandidate>>;
      try {
        candidate = await updateCandidate();
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return reply.code(409).send({
            success: false,
            error: { code: 'USER_EMAIL_EXISTS', message: 'The candidate email is already used by another account.' },
          });
        }
        throw error;
      }

      await recordAuditEvent({
        actorId: user.id,
        agencyId: candidate.agencyId,
        action: request.body.status !== undefined && request.body.status !== existing.status ? 'CANDIDATE_STATUS_CHANGED' : 'CANDIDATE_UPDATED',
        entityType: 'Candidate',
        entityId: candidate.id,
        summary: request.body.status !== undefined && request.body.status !== existing.status
          ? 'Changed candidate "' + candidate.name + '" status to ' + candidate.status + '.'
          : 'Updated candidate "' + candidate.name + '".',
      });
      return reply.send({ success: true, data: candidate });
    },
  );
};
