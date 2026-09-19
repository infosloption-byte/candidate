import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              required: ['status', 'service', 'timestamp'],
              properties: {
                status: { type: 'string' },
                service: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async () => ({
    success: true,
    data: {
      status: 'ok',
      service: 'candidate-backend',
      timestamp: new Date().toISOString(),
    },
  }));
};
