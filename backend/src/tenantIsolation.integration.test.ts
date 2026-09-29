import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { hashPassword } from './lib/auth.js';
import { getPrisma } from './lib/prisma.js';
import { buildApp } from './app.js';

const enabled = process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const dbTest = enabled
  ? test
  : ((name: string, fn: () => void | Promise<void>) => test(name, { skip: 'RUN_DB_TESTS=1 and DATABASE_URL are required.' }, fn));

const password = 'TenantIsolationPassword123!';
const suffix = Date.now().toString(36);
const email = (name: string): string => 'qa-tenant-' + name + '-' + suffix + '@buildhire.local';

let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let prisma: ReturnType<typeof getPrisma> | null = null;
const ids = { userIds: [] as string[], agencyIds: [] as string[], companyIds: [] as string[] } as {
  userIds: string[]; agencyIds: string[]; companyIds: string[];
  companyA: string; companyB: string; agencyA: string; agencyB: string;
  agencyUserA: string; candidateA: string; candidateB: string; jobA: string; jobB: string;
};

const inject = async (cookie: string | null, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: unknown) => {
  assert.ok(app);
  return app.inject({ method, url: '/api/v1' + url, headers: cookie ? { cookie } : {}, payload: payload as never });
};
const login = async (who: string): Promise<string> => {
  assert.ok(app);
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: email(who), password } });
  assert.equal(response.statusCode, 200);
  const value = response.headers['set-cookie'];
  return (Array.isArray(value) ? value[0] : value as string).split(';')[0];
};
const body = <T>(response: { body: string }): T => JSON.parse(response.body) as T;
const denied = (status: number): boolean => status === 403 || status === 404;

before(async () => {
  if (!enabled) return;
  prisma = getPrisma();
  app = buildApp();
  await app.ready();
  const passwordHash = await hashPassword(password);

  const mk = async (tag: string) => {
    const company = await prisma!.company.create({ data: { name: 'QA Tenant ' + tag + ' ' + suffix, slug: 'qa-tenant-' + tag.toLowerCase() + '-' + suffix } });
    const agency = await prisma!.agency.create({ data: { companyId: company.id, name: 'QA Agency ' + tag, slug: 'qa-agency-' + tag.toLowerCase() + '-' + suffix } });
    const companyAdmin = await prisma!.user.create({ data: { companyId: company.id, name: 'Admin ' + tag, email: email('admin-' + tag.toLowerCase()), passwordHash, role: 'COMPANY_ADMIN' } });
    const agencyUser = await prisma!.user.create({ data: { companyId: company.id, agencyId: agency.id, name: 'Agency ' + tag, email: email('agency-' + tag.toLowerCase()), passwordHash, role: 'AGENCY' } });
    const candidate = await prisma!.candidate.create({
      data: {
        companyId: company.id, agencyId: agency.id, reference: 'QT-' + tag + suffix, agencyRegisterNo: 'QT-' + tag + '-' + suffix,
        firstName: 'Cand', lastName: tag, birthdate: new Date('1990-01-15'), passportNumber: 'Q' + tag + suffix.slice(-7).toUpperCase(),
        passportExpiry: new Date('2031-01-15'), requestedProfession: 'Mason', onboardingStatus: 'COMPLETED', source: 'AGENCY_ADDED', status: 'POOL',
      },
    });
    const job = await prisma!.job.create({ data: { companyId: company.id, title: 'QA Job ' + tag, description: 'Position ' + tag, openings: 2, status: 'PUBLISHED', publishedAt: new Date() } });
    ids.userIds.push(companyAdmin.id, agencyUser.id);
    ids.agencyIds.push(agency.id);
    ids.companyIds.push(company.id);
    return { company, agency, agencyUser, candidate, job };
  };

  const a = await mk('A');
  const b = await mk('B');
  const platform = await prisma.user.create({ data: { companyId: null, name: 'Platform Admin', email: email('platform'), passwordHash, role: 'ADMIN' } });
  ids.userIds.push(platform.id);
  Object.assign(ids, {
    companyA: a.company.id, companyB: b.company.id, agencyA: a.agency.id, agencyB: b.agency.id, agencyUserA: a.agencyUser.id,
    candidateA: a.candidate.id, candidateB: b.candidate.id, jobA: a.job.id, jobB: b.job.id,
  });
});

