import 'dotenv/config';

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT must be a valid TCP port. Received: ${process.env.PORT ?? ''}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV?.trim() || 'development',
  host: process.env.HOST?.trim() || '0.0.0.0',
  port,
  corsOrigin: process.env.CORS_ORIGIN?.trim() || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL?.trim() || '',
  documentStorageDir: process.env.DOCUMENT_STORAGE_DIR?.trim() || '',
};
