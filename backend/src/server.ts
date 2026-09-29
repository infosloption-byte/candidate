import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startInterviewMaintenance } from './lib/interviewMaintenance.js';

const start = async (): Promise<void> => {
  const app = buildApp();

  try {
    await app.listen({
      host: env.host,
      port: env.port,
    });
    const stopMaintenance = startInterviewMaintenance(app.log);
    app.addHook('onClose', async () => stopMaintenance());
  } catch (error) {
    app.log.error({ err: error }, 'Backend server failed to start');
    process.exit(1);
  }
};

void start();
