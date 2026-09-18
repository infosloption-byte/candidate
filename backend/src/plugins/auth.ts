import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { sha256, safeEqual } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { authenticateToken } from "../services/authService.js";
import { hasPermission, type Permission } from "../auth/permissions.js";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("auth", null);

  app.decorate("authenticate", async (request) => {
    const token = request.cookies[env.accessCookieName];
    if (!token) throw AppError.unauthenticated();

    const auth = await authenticateToken(token);

    if (stateChangingMethods.has(request.method)) {
      const origin = request.headers.origin;
      if (origin && origin !== env.corsOrigin) throw AppError.csrf();

      const csrfCookie = request.cookies[env.csrfCookieName];
      const csrfHeader = request.headers["x-csrf-token"];

      if (!csrfCookie || typeof csrfHeader !== "string" || !safeEqual(sha256(csrfCookie), sha256(csrfHeader))) {
        throw AppError.csrf();
      }

      const session = await prisma.session.findFirst({
        where: {
          id: auth.sessionId,
          tenantId: auth.tenantId,
          userId: auth.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session || !safeEqual(session.csrfHash, sha256(csrfCookie))) throw AppError.csrf();
    }

    request.auth = auth;
  });

  app.decorate("authorize", (permission: Permission) => async (request) => {
    if (!request.auth) throw AppError.unauthenticated();
    if (!hasPermission(request.auth.role, permission)) throw AppError.forbidden();
  });
};

export default fp(authPlugin);