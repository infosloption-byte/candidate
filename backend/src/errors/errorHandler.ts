import type { FastifyError, FastifyInstance } from "fastify";
import { Prisma } from "../generated/prisma/client.js";
import { AppError, type AppErrorDetail } from "./AppError.js";
import { env } from "../config/env.js";

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error, request, reply) => {
    if ((error as FastifyError).validation) {
      const validation = (error as FastifyError).validation ?? [];
      const details: AppErrorDetail[] = validation.map((item) => ({
        field: item.instancePath || item.params?.missingProperty,
        code: "INVALID_VALUE",
        message: item.message ?? "Invalid value.",
      }));
      const response = new AppError(400, "INVALID_INPUT", "One or more request fields are invalid.", details);
      return reply.code(response.statusCode).send({
        success: false,
        error: {
          code: response.errorCode,
          message: response.message,
          details: response.details,
        },
      });
    }

    if (error instanceof AppError) {
      request.log.info({ code: error.errorCode }, error.message);
      return reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return reply.code(409).send({
          success: false,
          error: {
            code: "DUPLICATE_RESOURCE",
            message: "The resource conflicts with an existing record.",
            details: [],
          },
        });
      }

      if (error.code === "P2025") {
        return reply.code(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "The requested resource was not found.",
            details: [],
          },
        });
      }
    }

    request.log.error({ err: error, requestId: request.id }, "Unhandled request error");
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: env.nodeEnv === "production"
          ? "An unexpected server error occurred."
          : error instanceof Error
            ? error.message
            : "An unexpected server error occurred.",
        details: [],
      },
    });
  });
};
