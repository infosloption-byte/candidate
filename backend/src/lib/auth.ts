import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { getPrisma } from './prisma.js';
import { env } from '../config/env.js';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_PREFIX = 'scrypt';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_NAME = 'buildhire_session';

export interface AuthUser {
  id: string;
  agencyId: string | null;
  candidateId: string | null;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE';
  active: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null;
  }
}

export const toPublicUser = (user: AuthUser): AuthUser => ({ ...user });

export const hashPassword = async (password: string): Promise<string> => {
  if (password.length < 8) throw new Error('Password must be at least 8 characters long.');

  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return [PASSWORD_PREFIX, salt, derived.toString('hex')].join('$');
};

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [prefix, salt, hash] = storedHash.split('$');
  if (prefix !== PASSWORD_PREFIX || !salt || !hash) return false;

  try {
    const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
};

const hashSessionToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const getCookie = (request: FastifyRequest, name: string): string | null => {
  const header = request.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }

  return null;
};

const setSessionCookie = (reply: FastifyReply, token: string, maxAgeSeconds: number): void => {
  const secure = env.nodeEnv === 'production' ? '; Secure' : '';
  reply.header(
    'set-cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`,
  );
};

const clearSessionCookie = (reply: FastifyReply): void => {
  const secure = env.nodeEnv === 'production' ? '; Secure' : '';
  reply.header(
    'set-cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
  );
};

export const createSession = async (userId: string, reply: FastifyReply): Promise<void> => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getPrisma().session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  setSessionCookie(reply, token, Math.floor(SESSION_TTL_MS / 1000));
};

export const destroySession = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (token) {
    await getPrisma().session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  clearSessionCookie(reply);
};

export const getSessionUser = async (request: FastifyRequest): Promise<AuthUser | null> => {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token) return null;

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        include: {
          agency: { select: { status: true } },
          candidate: { select: { agency: { select: { status: true } } } },
        },
      },
    },
  });

  if (!session) return null;

  const agencyStatus = session.user.agency?.status
    ?? session.user.candidate?.agency.status
    ?? (session.user.role === 'ADMIN' ? 'ACTIVE' : null);

  const globalInterviewer = session.user.role === 'INTERVIEWER' && session.user.agencyId === null;

  if (
    session.expiresAt.getTime() <= Date.now()
    || !session.user.active
    || (!globalInterviewer && session.user.role !== 'ADMIN' && agencyStatus !== 'ACTIVE')
  ) {
    await getPrisma().session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.user.id,
    agencyId: session.user.agencyId,
    candidateId: session.user.candidateId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    active: session.user.active,
  };
};

export const requireAuth: preHandlerHookHandler = async (request, reply) => {
  request.authUser = await getSessionUser(request);

  if (!request.authUser) {
    return reply.code(401).send({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' },
    });
  }
};

export const requireRole = (...roles: AuthUser['role'][]): preHandlerHookHandler => async (request, reply) => {
  if (!request.authUser || !roles.includes(request.authUser.role)) {
    return reply.code(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You do not have access to this resource.' },
    });
  }
};

export const requireAgencyAccess = (paramName = 'agencyId'): preHandlerHookHandler => async (request, reply) => {
  const agencyId = (request.params as Record<string, string>)[paramName];

  if (!request.authUser || (request.authUser.role !== 'ADMIN' && request.authUser.agencyId !== agencyId)) {
    return reply.code(403).send({
      success: false,
      error: { code: 'AGENCY_ACCESS_DENIED', message: 'You do not have access to this agency.' },
    });
  }
};

export { clearSessionCookie, getCookie, SESSION_TTL_MS };
