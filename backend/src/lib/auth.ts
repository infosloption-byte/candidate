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

export type ActingMode = 'READ_ONLY' | 'READ_WRITE';

/** Present only while a platform administrator is working inside a company workspace. */
export interface ActingContext {
  companyId: string;
  companyName: string;
  mode: ActingMode;
  reason: string;
  until: string;
}

export interface AuthUser {
  id: string;
  companyId: string | null;
  companyName: string | null;
  agencyId: string | null;
  candidateId: string | null;
  name: string;
  email: string;
  role: 'ADMIN' | 'COMPANY_ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE';
  active: boolean;
  /** Set only for a platform ADMIN acting inside a company. While set, `role` is COMPANY_ADMIN. */
  actingAs?: ActingContext | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null;
  }
  interface FastifyContextConfig {
    /** Route stays usable in READ_ONLY acting mode (enter/exit endpoints). */
    actingExempt?: boolean;
  }
}

export const ACTING_DEFAULT_MINUTES = 60;
export const ACTING_MAX_MINUTES = 240;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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
    if (key === name) {
      try {
        return decodeURIComponent(value.join('='));
      } catch {
        return null; // malformed cookie -> treat as "no session" instead of a 500
      }
    }
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

type SessionActingFields = {
  id: string;
  actingCompanyId: string | null;
  actingMode: ActingMode | null;
  actingReason: string | null;
  actingUntil: Date | null;
};

const clearActingFields = { actingCompanyId: null, actingMode: null, actingReason: null, actingUntil: null } as const;

/** Returns the live acting context, or clears an expired/invalid one and returns null. */
const resolveActingContext = async (session: SessionActingFields): Promise<ActingContext | null> => {
  if (session.actingCompanyId && session.actingMode && session.actingUntil && session.actingUntil.getTime() > Date.now()) {
    const company = await getPrisma().company.findUnique({
      where: { id: session.actingCompanyId },
      select: { id: true, name: true, status: true },
    });
    if (company && company.status === 'ACTIVE') {
      return {
        companyId: company.id,
        companyName: company.name,
        mode: session.actingMode,
        reason: session.actingReason ?? '',
        until: session.actingUntil.toISOString(),
      };
    }
  }

  await getPrisma().session.updateMany({ where: { id: session.id }, data: clearActingFields });
  return null;
};

export const startActing = async (
  request: FastifyRequest,
  data: { companyId: string; mode: ActingMode; reason: string; minutes: number },
): Promise<boolean> => {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token) return false;
  const result = await getPrisma().session.updateMany({
    where: { tokenHash: hashSessionToken(token) },
    data: {
      actingCompanyId: data.companyId,
      actingMode: data.mode,
      actingReason: data.reason,
      actingUntil: new Date(Date.now() + data.minutes * 60_000),
    },
  });
  return result.count > 0;
};

export const stopActing = async (request: FastifyRequest): Promise<void> => {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token) return;
  await getPrisma().session.updateMany({ where: { tokenHash: hashSessionToken(token) }, data: clearActingFields });
};

export const getSessionUser = async (request: FastifyRequest): Promise<AuthUser | null> => {
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token) return null;

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        include: {
          company: { select: { id: true, name: true, status: true } },
          agency: { select: { status: true } },
          candidate: { select: { agency: { select: { status: true } } } },
        },
      },
    },
  });

  if (!session) return null;

  const agencyStatus = session.user.agency?.status
    ?? session.user.candidate?.agency.status
    ?? null;
  const companyStatus = session.user.company?.status ?? null;

  const platformAdmin = session.user.role === 'ADMIN';
  const globalInterviewer = session.user.role === 'INTERVIEWER' && session.user.agencyId === null;

  if (
    session.expiresAt.getTime() <= Date.now()
    || !session.user.active
    || (session.user.companyId !== null && companyStatus !== 'ACTIVE')
    || (!platformAdmin && !globalInterviewer && session.user.role !== 'COMPANY_ADMIN' && agencyStatus !== 'ACTIVE')
  ) {
    await getPrisma().session.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (platformAdmin && session.actingCompanyId) {
    const acting = await resolveActingContext(session);
    if (acting) {
      return {
        id: session.user.id,
        companyId: acting.companyId,
        companyName: acting.companyName,
        agencyId: null,
        candidateId: null,
        name: session.user.name,
        email: session.user.email,
        // The admin is deliberately downgraded to a company administrator of the target company, so
        // every existing company/agency scoping rule applies to them unchanged.
        role: 'COMPANY_ADMIN',
        active: session.user.active,
        actingAs: acting,
      };
    }
  }

  return {
    id: session.user.id,
    companyId: session.user.companyId,
    companyName: session.user.company?.name ?? null,
    agencyId: session.user.agencyId,
    candidateId: session.user.candidateId,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    active: session.user.active,
  };
};

const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined> => {
  request.authUser = await getSessionUser(request);

  if (!request.authUser) {
    return reply.code(401).send({
      success: false,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' },
    });
  }

  const acting = request.authUser.actingAs;
  if (acting && acting.mode === 'READ_ONLY' && !SAFE_METHODS.has(request.method) && !request.routeOptions.config?.actingExempt) {
    return reply.code(403).send({
      success: false,
      error: { code: 'ACTING_READ_ONLY', message: 'You are viewing this workspace in read-only support mode. Re-enter it in write mode to make changes.' },
    });
  }
};

export const requireAuth: preHandlerHookHandler = async (request, reply) => authenticate(request, reply);

/**
 * Authentication for every route that touches tenant data (candidates, jobs, interviews, documents,
 * criteria). A platform ADMIN has no company of their own, so they must first "act as" a company;
 * while doing so they arrive here as a COMPANY_ADMIN of that company only.
 */
export const requireTenantAuth: preHandlerHookHandler = async (request, reply) => {
  const denied = await authenticate(request, reply);
  if (denied) return denied;

  if (request.authUser!.role === 'ADMIN') {
    return reply.code(403).send({
      success: false,
      error: { code: 'COMPANY_CONTEXT_REQUIRED', message: 'Enter a company workspace before accessing its data.' },
    });
  }
};

/** Use inside handlers for actions a platform admin must never perform on a tenant's behalf. */
export const denyWhileActing = (request: FastifyRequest, reply: FastifyReply, message: string): FastifyReply | null => {
  if (!request.authUser?.actingAs) return null;
  return reply.code(403).send({ success: false, error: { code: 'ACTING_ACTION_BLOCKED', message } });
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

  if (!request.authUser) {
    return reply.code(403).send({
      success: false,
      error: { code: 'AGENCY_ACCESS_DENIED', message: 'You do not have access to this agency.' },
    });
  }

  if (request.authUser.role === 'ADMIN') return;

  if (request.authUser.role === 'COMPANY_ADMIN') {
    const agency = await getPrisma().agency.findUnique({
      where: { id: agencyId },
      select: { companyId: true },
    });
    if (!agency || agency.companyId !== request.authUser.companyId) {
      return reply.code(403).send({
        success: false,
        error: { code: 'AGENCY_ACCESS_DENIED', message: 'You do not have access to this agency.' },
      });
    }
    return;
  }

  if (request.authUser.agencyId !== agencyId) {
    return reply.code(403).send({
      success: false,
      error: { code: 'AGENCY_ACCESS_DENIED', message: 'You do not have access to this agency.' },
    });
  }
};

export { clearSessionCookie, getCookie, SESSION_TTL_MS };
