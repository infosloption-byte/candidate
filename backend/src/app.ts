import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { closePrisma } from "./lib/prisma.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { candidateRoutes } from "./routes/candidates.js";
import { interviewRoutes } from "./routes/interviews.js";
import { registerErrorHandler } from "./errors/errorHandler.js";

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    bodyLimit: 2 * 1024 * 1024,
    logger: {
      level: env.nodeEnv === "development" ? "info" : "warn",
    },
    requestIdHeader: "x-request-id",
  });

  void app.register(helmet);
  void app.register(cookie);
  void app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
  });
  void app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
  });
  void app.register(authPlugin);

  void app.register(healthRoutes, { prefix: "/api/v1" });
  void app.register(authRoutes, { prefix: "/api/v1" });
  void app.register(candidateRoutes, { prefix: "/api/v1" });
  void app.register(interviewRoutes, { prefix: "/api/v1" });

  registerErrorHandler(app);

  app.addHook("onClose", async () => {
    await closePrisma();
  });

  return app;
};