import type { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';

export const operationalRoutes: FastifyPluginAsync = async (app) => {
  app.get('/notifications', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser!.id;
    const notifications = await getPrisma().notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    const unreadCount = await getPrisma().notification.count({
      where: { userId, readAt: null },
    });
    return reply.send({ success: true, data: { notifications, unreadCount } });
  });

  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: requireAuth },
    async (request, reply) => {
      const result = await getPrisma().notification.updateMany({
        where: { id: request.params.id, userId: request.authUser!.id, readAt: null },
        data: { readAt: new Date() },
      });
      if (result.count === 0) {
        const existing = await getPrisma().notification.findFirst({
          where: { id: request.params.id, userId: request.authUser!.id },
          select: { id: true },
        });
        if (!existing) {
          return reply.code(404).send({ success: false, error: { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' } });
        }
      }
      return reply.send({ success: true, data: { read: true } });
    },
  );

  app.get(
    '/audit-events',
    { preHandler: [requireAuth, requireRole('ADMIN', 'AGENCY')] },
    async (request, reply) => {
      const user = request.authUser!;
      const events = await getPrisma().auditEvent.findMany({
        where: user.role === 'ADMIN' ? undefined : { agencyId: user.agencyId ?? '__missing__' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      });
      return reply.send({ success: true, data: events });
    },
  );
};
