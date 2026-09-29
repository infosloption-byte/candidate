import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env.js';
import { recordAuditEvent } from './lib/audit.js';
import { actAsRoutes } from './routes/actAs.js';
import { agencyRoutes } from './routes/agencies.js';
import { authRoutes } from './routes/auth.js';
import { candidateRoutes } from './routes/candidates.js';
import { companyRoutes } from './routes/companies.js';
import { documentRoutes } from './routes/documents.js';
import { evaluationRoutes } from './routes/evaluations.js';
import { healthRoutes } from './routes/health.js';
import { interviewRoutes } from './routes/interviews.js';
import { interviewCriterionRoutes } from './routes/interviewCriteria.js';
import { interviewCriterionGroupRoutes } from './routes/interviewCriterionGroups.js';
import { jobRoutes } from './routes/jobs.js';
import { operationalRoutes } from './routes/operational.js';

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    bodyLimit: 8 * 1024 * 1024,
    logger: {
      level: env.nodeEnv === 'development' ? 'info' : 'warn',
    },
    requestIdHeader: 'x-request-id',
  });

  void app.register(helmet);
  void app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Every successful change a platform admin makes while acting inside a company is logged against
  // that company, so customers can see exactly what support did. (Reads are covered by the
  // ADMIN_ACT_AS_STARTED / ENDED events, which carry the reason and mode.)
  app.addHook('onResponse', async (request, reply) => {
    const acting = request.authUser?.actingAs;
    if (!acting || reply.statusCode >= 400) return;
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method) || request.routeOptions.config?.actingExempt) return;

    const summary = request.method + ' ' + request.routeOptions.url + ' (' + reply.statusCode + '). Reason: ' + acting.reason;
    await recordAuditEvent({
      actorId: request.authUser!.id,
      companyId: acting.companyId,
      action: 'ADMIN_ACTING_WRITE',
      entityType: 'Company',
      entityId: acting.companyId,
      summary: summary.length > 500 ? summary.slice(0, 499) + '…' : summary,
    });
  });

  void app.register(healthRoutes, { prefix: '/api/v1' });
  void app.register(authRoutes, { prefix: '/api/v1' });
  void app.register(actAsRoutes, { prefix: '/api/v1' });
  void app.register(agencyRoutes, { prefix: '/api/v1' });
  void app.register(companyRoutes, { prefix: '/api/v1' });
  void app.register(jobRoutes, { prefix: '/api/v1' });
  void app.register(operationalRoutes, { prefix: '/api/v1' });
  void app.register(candidateRoutes, { prefix: '/api/v1' });
  void app.register(documentRoutes, { prefix: '/api/v1' });
  void app.register(interviewRoutes, { prefix: '/api/v1' });
  void app.register(evaluationRoutes, { prefix: '/api/v1' });
  void app.register(interviewCriterionRoutes, { prefix: '/api/v1' });
  void app.register(interviewCriterionGroupRoutes, { prefix: '/api/v1' });

  return app;
};