after(async () => {
  if (!enabled || !prisma) return;
  try {
    await prisma.auditEvent.deleteMany({ where: { OR: [{ companyId: { in: ids.companyIds } }, { actorId: { in: ids.userIds } }] } });
    await prisma.session.deleteMany({ where: { userId: { in: ids.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
    await prisma.agency.deleteMany({ where: { id: { in: ids.agencyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: ids.companyIds } } });
  } finally {
    if (app) await app.close();
    app = null;
    await prisma.$disconnect();
    prisma = null;
  }
});

dbTest('company B cannot read or change company A data by guessing ids', async () => {
  const cookie = await login('admin-b');

  for (const [method, url, payload] of [
    ['GET', '/candidates/' + ids.candidateA],
    ['GET', '/candidates/' + ids.candidateA + '/history'],
    ['GET', '/candidates/' + ids.candidateA + '/documents'],
    ['PATCH', '/candidates/' + ids.candidateA, { status: 'REJECTED' }],
    ['GET', '/jobs/' + ids.jobA],
    ['PATCH', '/jobs/' + ids.jobA, { title: 'Hijacked' }],
    ['DELETE', '/jobs/' + ids.jobA],
    ['DELETE', '/jobs/' + ids.jobA + '/permanent'],
    ['POST', '/jobs/' + ids.jobA + '/candidates', { candidateIds: [ids.candidateB] }],
    ['POST', '/jobs/' + ids.jobB + '/candidates', { candidateIds: [ids.candidateA] }],
  ] as Array<['GET' | 'POST' | 'PATCH' | 'DELETE', string, unknown?]>) {
    const response = await inject(cookie, method, url, payload);
    assert.ok(denied(response.statusCode), method + ' ' + url + ' should be denied, got ' + response.statusCode);
  }

  const jobA = await prisma!.job.findUnique({ where: { id: ids.jobA } });
  assert.equal(jobA?.title, 'QA Job A');

  const candidates = body<{ data: Array<{ companyId: string }> }>(await inject(cookie, 'GET', '/candidates')).data;
  assert.ok(candidates.length > 0 && candidates.every((item) => item.companyId === ids.companyB));
  const jobs = body<{ data: Array<{ companyId: string }> }>(await inject(cookie, 'GET', '/jobs')).data;
  assert.ok(jobs.length > 0 && jobs.every((item) => item.companyId === ids.companyB));
  const interviews = await inject(cookie, 'GET', '/interviews');
  assert.equal(interviews.statusCode, 200);
  assert.ok(body<{ data: Array<{ companyId: string }> }>(interviews).data.every((item) => item.companyId === ids.companyB));
});

dbTest('a platform admin without a company workspace cannot reach tenant data', async () => {
  const cookie = await login('platform');
  for (const url of ['/candidates', '/jobs', '/interviews', '/interview-criteria', '/candidates/' + ids.candidateA]) {
    const response = await inject(cookie, 'GET', url);
    assert.equal(response.statusCode, 403, url);
    assert.equal(body<{ error: { code: string } }>(response).error.code, 'COMPANY_CONTEXT_REQUIRED');
  }
});

dbTest('act-as: read-only workspace is scoped to one company, audited, and ends cleanly', async () => {
  const cookie = await login('platform');

  assert.equal((await inject(cookie, 'POST', '/admin/act-as/' + ids.companyA, {})).statusCode, 400, 'reason is required');
  assert.equal((await inject(cookie, 'POST', '/admin/act-as/does-not-exist', { reason: 'Support ticket 1234' })).statusCode, 404);

  const entered = await inject(cookie, 'POST', '/admin/act-as/' + ids.companyA, { reason: 'Support ticket 1234' });
  assert.equal(entered.statusCode, 200);
  const user = body<{ data: { user: { role: string; companyId: string; actingAs: { mode: string; companyId: string } } } }>(entered).data.user;
  assert.equal(user.role, 'COMPANY_ADMIN');
  assert.equal(user.companyId, ids.companyA);
  assert.equal(user.actingAs.mode, 'READ_ONLY');

  const jobs = body<{ data: Array<{ companyId: string }> }>(await inject(cookie, 'GET', '/jobs')).data;
  assert.ok(jobs.length > 0 && jobs.every((item) => item.companyId === ids.companyA));
  assert.ok(denied((await inject(cookie, 'GET', '/candidates/' + ids.candidateB)).statusCode), 'other companies stay invisible');

  const write = await inject(cookie, 'PATCH', '/jobs/' + ids.jobA, { title: 'Nope' });
  assert.equal(write.statusCode, 403);
  assert.equal(body<{ error: { code: string } }>(write).error.code, 'ACTING_READ_ONLY');

  assert.equal((await inject(cookie, 'POST', '/admin/act-as/' + ids.companyB, { reason: 'Switch without leaving' })).statusCode, 403, 'must leave before switching');

  const left = await inject(cookie, 'DELETE', '/admin/act-as');
  assert.equal(left.statusCode, 200);
  assert.equal(body<{ data: { user: { role: string; actingAs?: unknown } } }>(left).data.user.role, 'ADMIN');
  assert.equal((await inject(cookie, 'GET', '/jobs')).statusCode, 403);
  assert.equal((await inject(cookie, 'DELETE', '/admin/act-as')).statusCode, 409);

  const logAdmin = await login('admin-a');
  const log = body<{ data: Array<{ action: string; summary: string }> }>(await inject(logAdmin, 'GET', '/company/access-log')).data;
  assert.ok(log.some((item) => item.action === 'ADMIN_ACT_AS_STARTED' && item.summary.includes('Support ticket 1234')));
  assert.ok(log.some((item) => item.action === 'ADMIN_ACT_AS_ENDED'));
});

dbTest('act-as: write mode needs the password, is logged, and still blocks destructive actions', async () => {
  const cookie = await login('platform');

  const wrong = await inject(cookie, 'POST', '/admin/act-as/' + ids.companyA, { reason: 'Fix job title per ticket', mode: 'READ_WRITE', password: 'wrong-password' });
  assert.equal(wrong.statusCode, 403);
  assert.equal(body<{ error: { code: string } }>(wrong).error.code, 'CONFIRMATION_FAILED');

  const entered = await inject(cookie, 'POST', '/admin/act-as/' + ids.companyA, { reason: 'Fix job title per ticket', mode: 'READ_WRITE', password });
  assert.equal(entered.statusCode, 200);

  assert.equal((await inject(cookie, 'PATCH', '/jobs/' + ids.jobA, { title: 'QA Job A (fixed)' })).statusCode, 200);

  // The write is recorded against the customer's company (the hook runs just after the response).
  let logged = false;
  for (let attempt = 0; attempt < 20 && !logged; attempt += 1) {
    logged = Boolean(await prisma!.auditEvent.findFirst({ where: { companyId: ids.companyA, action: 'ADMIN_ACTING_WRITE' } }));
    if (!logged) await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(logged, 'expected an ADMIN_ACTING_WRITE audit event');

  for (const [method, url, payload] of [
    ['DELETE', '/jobs/' + ids.jobA + '/permanent'],
    ['PATCH', '/agencies/' + ids.agencyA + '/users/' + ids.agencyUserA, { password: 'NewPassword123!' }],
    ['PATCH', '/agencies/' + ids.agencyA + '/users/' + ids.agencyUserA, { email: 'takeover@buildhire.local' }],
    ['PATCH', '/auth/me', { password: 'AnotherPassword123!' }],
  ] as Array<['PATCH' | 'DELETE', string, unknown?]>) {
    const response = await inject(cookie, method, url, payload);
    assert.equal(response.statusCode, 403, method + ' ' + url);
    assert.equal(body<{ error: { code: string } }>(response).error.code, 'ACTING_ACTION_BLOCKED');
  }
  assert.ok(await prisma!.job.findUnique({ where: { id: ids.jobA } }), 'job must not have been deleted');

  await inject(cookie, 'DELETE', '/admin/act-as');
});

dbTest('act-as: an expired context silently reverts to platform-only access', async () => {
  const cookie = await login('platform');
  assert.equal((await inject(cookie, 'POST', '/admin/act-as/' + ids.companyA, { reason: 'Short lived session', durationMins: 5 })).statusCode, 200);

  await prisma!.session.updateMany({ where: { actingCompanyId: ids.companyA }, data: { actingUntil: new Date(Date.now() - 1000) } });

  const me = body<{ data: { user: { role: string; actingAs?: unknown } } }>(await inject(cookie, 'GET', '/auth/me')).data.user;
  assert.equal(me.role, 'ADMIN');
  assert.ok(!me.actingAs);
  assert.equal((await inject(cookie, 'GET', '/jobs')).statusCode, 403);
});
