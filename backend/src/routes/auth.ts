import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  requireAuth,
  toPublicUser,
  verifyPassword,
} from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';
import { notifyAgencyUsers } from '../lib/notifications.js';
import { validateCandidateInput } from '../domain/candidateValidation.js';

interface LoginBody {
  email?: string;
  password?: string;
}

interface RegisterCompanyBody {
  companyName?: string;
  companySlug?: string;
  adminName?: string;
  email?: string;
  password?: string;
}

interface RegisterIntervieweeBody {
  agencyRegisterNo?: string | null;
  firstName?: string;
  lastName?: string;
  birthdate?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  requestedProfession?: string;
  email?: string;
  password?: string;
  agencyId?: string;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterCompanyBody }>('/auth/register/company', async (request, reply) => {
    const companyName = request.body?.companyName?.trim();
    const companySlug = (request.body?.companySlug?.trim().toLowerCase()
      || companyName?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100));
    const adminName = request.body?.adminName?.trim();
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password ?? '';

    if (!companyName || companyName.length < 2 || companyName.length > 160) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY', message: 'Company name must be 2-160 characters.' } });
    }
    if (!companySlug || companySlug.length < 2 || companySlug.length > 100) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY', message: 'A valid company identifier is required.' } });
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(companySlug)) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY', message: 'Company identifier can only contain letters, numbers, and hyphens.' } });
    }
    if (!adminName || adminName.length < 2 || adminName.length > 160) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY_ADMIN', message: 'Company administrator name is required.' } });
    }
    if (!email || !email.includes('@') || email.length > 191) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY_ADMIN', message: 'A valid email address is required.' } });
    }
    if (password.length < 8 || password.length > 128) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY_ADMIN', message: 'Password must be 8-128 characters.' } });
    }

    try {
      const result = await getPrisma().$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { name: companyName, slug: companySlug, status: 'ACTIVE' },
        });
        const user = await tx.user.create({
          data: {
            companyId: company.id,
            agencyId: null,
            name: adminName,
            email,
            passwordHash: await hashPassword(password),
            role: 'COMPANY',
            active: true,
          },
          select: {
            id: true,
            companyId: true,
            agencyId: true,
            candidateId: true,
            name: true,
            email: true,
            role: true,
            active: true,
            company: { select: { id: true, name: true, slug: true, status: true } },
          },
        });
        return { company, user };
      });

      await createSession(result.user.id, reply);

      return reply.code(201).send({
        success: true,
        data: {
          company: result.company,
          user: toPublicUser({
            id: result.user.id,
            companyId: result.user.companyId,
            companyName: result.user.company?.name ?? null,
            agencyId: result.user.agencyId,
            candidateId: result.user.candidateId,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            active: result.user.active,
          }),
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return reply.code(409).send({ success: false, error: { code: 'COMPANY_EXISTS', message: 'Company identifier or administrator email is already in use.' } });
      }
      throw error;
    }
  });

  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password ?? '';

    if (!email || !password) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_LOGIN', message: 'Email and password are required.' },
      });
    }

    const user = await getPrisma().user.findUnique({
      where: { email },
      include: { company: { select: { id: true, name: true, slug: true, status: true } } },
    });

    if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_LOGIN', message: 'Invalid email or password.' },
      });
    }

    await createSession(user.id, reply);

    return reply.send({
      success: true,
      data: {
        user: toPublicUser({
          id: user.id,
          companyId: user.companyId,
          companyName: user.company?.name ?? null,
          agencyId: user.agencyId,
          candidateId: user.candidateId,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
        }),
      },
    });
  });

  app.post<{ Body: RegisterIntervieweeBody }>('/auth/register/interviewee', async (request, reply) => {
    const firstName = request.body?.firstName?.trim();
    const lastName = request.body?.lastName?.trim();
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password ?? '';
    const agencyId = request.body?.agencyId?.trim();
    const profileErrors = validateCandidateInput({
      agencyRegisterNo: request.body?.agencyRegisterNo ?? null,
      firstName,
      lastName,
      birthdate: request.body?.birthdate ?? null,
      passportNumber: request.body?.passportNumber ?? null,
      passportExpiry: request.body?.passportExpiry ?? null,
      requestedProfession: request.body?.requestedProfession,
    }, 'self');

    if (!email) {
      profileErrors.push('A valid email address is required.');
    }
    if (password.length > 128) {
      profileErrors.push('Password must be 128 characters or fewer.');
    }

    if (profileErrors.length) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_REGISTRATION', message: profileErrors.join(' ') },
      });
    }
    if (!firstName || !lastName) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_REGISTRATION', message: 'First name and last name are required.' },
      });
    }
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_REGISTRATION', message: 'A valid email address is required.' } });
    }
    if (password.length < 8) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_REGISTRATION', message: 'Password must be at least 8 characters.' } });
    }
    if (!agencyId) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_REGISTRATION', message: 'Select an agency.' } });
    }
    const agency = await getPrisma().agency.findFirst({
      where: { id: agencyId, status: 'ACTIVE', companyId: { not: null } },
      select: { id: true, companyId: true, company: { select: { id: true, name: true, status: true } } },
    });

    if (!agency) {
      return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Selected agency is not available.' } });
    }

    try {
      const result = await getPrisma().$transaction(async (tx) => {
        const candidate = await tx.candidate.create({
          data: {
            companyId: agency.companyId!,
            agencyId: agency.id,
            reference: 'CA-' + randomBytes(5).toString('hex').toUpperCase(),
            agencyRegisterNo: request.body?.agencyRegisterNo?.trim() || 'SELF-' + randomBytes(5).toString('hex').toUpperCase(),
            firstName: firstName!,
            lastName: lastName!,
            birthdate: request.body?.birthdate?.trim() ? new Date(request.body.birthdate) : null,
            passportNumber: request.body?.passportNumber?.trim() || null,
            passportExpiry: request.body?.passportExpiry?.trim() ? new Date(request.body.passportExpiry) : null,
            requestedProfession: request.body?.requestedProfession?.trim() || 'Not specified',
            onboardingStatus: 'SUBMITTED',
            source: 'SELF_ONBOARDED',
          },
        });

        const user = await tx.user.create({
          data: {
            candidateId: candidate.id,
            companyId: agency.companyId!,
            agencyId: agency.id,
            name: [firstName!, lastName!].join(' '),
            email,
            passwordHash: await hashPassword(password),
            role: 'INTERVIEWEE',
          },
          select: {
            id: true,
            companyId: true,
            agencyId: true,
            candidateId: true,
            name: true,
            email: true,
            role: true,
            active: true,
          },
        });

        return { user };
      });

      await createSession(result.user.id, reply);

      await recordAuditEvent({
        actorId: result.user.id,
        agencyId,
        action: 'INTERVIEWEE_REGISTERED',
        entityType: 'User',
        entityId: result.user.id,
        summary: 'Interviewee "' + result.user.name + '" registered and submitted a candidate profile.',
      });
      await notifyAgencyUsers(
        agencyId,
        { type: 'CANDIDATE_SUBMITTED', title: 'Candidate profile submitted', message: result.user.name + ' completed self-registration and submitted a profile.' },
        ['AGENCY'],
      );

      return reply.code(201).send({ success: true, data: { user: result.user } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return reply.code(409).send({ success: false, error: { code: 'USER_EMAIL_EXISTS', message: 'Email is already registered.' } });
      }
      throw error;
    }
  });

  app.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    reply.header('cache-control', 'no-store');
    return reply.send({ success: true, data: { user: request.authUser } });
  });

  app.post('/auth/logout', async (request, reply) => {
    await destroySession(request, reply);
    return reply.send({ success: true, data: { loggedOut: true } });
  });

  app.post('/auth/logout-all', { preHandler: requireAuth }, async (request, reply) => {
    await getPrisma().session.deleteMany({ where: { userId: request.authUser!.id } });
    clearSessionCookie(reply);
    return reply.send({ success: true, data: { loggedOut: true } });
  });
};
