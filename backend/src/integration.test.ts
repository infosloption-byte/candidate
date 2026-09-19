import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { hashPassword } from './lib/auth.js';
import { getPrisma } from './lib/prisma.js';
import { buildApp } from './app.js';

const enabled = process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const dbTest = enabled
  ? test
  : ((name: string, fn: () => unknown) => test(name, { skip: 'RUN_DB_TESTS=1 and DATABASE_URL are required.' }, fn));

const password = 'IntegrationTestPassword123!';
const suffix = Date.now().toString(36);

const emails = {
  admin: 'qa-admin-' + suffix + '@buildhire.local',
  agencyA: 'qa-agency-a-' + suffix + '@buildhire.local',
  agencyB: 'qa-agency-b-' + suffix + '@buildhire.local',
  interviewer: 'qa-interviewer-' + suffix + '@buildhire.local',
  interviewee: 'qa-interviewee-' + suffix + '@buildhire.local',
  registered: 'qa-registered-' + suffix + '@buildhire.local',
};

let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let prisma: ReturnType<typeof getPrisma> | null = null;
let agencyAId = '';
let agencyBId = '';
let adminId = '';
let agencyAUserId = '';
let agencyBUserId = '';
let interviewerId = '';
let candidateUserId = '';
let jobAId = '';
let jobBId = '';

const cookieFrom = (response: { headers: Record<string, string | string[] | undefined> }): string => {
  const value = response.headers['set-cookie'];
  const first = Array.isArray(value) ? value[0] : value;
  assert.ok(first, 'Expected a session cookie.');
  return first.split(';')[0];
};

const login = async (email: string): Promise<string> => {
  assert.ok(app);
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });
  assert.equal(response.statusCode, 200);
  return cookieFrom(response);
};

const json = <T>(response: { body: string }): T => JSON.parse(response.body) as T;

