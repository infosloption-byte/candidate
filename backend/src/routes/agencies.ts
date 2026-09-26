import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { hashPassword, requireAgencyAccess, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';

type AgencyStatus = 'ACTIVE' | 'INACTIVE';
type AgencyUserRole = 'AGENCY' | 'INTERVIEWER';

interface AgencyBody {
  name?: string;
  slug?: string;
  status?: AgencyStatus;
}

interface UserBody {
  name?: string;
  email?: string;
  password?: string;
  role?: AgencyUserRole;
}

interface InterviewerQuery {
  agencyId?: string;
}

interface GlobalInterviewerBody {
  name?: string;
  email?: string;
  password?: string;
  active?: boolean;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const slugify = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100);

const conflictResponse = (reply: FastifyReply, code: string, message: string) =>
  reply.code(409).send({ success: false, error: { code, message } });

export const agencyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/public/agencies', async (_request, reply) => {
    const agencies = await getPrisma().agency.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    return reply.send({ success: true, data: agencies });
  });

  app.get('/agencies', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (_request, reply) => {
    const agencies = await getPrisma().agency.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, jobs: true, candidates: true } } },
    });

    return reply.send({
      success: true,
      data: agencies.map((agency) => ({
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
        status: agency.status,
        createdAt: agency.createdAt,
        updatedAt: agency.updatedAt,
        counts: agency._count,
      })),
    });
  });

  app.get<{ Params: { id: string } }>('/agencies/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request, reply) => {
    const agency = await getPrisma().agency.findUnique({
      where: { id: request.params.id },
      include: { _count: { select: { users: true, jobs: true, candidates: true } } },
    });

    if (!agency) {
      return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
    }

    return reply.send({ success: true, data: { ...agency, counts: agency._count } });
  });

  app.post<{ Body: AgencyBody }>('/agencies', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request, reply) => {
    const name = request.body.name?.trim();
    const slug = slugify(request.body.slug ?? request.body.name ?? '');

    if (!name || !slug) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_AGENCY', message: 'Agency name and a valid slug are required.' } });
    }
    if (name.length < 2 || name.length > 160 || slug.length > 100) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_AGENCY', message: 'Agency name must be 2-160 characters and the slug must be 100 characters or fewer.' } });
    }

    try {
      const agency = await getPrisma().agency.create({ data: { name, slug } });
      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'AGENCY_CREATED',
        entityType: 'Agency',
        entityId: agency.id,
        summary: 'Created agency "' + agency.name + '".',
      });
      return reply.code(201).send({ success: true, data: agency });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return conflictResponse(reply, 'AGENCY_SLUG_EXISTS', 'Agency slug is already in use.');
      }
      throw error;
    }
  });

  app.patch<{ Params: { id: string }; Body: AgencyBody }>('/agencies/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request, reply) => {
    const existing = await getPrisma().agency.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
    }

    if (request.body.status !== undefined && !['ACTIVE', 'INACTIVE'].includes(request.body.status)) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_AGENCY_STATUS', message: 'Agency status must be ACTIVE or INACTIVE.' } });
    }

    const data: AgencyBody = {};
    if (request.body.name !== undefined) data.name = request.body.name.trim();
    if (request.body.slug !== undefined) data.slug = slugify(request.body.slug);
    if (request.body.status !== undefined) data.status = request.body.status;

    if (data.name === '') {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_AGENCY', message: 'Agency name cannot be empty.' } });
    }
    if (data.name !== undefined && (data.name.length < 2 || data.name.length > 160)) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_AGENCY', message: 'Agency name must be 2-160 characters.' } });
    }
    if (data.slug !== undefined && !data.slug) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_AGENCY', message: 'Agency slug cannot be empty.' } });
    }

    try {
      const agency = await getPrisma().agency.update({ where: { id: request.params.id }, data });
      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: agency.id,
        action: 'AGENCY_UPDATED',
        entityType: 'Agency',
        entityId: agency.id,
        summary: 'Updated agency "' + agency.name + '".',
      });
      return reply.send({ success: true, data: agency });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return conflictResponse(reply, 'AGENCY_SLUG_EXISTS', 'Agency slug is already in use.');
      }
      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>('/agencies/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request, reply) => {
    const existing = await getPrisma().agency.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
    }

    const agency = await getPrisma().agency.update({
      where: { id: request.params.id },
      data: { status: 'INACTIVE' },
    });

    await recordAuditEvent({
      actorId: request.authUser!.id,
      agencyId: agency.id,
      action: 'AGENCY_DEACTIVATED',
      entityType: 'Agency',
      entityId: agency.id,
      summary: 'Deactivated agency "' + agency.name + '".',
    });

    return reply.send({ success: true, data: agency });
  });

  app.get(
    '/system-users',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    async (_request, reply) => {
      const users = await getPrisma().user.findMany({
        where: { role: { in: ['ADMIN', 'AGENCY'] } },
        select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });

      return reply.send({ success: true, data: users });
    },
  );

  app.post<{
    Body: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'AGENCY'; agencyId?: string | null };
  }>(
    '/system-users',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    async (request, reply) => {
      const name = request.body.name?.trim();
      const email = request.body.email?.trim().toLowerCase();
      const password = request.body.password ?? '';
      const role = request.body.role;
      const agencyId = role === 'AGENCY' ? request.body.agencyId ?? null : null;

      if (!name || !email || !password || password.length < 8 || !role || !['ADMIN', 'AGENCY'].includes(role)) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_SYSTEM_USER', message: 'Name, email, password (8+ characters), and a valid system user role are required.' },
        });
      }
      if (name.length > 160 || !emailPattern.test(email) || email.length > 191 || password.length > 128) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_SYSTEM_USER', message: 'Name must be 160 characters or fewer, email must be valid and 191 characters or fewer, and password must be 8-128 characters.' },
        });
      }

      if (role === 'AGENCY') {
        if (!agencyId) {
          return reply.code(400).send({
            success: false,
            error: { code: 'AGENCY_REQUIRED', message: 'An agency is required for an Agency user.' },
          });
        }
        const agency = await getPrisma().agency.findUnique({ where: { id: agencyId }, select: { id: true, status: true } });
        if (!agency) return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
        if (agency.status !== 'ACTIVE') return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Users cannot be added to an inactive agency.' } });
      }

      try {
        const user = await getPrisma().user.create({
          data: {
            agencyId,
            name,
            email,
            passwordHash: await hashPassword(password),
            role,
          },
          select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        });

        await recordAuditEvent({
          actorId: request.authUser!.id,
          agencyId: user.agencyId,
          action: 'SYSTEM_USER_CREATED',
          entityType: 'User',
          entityId: user.id,
          summary: 'Created ' + user.role.toLowerCase() + ' user "' + user.name + '".',
        });

        return reply.code(201).send({ success: true, data: user });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return conflictResponse(reply, 'USER_EMAIL_EXISTS', 'Email is already in use.');
        }
        throw error;
      }
    },
  );

  app.patch<{
    Params: { id: string };
    Body: { name?: string; email?: string; password?: string; active?: boolean };
  }>(
    '/system-users/:id',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    async (request, reply) => {
      const existing = await getPrisma().user.findFirst({
        where: { id: request.params.id, role: { in: ['ADMIN', 'AGENCY'] } },
      });
      if (!existing) return reply.code(404).send({ success: false, error: { code: 'SYSTEM_USER_NOT_FOUND', message: 'System user not found.' } });
      if (existing.id === request.authUser!.id && request.body.active === false) {
        return reply.code(400).send({ success: false, error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own account.' } });
      }

      const data: { name?: string; email?: string; passwordHash?: string; active?: boolean } = {};
      if (request.body.name !== undefined) data.name = request.body.name.trim();
      if (request.body.email !== undefined) data.email = request.body.email.trim().toLowerCase();
      if (request.body.active !== undefined) data.active = request.body.active;
      if (request.body.password !== undefined) {
        const password = request.body.password;
        if (password.length < 8 || password.length > 128) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_SYSTEM_USER_PASSWORD', message: 'Password must be 8-128 characters.' },
          });
        }
        data.passwordHash = await hashPassword(password);
      }

      if (data.name === '') return reply.code(400).send({ success: false, error: { code: 'INVALID_SYSTEM_USER', message: 'User name cannot be empty.' } });
      if (data.name !== undefined && (data.name.length < 2 || data.name.length > 160)) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_SYSTEM_USER', message: 'User name must be 2-160 characters.' } });
      }
      if (data.email !== undefined && (data.email.length > 191 || !emailPattern.test(data.email))) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_SYSTEM_USER', message: 'Email must be valid and 191 characters or fewer.' } });
      }

      try {
        const user = await getPrisma().user.update({
          where: { id: existing.id },
          data,
          select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        });

        await recordAuditEvent({
          actorId: request.authUser!.id,
          agencyId: user.agencyId,
          action: 'SYSTEM_USER_UPDATED',
          entityType: 'User',
          entityId: user.id,
          summary: 'Updated system user "' + user.name + '".',
        });

        return reply.send({ success: true, data: user });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return conflictResponse(reply, 'USER_EMAIL_EXISTS', 'Email is already in use.');
        }
        throw error;
      }
    },
  );

  app.get(
    '/interviewers/all',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    async (_request, reply) => {
      const interviewers = await getPrisma().user.findMany({
        where: { role: 'INTERVIEWER' },
        select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        orderBy: [{ agencyId: 'asc' }, { active: 'desc' }, { name: 'asc' }],
      });

      return reply.send({ success: true, data: interviewers });
    },
  );

  app.get<{ Querystring: InterviewerQuery }>(
    '/interviewers',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const actor = request.authUser!;
      const requestedAgencyId = request.query.agencyId;

      if (actor.role === 'AGENCY' && requestedAgencyId && requestedAgencyId !== actor.agencyId) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only load interviewers for your own agency.' },
        });
      }

      const agencyId = actor.role === 'AGENCY' ? actor.agencyId : requestedAgencyId;

      if (!agencyId) {
        return reply.code(400).send({
          success: false,
          error: { code: 'AGENCY_REQUIRED', message: 'An agencyId is required when loading available interviewers.' },
        });
      }

      const agency = await getPrisma().agency.findUnique({
        where: { id: agencyId },
        select: { id: true, status: true },
      });
      if (!agency) {
        return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      }

      const interviewers = await getPrisma().user.findMany({
        where: {
          role: 'INTERVIEWER',
          active: true,
          OR: [{ agencyId }, { agencyId: null }],
        },
        select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        orderBy: [{ agencyId: 'asc' }, { name: 'asc' }],
      });

      return reply.send({ success: true, data: interviewers });
    },
  );

  app.get(
    '/interviewers/global',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    async (_request, reply) => {
      const interviewers = await getPrisma().user.findMany({
        where: { role: 'INTERVIEWER', agencyId: null },
        select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      });

      return reply.send({ success: true, data: interviewers });
    },
  );

  app.post<{ Body: GlobalInterviewerBody }>(
    '/interviewers',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    async (request, reply) => {
      const name = request.body.name?.trim();
      const email = request.body.email?.trim().toLowerCase();
      const password = request.body.password ?? '';

      if (!name || !email || !password || password.length < 8) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_INTERVIEWER', message: 'Name, email, and an 8+ character password are required.' },
        });
      }
      if (name.length > 160 || !emailPattern.test(email) || email.length > 191 || password.length > 128) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_INTERVIEWER', message: 'Name must be 160 characters or fewer, email must be valid and 191 characters or fewer, and password must be 8-128 characters.' },
        });
      }

      try {
        const user = await getPrisma().user.create({
          data: {
            agencyId: null,
            name,
            email,
            passwordHash: await hashPassword(password),
            role: 'INTERVIEWER',
          },
          select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        });

        await recordAuditEvent({
          actorId: request.authUser!.id,
          agencyId: null,
          action: 'GLOBAL_INTERVIEWER_CREATED',
          entityType: 'User',
          entityId: user.id,
          summary: 'Created global interviewer "' + user.name + '".',
        });

        return reply.code(201).send({ success: true, data: user });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return conflictResponse(reply, 'USER_EMAIL_EXISTS', 'Email is already in use.');
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: Pick<GlobalInterviewerBody, 'name' | 'active'> & { email?: string; password?: string } }>(
    '/interviewers/:id',
    { preHandler: [requireAuth, requireRole('ADMIN')] },
    async (request, reply) => {
      const existing = await getPrisma().user.findFirst({
        where: { id: request.params.id, agencyId: null, role: 'INTERVIEWER' },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'INTERVIEWER_NOT_FOUND', message: 'Global interviewer not found.' } });
      }

      const data: { name?: string; email?: string; passwordHash?: string; active?: boolean } = {};
      if (request.body.name !== undefined) data.name = request.body.name.trim();
      if (request.body.email !== undefined) data.email = request.body.email.trim().toLowerCase();
      if (request.body.active !== undefined) data.active = request.body.active;
      if (request.body.password !== undefined) {
        if (request.body.password.length < 8 || request.body.password.length > 128) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEWER_PASSWORD', message: 'Password must be 8-128 characters.' } });
        }
        data.passwordHash = await hashPassword(request.body.password);
      }

      if (data.name === '') {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEWER', message: 'Interviewer name cannot be empty.' } });
      }
      if (data.name !== undefined && (data.name.length < 2 || data.name.length > 160)) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEWER', message: 'Interviewer name must be 2-160 characters.' } });
      }
      if (data.email !== undefined && (data.email.length > 191 || !emailPattern.test(data.email))) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_INTERVIEWER', message: 'Email must be valid and 191 characters or fewer.' } });
      }

      try {
        const user = await getPrisma().user.update({
          where: { id: existing.id },
          data,
          select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true },
        });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: null,
        action: 'GLOBAL_INTERVIEWER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        summary: 'Updated global interviewer "' + user.name + '".',
      });

        return reply.send({ success: true, data: user });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') return conflictResponse(reply, 'USER_EMAIL_EXISTS', 'Email is already in use.');
        throw error;
      }
    },
  );

  app.get<{ Params: { agencyId: string } }>(
    '/agencies/:agencyId/users',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const users = await getPrisma().user.findMany({
        where: { agencyId: request.params.agencyId },
        select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, data: users });
    },
  );

  app.post<{ Params: { agencyId: string }; Body: UserBody }>(
    '/agencies/:agencyId/users',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const name = request.body.name?.trim();
      const email = request.body.email?.trim().toLowerCase();
      const password = request.body.password ?? '';
      const role = request.body.role;

      if (!name || !email || !password || password.length < 8 || !role || !['AGENCY', 'INTERVIEWER'].includes(role)) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_USER', message: 'Name, email, password (8+ characters), and role (Agency or Interviewer) are required.' } });
      }
      if (name.length > 160 || !emailPattern.test(email) || email.length > 191 || password.length > 128) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_USER', message: 'Name must be 160 characters or fewer, email must be valid and 191 characters or fewer, and password must be 8-128 characters.' } });
      }

      const agency = await getPrisma().agency.findUnique({ where: { id: request.params.agencyId } });
      if (!agency) {
        return reply.code(404).send({ success: false, error: { code: 'AGENCY_NOT_FOUND', message: 'Agency not found.' } });
      }
      if (agency.status !== 'ACTIVE') {
        return reply.code(409).send({ success: false, error: { code: 'AGENCY_INACTIVE', message: 'Users cannot be added to an inactive agency.' } });
      }

      try {
        const user = await getPrisma().user.create({
          data: {
            agencyId: agency.id,
            name,
            email,
            passwordHash: await hashPassword(password),
            role,
          },
          select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
        });

        await recordAuditEvent({
          actorId: request.authUser!.id,
          agencyId: agency.id,
          action: 'AGENCY_USER_CREATED',
          entityType: 'User',
          entityId: user.id,
          summary: 'Created ' + user.role.toLowerCase() + ' user "' + user.name + '".',
        });
        return reply.code(201).send({ success: true, data: user });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') {
          return conflictResponse(reply, 'USER_EMAIL_EXISTS', 'Email is already in use.');
        }
        throw error;
      }
    },
  );

  app.patch<{ Params: { agencyId: string; userId: string }; Body: Pick<UserBody, 'name' | 'role'> & { email?: string; password?: string; active?: boolean } }>(
    '/agencies/:agencyId/users/:userId',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY'), requireAgencyAccess()] },
    async (request, reply) => {
      const existing = await getPrisma().user.findFirst({
        where: { id: request.params.userId, agencyId: request.params.agencyId },
      });

      if (!existing) {
        return reply.code(404).send({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Agency user not found.' } });
      }

      if (existing.id === request.authUser!.id && request.body.active === false) {
        return reply.code(400).send({ success: false, error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own account.' } });
      }

      if (request.body.role !== undefined && !['AGENCY', 'INTERVIEWER'].includes(request.body.role)) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_ROLE', message: 'Agency users can only have Agency or Interviewer roles.' } });
      }

      const data: { name?: string; email?: string; passwordHash?: string; active?: boolean; role?: AgencyUserRole } = {};
      if (request.body.name !== undefined) data.name = request.body.name.trim();
      if (request.body.email !== undefined) data.email = request.body.email.trim().toLowerCase();
      if (request.body.active !== undefined) data.active = request.body.active;
      if (request.body.role !== undefined) data.role = request.body.role;
      if (request.body.password !== undefined) {
        if (request.body.password.length < 8 || request.body.password.length > 128) {
          return reply.code(400).send({ success: false, error: { code: 'INVALID_USER_PASSWORD', message: 'Password must be 8-128 characters.' } });
        }
        data.passwordHash = await hashPassword(request.body.password);
      }

      if (data.name === '') {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_USER', message: 'User name cannot be empty.' } });
      }
      if (data.name !== undefined && data.name.length > 160) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_USER', message: 'User name must be 160 characters or fewer.' } });
      }
      if (data.email !== undefined && (data.email.length > 191 || !emailPattern.test(data.email))) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_USER', message: 'Email must be valid and 191 characters or fewer.' } });
      }

      try {
        const updatedUser = await getPrisma().user.update({
          where: { id: existing.id },
          data,
          select: { id: true, agencyId: true, candidateId: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
        });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: request.params.agencyId,
        action: 'AGENCY_USER_UPDATED',
        entityType: 'User',
        entityId: updatedUser.id,
        summary: 'Updated agency user "' + updatedUser.name + '".',
        });
        return reply.send({ success: true, data: updatedUser });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') return conflictResponse(reply, 'USER_EMAIL_EXISTS', 'Email is already in use.');
        throw error;
      }
    },
  );
};
