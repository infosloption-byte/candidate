import type { FastifyPluginAsync } from 'fastify';
import {
  ACTING_DEFAULT_MINUTES,
  ACTING_MAX_MINUTES,
  getSessionUser,
  requireAuth,
  requireRole,
  startActing,
  stopActing,
  verifyPassword,
  type ActingMode,
} from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';

interface EnterBody {
  reason?: string;
  mode?: ActingMode;
  durationMins?: number;
  /** Step-up confirmation: the administrator's own password, required for READ_WRITE. */
  password?: string;
}

export const ACTING_AUDIT_ACTIONS = ['ADMIN_ACT_AS_STARTED', 'ADMIN_ACT_AS_ENDED', 'ADMIN_ACTING_WRITE'] as const;

const clip = (value: string, max = 500): string => (value.length > max ? value.slice(0, max - 1) + '…' : value);

export const actAsRoutes: FastifyPluginAsync = async (app) => {
  // Enter a company workspace. Only a platform ADMIN who is not already inside one (while acting the
  // session presents as COMPANY_ADMIN, so switching company requires leaving first).
  app.post<{ Params: { companyId: string }; Body: EnterBody }>(
    '/admin/act-as/:companyId',
    { preHandler: [requireAuth, requireRole('ADMIN')], config: { actingExempt: true } },
    async (request, reply) => {
      const admin = request.authUser!;
      const reason = request.body?.reason?.trim() ?? '';
      const mode: ActingMode = request.body?.mode ?? 'READ_ONLY';
      const minutes = request.body?.durationMins ?? ACTING_DEFAULT_MINUTES;

      if (!['READ_ONLY', 'READ_WRITE'].includes(mode)) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_MODE', message: 'Mode must be READ_ONLY or READ_WRITE.' } });
      }
      if (reason.length < 5 || reason.length > 255) {
        return reply.code(400).send({ success: false, error: { code: 'REASON_REQUIRED', message: 'A reason of 5-255 characters (for example a support ticket) is required.' } });
      }
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > ACTING_MAX_MINUTES) {
        return reply.code(400).send({ success: false, error: { code: 'INVALID_DURATION', message: 'Duration must be between 5 and ' + ACTING_MAX_MINUTES + ' minutes.' } });
      }

      if (mode === 'READ_WRITE') {
        const account = await getPrisma().user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
        const password = request.body?.password ?? '';
        if (!account || !password || !(await verifyPassword(password, account.passwordHash))) {
          return reply.code(403).send({ success: false, error: { code: 'CONFIRMATION_FAILED', message: 'Write mode requires your current password.' } });
        }
      }

      const company = await getPrisma().company.findUnique({
        where: { id: request.params.companyId },
        select: { id: true, name: true, status: true },
      });
      if (!company) {
        return reply.code(404).send({ success: false, error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found.' } });
      }
      if (company.status !== 'ACTIVE') {
        return reply.code(409).send({ success: false, error: { code: 'COMPANY_INACTIVE', message: 'This company is inactive.' } });
      }

      if (!(await startActing(request, { companyId: company.id, mode, reason, minutes }))) {
        return reply.code(401).send({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' } });
      }

      await recordAuditEvent({
        actorId: admin.id,
        companyId: company.id,
        action: 'ADMIN_ACT_AS_STARTED',
        entityType: 'Company',
        entityId: company.id,
        summary: clip('Platform administrator "' + admin.name + '" entered the workspace in ' + mode + ' mode for ' + minutes + ' min. Reason: ' + reason),
      });

      const user = await getSessionUser(request);
      return reply.send({ success: true, data: { user } });
    },
  );

  // Leave the company workspace and return to platform-only access.
  app.delete(
    '/admin/act-as',
    { preHandler: requireAuth, config: { actingExempt: true } },
    async (request, reply) => {
      const acting = request.authUser!.actingAs;
      if (!acting) {
        return reply.code(409).send({ success: false, error: { code: 'NOT_ACTING', message: 'You are not inside a company workspace.' } });
      }

      await stopActing(request);
      await recordAuditEvent({
        actorId: request.authUser!.id,
        companyId: acting.companyId,
        action: 'ADMIN_ACT_AS_ENDED',
        entityType: 'Company',
        entityId: acting.companyId,
        summary: clip('Platform administrator "' + request.authUser!.name + '" left the workspace.'),
      });

      const user = await getSessionUser(request);
      return reply.send({ success: true, data: { user } });
    },
  );

  // Transparency for customers: every time platform staff entered this workspace, and every change made.
  app.get(
    '/company/access-log',
    { preHandler: [requireAuth, requireRole('COMPANY_ADMIN')] },
    async (request, reply) => {
      const user = request.authUser!;
      if (user.actingAs) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'The access log is available to the company\'s own administrators.' } });
      }

      const events = await getPrisma().auditEvent.findMany({
        where: { companyId: user.companyId ?? '__missing__', action: { in: [...ACTING_AUDIT_ACTIONS] } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          action: true,
          summary: true,
          createdAt: true,
          actor: { select: { id: true, name: true } },
        },
      });
      reply.header('cache-control', 'no-store');
      return reply.send({ success: true, data: events });
    },
  );
};
