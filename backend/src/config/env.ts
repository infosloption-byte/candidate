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

const parsePositiveInteger = (name: string, value: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${value}`);
  }
  return parsed;
};

const nodeEnv = process.env.NODE_ENV?.trim() || "development";
const jwtSecret = requireEnv("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

export const env = {
  nodeEnv,
  host: process.env.HOST?.trim() || "0.0.0.0",
  port: parsePort(process.env.PORT?.trim() || "4000"),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || "http://localhost:5173",
  databaseUrl: requireEnv("DATABASE_URL"),
  jwtSecret,
  jwtIssuer: process.env.JWT_ISSUER?.trim() || "buildhire-api",
  jwtAudience: process.env.JWT_AUDIENCE?.trim() || "buildhire-web",
  sessionTtlSeconds: parsePositiveInteger("SESSION_TTL_SECONDS", process.env.SESSION_TTL_SECONDS?.trim() || "28800"),
  accessCookieName: process.env.ACCESS_COOKIE_NAME?.trim() || "buildhire_access",
  csrfCookieName: process.env.CSRF_COOKIE_NAME?.trim() || "buildhire_csrf",
  documentStorageDir: process.env.DOCUMENT_STORAGE_DIR?.trim() || "./uploads",
  maxDocumentBytes: parsePositiveInteger("MAX_DOCUMENT_BYTES", process.env.MAX_DOCUMENT_BYTES?.trim() || String(10 * 1024 * 1024)),
};
