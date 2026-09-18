import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { currentUser, login, logout } from "../services/authService.js";

interface LoginBody {
  email: string;
  password: string;
}

export const loginController = async (
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
): Promise<void> => {
  const result = await login(request.body.email, request.body.password);

  reply.setCookie(env.accessCookieName, result.accessToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionTtlSeconds,
  });

  reply.setCookie(env.csrfCookieName, result.csrfToken, {
    httpOnly: false,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionTtlSeconds,
  });

  reply.code(200).send({ success: true, data: result.session });
};

export const logoutController = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  if (!request.auth) throw AppError.unauthenticated();
  await logout(request.auth);
  reply.clearCookie(env.accessCookieName, { path: "/" });
  reply.clearCookie(env.csrfCookieName, { path: "/" });
  reply.code(200).send({ success: true, data: null });
};

export const currentUserController = async (request: FastifyRequest) => {
  if (!request.auth) throw AppError.unauthenticated();
  return { success: true, data: { user: await currentUser(request.auth) } };
};