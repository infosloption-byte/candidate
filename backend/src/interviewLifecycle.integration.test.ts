import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { hashPassword } from './lib/auth.js';
import { closeStaleInterviews } from './lib/interviewMaintenance.js';
import { getPrisma } from './lib/prisma.js';
import { buildApp } from './app.js';

const enabled = process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const dbTest = enabled
  ? test
  : ((name: string, fn: () => void | Promise<void>) => test(name, { skip: 'RUN_DB_TESTS=1 and DATABASE_URL are required.' }, fn));

const password = 'LifecyclePassword123!';
const suffix = Date.now().toString(36);
const email = (name: string): string => 'qa-life-' + name + '-' + suffix + '@buildhire.local';

let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let prisma: ReturnType<typeof getPrisma> | null = null;
let companyId = '';
let agencyId = '';
let candidateId = '';
const userIds: string[] = [];
let interviewerA = '';
let interviewerB = '';

const cookieFor = async (name: string): Promise<string> => {
  assert.ok(app);
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: email(name), password } });
  assert.equal(response.statusCode, 200);
  const value = response.headers['set-cookie'];
  return (Array.isArray(value) ? value[0] : value as string).split(';')[0];
};

before(async () => {
  if (!enabled) return;
  prisma = getPrisma();
  app = buildApp();
  await app.ready();
  const passwordHash = await hashPassword(password);

  const company = await prisma.company.create({ data: { name: 'QA Life ' + suffix, slug: 'qa-life-' + suffix } });
  const agency = await prisma.agency.create({ data: { companyId: company.id, name: 'QA Life Agency', slug: 'qa-life-agency-' + suffix } });
  const a = await prisma.user.create({ data: { companyId: company.id, agencyId: agency.id, name: 'Panel A', email: email('a'), passwordHash, role: 'INTERVIEWER' } });
  const b = await prisma.user.create({ data: { companyId: company.id, agencyId: agency.id, name: 'Panel B', email: email('b'), passwordHash, role: 'INTERVIEWER' } });
  const candidate = await prisma.candidate.create({
    data: {
      companyId: company.id, agencyId: agency.id, reference: 'QL-' + suffix, agencyRegisterNo: 'QL-' + suffix,
      firstName: 'Life', lastName: 'Cycle', birthdate: new Date('1990-01-15'), passportNumber: 'L' + suffix.slice(-8).toUpperCase(),
      passportExpiry: new Date('2031-01-15'), requestedProfession: 'Mason', onboardingStatus: 'COMPLETED', source: 'AGENCY_ADDED', status: 'INTERVIEW_SCHEDULED',
    },
  });
  companyId = company.id;
  agencyId = agency.id;
  candidateId = candidate.id;
  interviewerA = a.id;
  interviewerB = b.id;
  userIds.push(a.id, b.id);
});

after(async () => {
  if (!enabled || !prisma) return;
  try {
    await prisma.auditEvent.deleteMany({ where: { companyId } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.interview.deleteMany({ where: { companyId } });
    await prisma.candidate.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.agency.deleteMany({ where: { id: agencyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  } finally {
    if (app) await app.close();
    app = null;
    await prisma.$disconnect();
    prisma = null;
  }
});

dbTest('two panelists submitting at the same moment still complete the interview', async () => {
  assert.ok(prisma);
  const interview = await prisma.interview.create({
    data: {
      companyId, candidateId, type: 'TECHNICAL', status: 'IN_PROGRESS', scheduledAt: new Date(), startedAt: new Date(), durationMins: 30,
      panel: { create: [{ userId: interviewerA }, { userId: interviewerB }] },
      evaluations: { create: [
        { interviewerId: interviewerA, status: 'DRAFT', comments: 'Strong practical skills.' },
        { interviewerId: interviewerB, status: 'DRAFT', comments: 'Good communication.' },
      ] },
    },
  });

  const [cookieA, cookieB] = await Promise.all([cookieFor('a'), cookieFor('b')]);
  assert.ok(app);
  const submit = (cookie: string) => app!.inject({ method: 'POST', url: '/api/v1/interviews/' + interview.id + '/evaluation/submit', headers: { cookie } });

  const responses = await Promise.all([submit(cookieA), submit(cookieB)]);
  assert.deepEqual(responses.map((response) => response.statusCode), [201, 201]);

  const after = await prisma.interview.findUnique({ where: { id: interview.id }, select: { status: true, completedAt: true } });
  assert.equal(after?.status, 'COMPLETED');
  assert.ok(after?.completedAt);

  // A repeated submit is rejected instead of being accepted twice.
  const again = await submit(cookieA);
  assert.equal(again.statusCode, 409);
});

dbTest('interviews nobody started are closed automatically and the candidate is released', async () => {
  assert.ok(prisma);
  await prisma.candidate.update({ where: { id: candidateId }, data: { status: 'INTERVIEW_SCHEDULED' } });

  const longAgo = new Date(Date.now() - 48 * 3_600_000);
  const stale = await prisma.interview.create({
    data: { companyId, candidateId, type: 'TECHNICAL', status: 'SCHEDULED', scheduledAt: longAgo, durationMins: 30, panel: { create: [{ userId: interviewerA }] } },
  });
  const upcoming = await prisma.interview.create({
    data: { companyId, candidateId, type: 'TECHNICAL', status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 24 * 3_600_000), durationMins: 30, panel: { create: [{ userId: interviewerA }] } },
  });
  const inProgress = await prisma.interview.create({
    data: { companyId, candidateId, type: 'TECHNICAL', status: 'IN_PROGRESS', scheduledAt: longAgo, startedAt: longAgo, durationMins: 30, panel: { create: [{ userId: interviewerA }] } },
  });

  const closed = await closeStaleInterviews();
  assert.ok(closed >= 1);

  assert.equal((await prisma.interview.findUnique({ where: { id: stale.id } }))?.status, 'CANCELLED');
  assert.equal((await prisma.interview.findUnique({ where: { id: upcoming.id } }))?.status, 'SCHEDULED');
  assert.equal((await prisma.interview.findUnique({ where: { id: inProgress.id } }))?.status, 'IN_PROGRESS', 'in-progress interviews hold scorecards and are never auto-closed');
  // The upcoming interview keeps the candidate in INTERVIEW_SCHEDULED, so they are not reset.
  assert.equal((await prisma.candidate.findUnique({ where: { id: candidateId } }))?.status, 'INTERVIEW_SCHEDULED');
  assert.ok(await prisma.auditEvent.findFirst({ where: { companyId, action: 'INTERVIEW_AUTO_CLOSED', entityId: stale.id } }));
});
