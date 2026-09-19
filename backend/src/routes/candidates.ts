import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { requireAgencyAccess, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { validateCandidateInput, type CandidateInput } from '../domain/candidateValidation.js';
import { csvRowsToObjects } from '../domain/csv.js';
import { recordAuditEvent } from '../lib/audit.js';
import { notifyAgencyUsers } from '../lib/notifications.js';

interface CandidateParams {
  id: string;
}

interface AgencyCandidateParams {
  agencyId: string;
}

const candidateSelect = {
  id: true,
  agencyId: true,
  reference: true,
  name: true,
  email: true,
  phone: true,
  profession: true,
  experienceYears: true,
  skills: true,
  onboardingStatus: true,
  source: true,
  createdAt: true,
  updatedAt: true,
} as const;

const getReference = (): string => 'CA-' + randomBytes(5).toString('hex').toUpperCase();

export const candidateRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser('text/csv', { parseAs: 'string' }, (_request, body, done) => {
    done(null, body);
  });

  app.get('/candidates', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.authUser!;

    const candidates = await getPrisma().candidate.findMany({
      where: user.role === 'ADMIN'
        ? undefined
        : user.role === 'INTERVIEWEE'
          ? user.candidateId
            ? { id: user.candidateId }
            : { id: '__not_found__' }
          : { agencyId: user.agencyId ?? '__missing__' },
      select: candidateSelect,
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ success: true, data: candidates });
  });

  app.get<{ Params: CandidateParams }>('/candidates/:id', { preHandler: requireAuth }, async (request, reply) => {
    const candidate = await getPrisma().candidate.findUnique({
      where: { id: request.params.id },
      select: candidateSelect,
    });

    if (!candidate) {
      return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' } });
    }

    const user = request.authUser!;
    const allowed =
      user.role === 'ADMIN'
      || (user.role === 'INTERVIEWEE' && user.candidateId === candidate.id)
      || ((user.role === 'AGENCY' || user.role === 'INTERVIEWER') && user.agencyId === candidate.agencyId);

    if (!allowed) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this candidate.' } });
    }

    return reply.send({ success: true, data: candidate });
  });

  app.post<{ Params: AgencyCandidateParams; Body: CandidateInput }>(
    '/agencies/:agencyId/candidates',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const errors = validateCandidateInput(request.body, 'create');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATE', message: errors.join(' ') } });
      }

      const agency = await getPrisma().agency.findUnique({ where: { id: request.params.agencyId } });
      if (!agency) {
        return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      }
      if (agency.status !== 'ACTIVE') {
        return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Candidates cannot be added to an inactive agency.' } });
      }

      const candidate = await getPrisma().candidate.create({
        data: {
          agencyId: agency.id,
          reference: getReference(),
          name: request.body.name!.trim(),
          email: request.body.email?.trim().toLowerCase() || null,
          phone: request.body.phone?.trim() || null,
          profession: request.body.profession?.trim() || null,
          experienceYears: request.body.experienceYears ?? null,
          skills: (request.body.skills ?? []).map((skill) => skill.trim()).filter(Boolean),
          onboardingStatus: 'NOT_STARTED',
          source: 'AGENCY_ADDED',
        },
        select: candidateSelect,
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'CANDIDATE_CREATED',
        entityType: 'Candidate',
        entityId: candidate.id,
        summary: 'Added candidate "' + candidate.name + '".',
      });
      return reply.code(201).send({ success: true, data: candidate });
    },
  );

  app.post<{ Params: AgencyCandidateParams; Body: string }>(
    '/agencies/:agencyId/candidates/bulk',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const csv = request.body;

      if (typeof csv !== 'string' || !csv.trim()) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CSV', message: 'CSV content is required.' } });
      }
      if (csv.length > 2_000_000) {
        return reply.code(413).send({ success: false, error: { code: 'CSV_TOO_LARGE', message: 'CSV must be 2 MB or smaller.' } });
      }

      let rows: Array<Record<string, string>>;
      try {
        rows = csvRowsToObjects(csv);
      } catch (error) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CSV', message: error instanceof Error ? error.message : 'CSV could not be parsed.' } });
      }

      if (!rows.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CSV', message: 'CSV must contain a header row and at least one candidate row.' } });
      }
      if (rows.length > 500) {
        return reply.code(400).send({ success: false, error: { code: 'CSV_ROW_LIMIT', message: 'A single import can contain at most 500 candidate rows.' } });
      }

      const agency = await getPrisma().agency.findUnique({ where: { id: request.params.agencyId } });
      if (!agency) {
        return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      }
      if (agency.status !== 'ACTIVE') {
        return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Candidates cannot be imported into an inactive agency.' } });
      }

      const errors: string[] = [];
      const emails = new Set<string>();
      const candidateInputs: CandidateInput[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const email = row.email?.trim().toLowerCase() || null;
        const skills = (row.skills ?? '')
          .split(/[;|]/)
          .map((skill) => skill.trim())
          .filter(Boolean);
        const experienceYears = row.experienceYears?.trim()
          ? Number(row.experienceYears)
          : null;

        const input: CandidateInput = {
          name: row.name,
          email,
          phone: row.phone || null,
          profession: row.profession || null,
          experienceYears,
          skills,
        };

        const rowErrors = validateCandidateInput(input, 'create');
        if (email && emails.has(email)) {
          rowErrors.push('Email is duplicated in this file.');
        }
        if (email) emails.add(email);

        if (rowErrors.length) {
          errors.push(`Row ${rowNumber}: ${rowErrors.join(' ')}`);
        }

        candidateInputs.push(input);
      });

      const existingEmails = emails.size
        ? await getPrisma().candidate.findMany({
            where: { agencyId: agency.id, email: { in: [...emails] } },
            select: { email: true },
          })
        : [];

      const existingEmailSet = new Set(existingEmails.map((item) => item.email).filter(Boolean).map((item) => item!.toLowerCase()));

      candidateInputs.forEach((input, index) => {
        if (input.email && existingEmailSet.has(input.email.toLowerCase())) {
          errors.push(`Row ${index + 2}: Email is already registered for this agency.`);
        }
      });

      if (errors.length) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'CSV_VALIDATION_FAILED',
            message: 'CSV import was not applied because one or more rows are invalid.',
            rows: errors,
          },
        });
      }

      const prisma = getPrisma();
      const imported = await prisma.$transaction(async (tx) => {
        const created = [];

        for (const input of candidateInputs) {
          created.push(await tx.candidate.create({
            data: {
              agencyId: agency.id,
              reference: getReference(),
              name: input.name!.trim(),
              email: input.email?.trim().toLowerCase() || null,
              phone: input.phone?.trim() || null,
              profession: input.profession?.trim() || null,
              experienceYears: input.experienceYears ?? null,
              skills: input.skills ?? [],
              onboardingStatus: 'NOT_STARTED',
              source: 'BULK_IMPORTED',
            },
            select: candidateSelect,
          }));
        }

        return created;
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'CANDIDATES_IMPORTED',
        entityType: 'CandidateImport',
        entityId: agency.id,
        summary: 'Imported ' + imported.length + ' candidates from CSV.',
      });
      return reply.code(201).send({ success: true, data: { importedCount: imported.length, candidates: imported } });
    },
  );

  app.post<{ Body: CandidateInput & { agencyId?: string } }>(
    '/me/candidate',
    { preHandler: [requireAuth, requireRole('INTERVIEWEE')] },
    async (request, reply) => {
      const user = request.authUser!;
      if (user.candidateId) {
        return reply.code(409).send({ success: false, error: { code: 'CANDIDATE_ALREADY_LINKED', message: 'This account is already linked to a candidate.' } });
      }

      const errors = validateCandidateInput(request.body, 'self');
      if (!request.body.agencyId) errors.push('Agency is required for self-onboarding.');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATE', message: errors.join(' ') } });
      }

      const agency = await getPrisma().agency.findUnique({ where: { id: request.body.agencyId! } });
      if (!agency) {
        return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      }
      if (agency.status !== 'ACTIVE') {
        return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Self-onboarding is not available for this agency.' } });
      }

      const result = await getPrisma().$transaction(async (tx) => {
        const candidate = await tx.candidate.create({
          data: {
            agencyId: agency.id,
            reference: getReference(),
            name: request.body.name!.trim(),
            email: request.body.email?.trim().toLowerCase() || null,
            phone: request.body.phone?.trim() || null,
            profession: request.body.profession?.trim() || null,
            experienceYears: request.body.experienceYears ?? null,
            skills: (request.body.skills ?? []).map((skill) => skill.trim()).filter(Boolean),
            onboardingStatus: 'SUBMITTED',
            source: 'SELF_ONBOARDED',
          },
          select: candidateSelect,
        });

        await tx.user.update({
          where: { id: user.id },
          data: { candidateId: candidate.id },
        });

        return candidate;
      });

      await recordAuditEvent({
        actorId: user.id,
        agencyId: agency.id,
        action: 'CANDIDATE_SELF_SUBMITTED',
        entityType: 'Candidate',
        entityId: result.id,
        summary: 'Candidate "' + result.name + '" submitted a self-onboarding profile.',
      });
      await notifyAgencyUsers(
        agency.id,
        { type: 'CANDIDATE_SUBMITTED', title: 'Candidate profile submitted', message: '"' + result.name + '" submitted a profile for review.' },
        ['AGENCY'],
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  app.patch<{ Params: CandidateParams; Body: CandidateInput }>(
    '/candidates/:id',
    { preHandler: requireAuth },
    async (request, reply) => {
      const existing = await getPrisma().candidate.findUnique({ where: { id: request.params.id }, select: candidateSelect });
      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' } });
      }

      const user = request.authUser!;
      const isSelf = user.role === 'INTERVIEWEE' && user.candidateId === existing.id;
      const canManage = user.role === 'ADMIN' || ((user.role === 'AGENCY') && user.agencyId === existing.agencyId);

      if (!isSelf && !canManage) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to update this candidate.' } });
      }

      const errors = validateCandidateInput(request.body, 'update');
      if (errors.length) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_CANDIDATE', message: errors.join(' ') } });
      }

      if (isSelf && request.body.onboardingStatus !== undefined && request.body.onboardingStatus !== 'SUBMITTED') {
        return reply.code(403).send({ success: false, error: { code: 'INVALID_STATUS_CHANGE', message: 'Interviewees may only submit their own profile.' } });
      }

      const data: {
        name?: string;
        email?: string | null;
        phone?: string | null;
        profession?: string | null;
        experienceYears?: number | null;
        skills?: string[];
        onboardingStatus?: CandidateInput['onboardingStatus'];
      } = {};

      if (request.body.name !== undefined) data.name = request.body.name.trim();
      if (request.body.email !== undefined) data.email = request.body.email?.trim().toLowerCase() || null;
      if (request.body.phone !== undefined) data.phone = request.body.phone?.trim() || null;
      if (request.body.profession !== undefined) data.profession = request.body.profession?.trim() || null;
      if (request.body.experienceYears !== undefined) data.experienceYears = request.body.experienceYears;
      if (request.body.skills !== undefined) data.skills = request.body.skills.map((skill) => skill.trim()).filter(Boolean);
      if (request.body.onboardingStatus !== undefined && canManage) data.onboardingStatus = request.body.onboardingStatus;
      if (isSelf) data.onboardingStatus = 'SUBMITTED';

      const candidate = await getPrisma().candidate.update({
        where: { id: existing.id },
        data,
        select: candidateSelect,
      });

      await recordAuditEvent({
        actorId: user.id,
        agencyId: candidate.agencyId,
        action: 'CANDIDATE_UPDATED',
        entityType: 'Candidate',
        entityId: candidate.id,
        summary: 'Updated candidate "' + candidate.name + '".',
      });
      return reply.send({ success: true, data: candidate });
    },
  );
};
