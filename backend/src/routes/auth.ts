import type { FastifyPluginAsync } from 'fastify';
import {
  clearSessionCookie,
  createSession,
  destroySession,
  getSessionUser,
  requireAuth,
  toPublicUser,
  verifyPassword,
} from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';

interface LoginBody {
  email?: string;
  password?: string;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const password = request.body.password ?? '';

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
