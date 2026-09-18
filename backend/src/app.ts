import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { env } from "./config/env.js";
import { healthRoutes } from "./routes/health.js";

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: {
      level: env.nodeEnv === "development" ? "info" : "warn",
    },
    requestIdHeader: "x-request-id",
  });

  void app.register(helmet);
  void app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
  });

  void app.register(healthRoutes, { prefix: "/api/v1" });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    return reply.code(error.statusCode && error.statusCode >= 400 ? error.statusCode : 500).send({
      error: {
        code: error.code ?? "INTERNAL_SERVER_ERROR",
        message: env.nodeEnv === "production" ? "An unexpected server error occurred." : error.message,
        requestId: request.id,
      },
    });
  });

  return app;
};
