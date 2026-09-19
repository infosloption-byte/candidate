import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env.js';
import { agencyRoutes } from './routes/agencies.js';
import { applicationRoutes } from './routes/applications.js';
import { authRoutes } from './routes/auth.js';
import { candidateRoutes } from './routes/candidates.js';
import { healthRoutes } from './routes/health.js';
import { interviewRoutes } from './routes/interviews.js';
import { jobRoutes } from './routes/jobs.js';

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === 'development' ? 'info' : 'warn',
    },
    requestIdHeader: 'x-request-id',
  });

  void app.register(helmet);
  void app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
  });

  void app.register(healthRoutes, { prefix: '/api/v1' });
  void app.register(authRoutes, { prefix: '/api/v1' });
  void app.register(agencyRoutes, { prefix: '/api/v1' });
  void app.register(jobRoutes, { prefix: '/api/v1' });
  void app.register(candidateRoutes, { prefix: '/api/v1' });
  void app.register(applicationRoutes, { prefix: '/api/v1' });
  void app.register(interviewRoutes, { prefix: '/api/v1' });

  return app;
};
