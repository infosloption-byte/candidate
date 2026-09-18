import { AppError } from "../errors/AppError.js";
import type { AuthContext } from "../types/fastify.js";

export const requireAuth = (auth: AuthContext | null): AuthContext => {
  if (!auth) throw AppError.unauthenticated();
  return auth;
};

export const requireCandidateOwner = (auth: AuthContext): void => {
  if (auth.role !== "CANDIDATE" || !auth.candidateId) {
    throw AppError.forbidden();
  }
};