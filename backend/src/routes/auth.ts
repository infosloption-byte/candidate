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

interface LoginBody {
  email?: string;
  password?: string;
}

interface RegisterIntervieweeBody {
  name?: string;
  email?: string;
  password?: string;
  agencyId?: string;
  phone?: string | null;
  profession?: string | null;
  experienceYears?: number | null;
  skills?: string[];
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password ?? '';

    if (!email || !password) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_LOGIN', message: 'Email and password are required.' },
      });
    }

    const user = await getPrisma().user.findUnique({ where: { email } });

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
    const name = request.body?.name?.trim();
    const email = request.body?.email?.trim().toLowerCase();
    const password = request.body?.password ?? '';
    const agencyId = request.body?.agencyId?.trim();
    const experienceYears = request.body?.experienceYears ?? null;
    const skills = (request.body?.skills ?? []).map((skill) => skill.trim()).filter(Boolean);

    if (!name || name.length < 2) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_REGISTRATION', message: 'Name must be at least 2 characters.' } });
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
    if (
      experienceYears !== null
      && (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60)
    ) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_REGISTRATION', message: 'Experience years must be a whole number between 0 and 60.' } });
    }

    const agency = await getPrisma().agency.findFirst({
      where: { id: agencyId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!agency) {
      return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Selected agency is not available.' } });
    }

    try {
      const result = await getPrisma().$transaction(async (tx) => {
        const candidate = await tx.candidate.create({
          data: {
            agencyId: agency.id,
            reference: 'CA-' + Date.now().toString(36).toUpperCase(),
            name,
            email,
            phone: request.body?.phone?.trim() || null,
            profession: request.body?.profession?.trim() || null,
            experienceYears,
            skills,
            onboardingStatus: 'SUBMITTED',
            source: 'SELF_ONBOARDED',
          },
        });

        const user = await tx.user.create({
          data: {
            candidateId: candidate.id,
            name,
            email,
            passwordHash: await hashPassword(password),
            role: 'INTERVIEWEE',
          },
          select: {
            id: true,
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
