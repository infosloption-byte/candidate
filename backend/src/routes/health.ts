import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", {
    schema: {
      response: {
        200: {
          type: "object",
          required: ["status", "service", "timestamp"],
          properties: {
            status: { type: "string" },
            service: { type: "string" },
            timestamp: { type: "string" },
          },
        },
      },
    },
  }, async () => ({
    status: "ok",
    service: "candidate-erp-backend",
    timestamp: new Date().toISOString(),
  }));

  app.get("/health/db", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "reachable", timestamp: new Date().toISOString() };
    } catch (error) {
      app.log.error({ err: error }, "Database health check failed");
      return reply.code(503).send({
        status: "error",
        database: "unreachable",
        timestamp: new Date().toISOString(),
      });
    }
  });
};