before(async () => {
  if (!enabled) return;

  prisma = getPrisma();
  app = buildApp();
  await app.ready();

  const passwordHash = await hashPassword(password);

  const setup = await prisma.$transaction(async (tx) => {
    const agencyA = await tx.agency.create({ data: { name: 'QA Agency A ' + suffix, slug: 'qa-agency-a-' + suffix } });
    const agencyB = await tx.agency.create({ data: { name: 'QA Agency B ' + suffix, slug: 'qa-agency-b-' + suffix } });

    const admin = await tx.user.create({ data: { name: 'QA Admin', email: emails.admin, passwordHash, role: 'ADMIN' } });
    const agencyAUser = await tx.user.create({ data: { agencyId: agencyA.id, name: 'QA Agency A', email: emails.agencyA, passwordHash, role: 'AGENCY' } });
    const agencyBUser = await tx.user.create({ data: { agencyId: agencyB.id, name: 'QA Agency B', email: emails.agencyB, passwordHash, role: 'AGENCY' } });
    const interviewer = await tx.user.create({ data: { agencyId: agencyA.id, name: 'QA Interviewer', email: emails.interviewer, passwordHash, role: 'INTERVIEWER' } });

    const candidate = await tx.candidate.create({
      data: {
        agencyId: agencyA.id,
        reference: 'QA-' + suffix,
        name: 'QA Candidate',
        email: emails.interviewee,
        profession: 'Mason',
        experienceYears: 5,
        skills: ['Masonry'],
        onboardingStatus: 'COMPLETED',
        source: 'AGENCY_ADDED',
      },
    });

    const candidateUser = await tx.user.create({
      data: {
        candidateId: candidate.id,
        name: candidate.name,
        email: emails.interviewee,
        passwordHash,
        role: 'INTERVIEWEE',
      },
    });

    const jobA = await tx.job.create({
      data: { agencyId: agencyA.id, title: 'QA Mason A', description: 'Agency A job', openings: 2, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const jobB = await tx.job.create({
      data: { agencyId: agencyB.id, title: 'QA Mason B', description: 'Agency B job', openings: 2, status: 'PUBLISHED', publishedAt: new Date() },
    });

    return { agencyA, agencyB, admin, agencyAUser, agencyBUser, interviewer, candidateUser, jobA, jobB };
  });

  agencyAId = setup.agencyA.id;
  agencyBId = setup.agencyB.id;
  adminId = setup.admin.id;
  agencyAUserId = setup.agencyAUser.id;
  agencyBUserId = setup.agencyBUser.id;
  interviewerId = setup.interviewer.id;
  candidateUserId = setup.candidateUser.id;
  jobAId = setup.jobA.id;
  jobBId = setup.jobB.id;
});

after(async () => {
  if (!enabled || !prisma) return;

  await prisma.session.deleteMany({
    where: { userId: { in: [adminId, agencyAUserId, agencyBUserId, interviewerId, candidateUserId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [adminId, agencyAUserId, agencyBUserId, interviewerId, candidateUserId] } },
  });
  await prisma.agency.deleteMany({
    where: { id: { in: [agencyAId, agencyBId] } },
  });
  if (app) await app.close();
});

dbTest('authentication and agency isolation protect real API boundaries', async () => {
  assert.ok(app);

  const unauthenticated = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
  assert.equal(unauthenticated.statusCode, 401);

  const agencyCookie = await login(emails.agencyA);

  const ownJobs = await app.inject({
    method: 'GET',
    url: '/api/v1/jobs',
    headers: { cookie: agencyCookie },
  });
  assert.equal(ownJobs.statusCode, 200);
  const ownJobsBody = json<{ data: Array<{ agencyId: string }> }>(ownJobs);
  assert.deepEqual(new Set(ownJobsBody.data.map((job) => job.agencyId)), new Set([agencyAId]));

  const crossAgencyUsers = await app.inject({
    method: 'GET',
    url: '/api/v1/agencies/' + agencyBId + '/users',
    headers: { cookie: agencyCookie },
  });
  assert.equal(crossAgencyUsers.statusCode, 403);

  const crossAgencyJobUpdate = await app.inject({
    method: 'PATCH',
    url: '/api/v1/jobs/' + jobBId,
    headers: { cookie: agencyCookie },
    payload: { title: 'Should not update' },
  });
  assert.equal(crossAgencyJobUpdate.statusCode, 403);
});

dbTest('candidate application to final decision works end to end', async () => {
  assert.ok(app);

  const candidateCookie = await login(emails.interviewee);
  const applicationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/jobs/' + jobAId + '/applications',
    headers: { cookie: candidateCookie },
    payload: {},
  });
  assert.equal(applicationResponse.statusCode, 201);

  const duplicateResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/jobs/' + jobAId + '/applications',
    headers: { cookie: candidateCookie },
    payload: {},
  });
  assert.equal(duplicateResponse.statusCode, 409);

  const application = json<{ data: { id: string } }>(applicationResponse);
  const agencyCookie = await login(emails.agencyA);

  for (const status of ['SCREENING', 'SHORTLISTED'] as const) {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/applications/' + application.data.id,
      headers: { cookie: agencyCookie },
      payload: { status },
    });
    assert.equal(response.statusCode, 200);
  }

  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const interviewResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/applications/' + application.data.id + '/interviews',
    headers: { cookie: agencyCookie },
    payload: {
      type: 'TECHNICAL',
      scheduledAt,
      durationMins: 45,
      location: 'QA Room',
      interviewerIds: [interviewerId],
    },
  });
  assert.equal(interviewResponse.statusCode, 201);

  const interview = json<{ data: { id: string } }>(interviewResponse);
  const interviewerCookie = await login(emails.interviewer);

  const myInterviews = await app.inject({
    method: 'GET',
    url: '/api/v1/interviews',
    headers: { cookie: interviewerCookie },
  });
  assert.equal(myInterviews.statusCode, 200);

  const evaluationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interview.data.id + '/evaluations',
    headers: { cookie: interviewerCookie },
    payload: {
      rating: 5,
      recommendation: 'RECOMMENDED',
      comments: 'Meets the job requirements.',
    },
  });
  assert.equal(evaluationResponse.statusCode, 201);

  const evaluationBody = json<{ data: { interviewCompleted: boolean; applicationStatus: string } }>(evaluationResponse);
  assert.equal(evaluationBody.data.interviewCompleted, true);
  assert.equal(evaluationBody.data.applicationStatus, 'SELECTED');
});

dbTest('interviewee registration creates a linked candidate and session', async () => {
  assert.ok(app);
  assert.ok(prisma);

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/interviewee',
    payload: {
      name: 'QA Self Registered',
      email: emails.registered,
      password,
      agencyId: agencyAId,
      phone: '0770000000',
      profession: 'Welder',
      experienceYears: 3,
      skills: ['Welding'],
    },
  });

  assert.equal(response.statusCode, 201);
  const body = json<{ data: { user: { candidateId: string; role: string } } }>(response);
  assert.equal(body.data.user.role, 'INTERVIEWEE');
  assert.ok(body.data.user.candidateId);

  const me = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { cookie: cookieFrom(response) },
  });
  assert.equal(me.statusCode, 200);
  const meBody = json<{ data: { user: { candidateId: string } } }>(me);
  assert.equal(meBody.data.user.candidateId, body.data.user.candidateId);

  await prisma.session.deleteMany({ where: { user: { email: emails.registered } } });
  await prisma.user.deleteMany({ where: { email: emails.registered } });
  await prisma.candidate.deleteMany({ where: { email: emails.registered } });
});
