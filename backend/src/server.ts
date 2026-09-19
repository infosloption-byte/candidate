import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async (): Promise<void> => {
  const app = buildApp();

  try {
    await app.listen({
      host: env.host,
      port: env.port,
    });
  } catch (error) {
    app.log.error({ err: error }, 'Backend server failed to start');
    process.exit(1);
  }
};

void start();
