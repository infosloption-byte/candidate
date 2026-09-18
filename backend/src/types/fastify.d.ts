import type { FastifyReply, FastifyRequest } from "fastify";
import type { Permission } from "../auth/permissions.js";
import type { UserRole } from "../generated/prisma/enums.js";

export interface AuthContext {
  sessionId: string;
  jti: string;
  tenantId: string;
  userId: string;
  role: UserRole;
  candidateId: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (permission: Permission) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
