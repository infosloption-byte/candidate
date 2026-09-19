import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "../generated/prisma/enums.js";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { createOpaqueToken, sha256 } from "../lib/crypto.js";
import { withTransaction } from "../lib/db.js";
import { findActiveUserById, findActiveUserWithTenantByEmail } from "../repositories/userRepository.js";
import { createSession, revokeSession } from "../repositories/sessionRepository.js";
import { createAuditEvent } from "../repositories/auditRepository.js";
import { roleToFrontend } from "../auth/permissions.js";
import type { AuthContext } from "../types/fastify.js";

const jwtKey = new TextEncoder().encode(env.jwtSecret);

export interface AuthUserDto {
  id: string;
  name: string;
  email?: string;
  role: ReturnType<typeof roleToFrontend>;
  candidateId?: string;
}

export interface AuthSessionDto {
  user: AuthUserDto;
  sessionExpiresAt: string;
}

interface JwtClaims {
  sub: string;
  tenantId: string;
  role: UserRole;
  jti: string;
}

const asJwtClaims = (payload: Record<string, unknown>): JwtClaims | null => {
  const { sub, tenantId, role, jti } = payload;
  if (
    typeof sub !== "string" ||
    typeof tenantId !== "string" ||
    typeof jti !== "string" ||
    !["SYSTEM_ADMIN", "RECRUITER", "INTERVIEWER", "MANAGER", "CANDIDATE"].includes(role as string)
  ) {
    return null;
  }
  return { sub, tenantId, role: role as UserRole, jti };
};

export const login = async (
  emailInput: string,
  password: string,
): Promise<{ session: AuthSessionDto; accessToken: string; csrfToken: string }> => {
  const email = emailInput.trim().toLowerCase();
  const user = await findActiveUserWithTenantByEmail(email);

  if (!user || !user.active || !user.tenant.active) {
    throw AppError.unauthenticated("Invalid email or password.");
  }

  const validPassword = await argon2.verify(user.passwordHash, password);
  if (!validPassword) {
    throw AppError.unauthenticated("Invalid email or password.");
  }

  const jti = createOpaqueToken(24);
  const csrfToken = createOpaqueToken(32);
  const expiresAt = new Date(Date.now() + env.sessionTtlSeconds * 1000);

  const accessToken = await new SignJWT({
    tenantId: user.tenantId,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(env.jwtIssuer)
    .setAudience(env.jwtAudience)
    .setJti(jti)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(jwtKey);

  await withTransaction(async (tx) => {
    await createSession({
      tenantId: user.tenantId,
      userId: user.id,
      jti,
      csrfHash: sha256(csrfToken),
      expiresAt,
    }, tx);

    await createAuditEvent({
      tenantId: user.tenantId,
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "auth.login",
      metadata: { role: user.role },
    }, tx);
  });

  return {
    accessToken,
    csrfToken,
    session: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleToFrontend(user.role),
      },
      sessionExpiresAt: expiresAt.toISOString(),
    },
  };
};

export const authenticateToken = async (token: string): Promise<AuthContext> => {
  try {
    const verified = await jwtVerify(token, jwtKey, {
      issuer: env.jwtIssuer,
      audience: env.jwtAudience,
      algorithms: ["HS256"],
    });

    const claims = asJwtClaims(verified.payload);
    if (!claims) throw AppError.unauthenticated();

    const session = await findActiveSession(claims.tenantId, claims.sub, claims.jti);
    if (!session) throw AppError.unauthenticated();

    const user = await findActiveUserById(claims.tenantId, claims.sub);
    if (!user || user.role !== claims.role) throw AppError.unauthenticated();

    return {
      sessionId: session.id,
      jti: claims.jti,
      tenantId: claims.tenantId,
      userId: user.id,
      role: user.role,
      candidateId: null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.unauthenticated();
  }
};

export const logout = async (auth: AuthContext): Promise<void> => {
  await revokeSession(auth.tenantId, auth.userId, auth.jti);
  await createAuditEvent({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "User",
    entityId: auth.userId,
    action: "auth.logout",
    metadata: {},
  });
};

export const currentUser = async (auth: AuthContext): Promise<{ user: AuthUserDto; sessionExpiresAt: string }> => {
  const user = await findActiveUserById(auth.tenantId, auth.userId);
  if (!user) throw AppError.unauthenticated();

  const session = await findActiveSession(auth.tenantId, auth.userId, auth.jti);
  if (!session) throw AppError.unauthenticated();

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleToFrontend(user.role),
    },
    sessionExpiresAt: session.expiresAt.toISOString(),
  };
};