import "dotenv/config";

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const parsePort = (value: string): number => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a valid TCP port. Received: ${value}`);
  }
  return port;
};

export const env = {
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  host: process.env.HOST?.trim() || "0.0.0.0",
  port: parsePort(process.env.PORT?.trim() || "4000"),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || "http://localhost:5173",
  databaseUrl: requireEnv("DATABASE_URL"),
};
