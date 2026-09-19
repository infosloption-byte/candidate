import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env.js';
import { healthRoutes } from './routes/health.js';

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

  return app;
};
