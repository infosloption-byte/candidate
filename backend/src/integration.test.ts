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
  interviewerB: 'qa-interviewer-b-' + suffix + '@buildhire.local',
  interviewee: 'qa-interviewee-' + suffix + '@buildhire.local',
};

let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let prisma: ReturnType<typeof getPrisma> | null = null;
let agencyAId = '';
let agencyBId = '';
let adminId = '';
let agencyAUserId = '';
let agencyBUserId = '';
let interviewerId = '';
let interviewerBId = '';
let candidateUserId = '';
let jobAId = '';
let jobBId = '';
let candidateId = '';
let interviewId = '';
let criterionAId = '';
let criterionBId = '';

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
    const interviewerB = await tx.user.create({ data: { agencyId: agencyA.id, name: 'QA Interviewer B', email: emails.interviewerB, passwordHash, role: 'INTERVIEWER' } });

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
        status: 'POOL',
        statusHistory: {
          create: { fromStatus: null, toStatus: 'POOL', reason: 'Candidate added to the candidate pool.', changedById: admin.id },
        },
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
      data: { agencyId: agencyA.id, title: 'QA Mason A', description: 'Agency A position', openings: 2, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const jobB = await tx.job.create({
      data: { agencyId: agencyB.id, title: 'QA Mason B', description: 'Agency B position', openings: 2, status: 'PUBLISHED', publishedAt: new Date() },
    });

    const criterionA = await tx.interviewCriterion.create({
      data: { agencyId: agencyA.id, name: 'Technical skill', description: 'Technical ability', maxPoints: 10, active: true },
    });
    const criterionB = await tx.interviewCriterion.create({
      data: { agencyId: agencyA.id, name: 'Communication', description: 'Communication and teamwork', maxPoints: 5, active: true },
    });

    return { agencyA, agencyB, admin, agencyAUser, agencyBUser, interviewer, interviewerB, candidateUser, candidate, jobA, jobB, criterionA, criterionB };
  });

  agencyAId = setup.agencyA.id;
  agencyBId = setup.agencyB.id;
  adminId = setup.admin.id;
  agencyAUserId = setup.agencyAUser.id;
  agencyBUserId = setup.agencyBUser.id;
  interviewerId = setup.interviewer.id;
  interviewerBId = setup.interviewerB.id;
  candidateUserId = setup.candidateUser.id;
  candidateId = setup.candidate.id;
  jobAId = setup.jobA.id;
  jobBId = setup.jobB.id;
  criterionAId = setup.criterionA.id;
  criterionBId = setup.criterionB.id;
});

after(async () => {
  if (!enabled || !prisma) return;

  await prisma.session.deleteMany({
    where: { userId: { in: [adminId, agencyAUserId, agencyBUserId, interviewerId, interviewerBId, candidateUserId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [adminId, agencyAUserId, agencyBUserId, interviewerId, interviewerBId, candidateUserId] } },
  });
  await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } });
  if (app) await app.close();
});

dbTest('admin and agency boundaries support candidate-pool operations', async () => {
  assert.ok(app);

  const unauthenticated = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
  assert.equal(unauthenticated.statusCode, 401);

  const agencyCookie = await login(emails.agencyA);
  const ownCandidates = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates',
    headers: { cookie: agencyCookie },
  });
  assert.equal(ownCandidates.statusCode, 200);
  const ownCandidatesBody = json<{ data: Array<{ agencyId: string; status: string }> }>(ownCandidates);
  assert.deepEqual(new Set(ownCandidatesBody.data.map((item) => item.agencyId)), new Set([agencyAId]));
  assert.equal(ownCandidatesBody.data[0]?.status, 'POOL');

  const crossAgencyUsers = await app.inject({
    method: 'GET',
    url: '/api/v1/agencies/' + agencyBId + '/users',
    headers: { cookie: agencyCookie },
  });
  assert.equal(crossAgencyUsers.statusCode, 403);

  const adminCookie = await login(emails.admin);
  const allCandidates = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates',
    headers: { cookie: adminCookie },
  });
  assert.equal(allCandidates.statusCode, 200);

  const adminJobs = await app.inject({
    method: 'GET',
    url: '/api/v1/jobs',
    headers: { cookie: adminCookie },
  });
  assert.equal(adminJobs.statusCode, 200);
  const adminJobsBody = json<{ data: Array<{ agencyId: string }> }>(adminJobs);
  assert.ok(new Set(adminJobsBody.data.map((item) => item.agencyId)).has(agencyAId));
  assert.ok(new Set(adminJobsBody.data.map((item) => item.agencyId)).has(agencyBId));

  const adminUsers = await app.inject({
    method: 'GET',
    url: '/api/v1/agencies/' + agencyBId + '/users',
    headers: { cookie: adminCookie },
  });
  assert.equal(adminUsers.statusCode, 200);

  const adminCreatesForAgency = await app.inject({
    method: 'POST',
    url: '/api/v1/agencies/' + agencyBId + '/candidates',
    headers: { cookie: adminCookie },
    payload: {
      name: 'Admin Added Candidate',
      email: 'admin-added-' + suffix + '@buildhire.local',
      profession: 'Welder',
      experienceYears: 3,
      skills: ['Welding'],
    },
  });
  assert.equal(adminCreatesForAgency.statusCode, 201);
  const adminCreatedBody = json<{ data: { agencyId: string; status: string } }>(adminCreatesForAgency);
  assert.equal(adminCreatedBody.data.agencyId, agencyBId);
  assert.equal(adminCreatedBody.data.status, 'POOL');

  const interviewerCookie = await login(emails.interviewer);
  const interviewerCandidates = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates',
    headers: { cookie: interviewerCookie },
  });
  assert.equal(interviewerCandidates.statusCode, 403);
});

dbTest('candidate can be assigned directly to interview, scored, finalized, and viewed in history', async () => {
  assert.ok(app);

  const agencyCookie = await login(emails.agencyA);
  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const interviewResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/candidates/' + candidateId + '/interviews',
    headers: { cookie: agencyCookie },
    payload: {
      jobId: jobAId,
      type: 'TECHNICAL',
      scheduledAt,
      durationMins: 45,
      location: 'QA Room',
      interviewerIds: [interviewerId],
    },
  });
  assert.equal(interviewResponse.statusCode, 201);
  const interviewBody = json<{ data: { id: string; candidate: { id: string; status: string } } }>(interviewResponse);
  interviewId = interviewBody.data.id;
  assert.equal(interviewBody.data.candidate.id, candidateId);
  assert.equal(interviewBody.data.candidate.status, 'INTERVIEW_SCHEDULED');

  const duplicateTimeConflict = await app.inject({
    method: 'POST',
    url: '/api/v1/candidates/' + candidateId + '/interviews',
    headers: { cookie: agencyCookie },
    payload: {
      jobId: jobAId,
      type: 'FINAL',
      scheduledAt,
      durationMins: 30,
      location: 'QA Room 2',
      interviewerIds: [interviewerId],
    },
  });
  assert.equal(duplicateTimeConflict.statusCode, 409);

  const rescheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const rescheduleResponse = await app.inject({
    method: 'PATCH',
    url: '/api/v1/interviews/' + interviewId,
    headers: { cookie: agencyCookie },
    payload: {
      scheduledAt: rescheduledAt,
      durationMins: 60,
      location: 'QA Rescheduled Room',
      interviewerIds: [interviewerId],
    },
  });
  assert.equal(rescheduleResponse.statusCode, 200);

  const crossAgencySchedule = await app.inject({
    method: 'POST',
    url: '/api/v1/candidates/' + candidateId + '/interviews',
    headers: { cookie: await login(emails.agencyB) },
    payload: {
      jobId: jobBId,
      type: 'SCREENING',
      scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      durationMins: 30,
      location: 'Other agency',
      interviewerIds: [interviewerId],
    },
  });
  assert.equal(crossAgencySchedule.statusCode, 403);

  const outsiderCookie = await login(emails.interviewerB);
  const outsiderEvaluation = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interviewId + '/evaluations',
    headers: { cookie: outsiderCookie },
    payload: {
      scores: [
        { criterionId: criterionAId, points: 8 },
        { criterionId: criterionBId, points: 4 },
      ],
      comments: 'Not a panel member.',
    },
  });
  assert.equal(outsiderEvaluation.statusCode, 403);

  const interviewerCookie = await login(emails.interviewer);
  const evaluationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interviewId + '/evaluations',
    headers: { cookie: interviewerCookie },
    payload: {
      scores: [
        { criterionId: criterionAId, points: 9 },
        { criterionId: criterionBId, points: 4 },
      ],
      comments: 'Meets the required technical and communication criteria.',
    },
  });
  assert.equal(evaluationResponse.statusCode, 201);
  const evaluationBody = json<{ data: { interviewCompleted: boolean; summary: { totalPoints: number; maxPoints: number; averagePercentage: number | null } } }>(evaluationResponse);
  assert.equal(evaluationBody.data.interviewCompleted, true);
  assert.equal(evaluationBody.data.summary.totalPoints, 13);
  assert.equal(evaluationBody.data.summary.maxPoints, 15);

  const candidateAfterEvaluation = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates/' + candidateId,
    headers: { cookie: agencyCookie },
  });
  assert.equal(candidateAfterEvaluation.statusCode, 200);
  const candidateBody = json<{ data: { status: string } }>(candidateAfterEvaluation);
  assert.equal(candidateBody.data.status, 'INTERVIEW_COMPLETED');

  const secondInterviewResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/candidates/' + candidateId + '/interviews',
    headers: { cookie: agencyCookie },
    payload: {
      jobId: jobAId,
      type: 'FINAL',
      scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      durationMins: 30,
      location: 'QA Final Room',
      interviewerIds: [interviewerId],
    },
  });
  assert.equal(secondInterviewResponse.statusCode, 201);
  const blockedFinalDecision = await app.inject({
    method: 'PATCH',
    url: '/api/v1/candidates/' + candidateId,
    headers: { cookie: agencyCookie },
    payload: { status: 'PASSED', statusReason: 'Should be blocked while another interview is scheduled.' },
  });
  assert.equal(blockedFinalDecision.statusCode, 409);

  const cancelSecondInterview = json<{ data: { id: string } }>(secondInterviewResponse);
  const cancelled = await app.inject({
    method: 'PATCH',
    url: '/api/v1/interviews/' + cancelSecondInterview.data.id,
    headers: { cookie: agencyCookie },
    payload: { status: 'CANCELLED' },
  });
  assert.equal(cancelled.statusCode, 200);

  const candidateProfileUpdate = await app.inject({
    method: 'PATCH',
    url: '/api/v1/candidates/' + candidateId,
    headers: { cookie: await login(emails.admin) },
    payload: {
      name: 'QA Candidate Updated',
      email: 'qa-interviewee-updated-' + suffix + '@buildhire.local',
      profession: 'Senior Mason',
      experienceYears: 6,
      skills: ['Masonry', 'Finishing'],
    },
  });
  assert.equal(candidateProfileUpdate.statusCode, 200);

  const updatedIntervieweeLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'qa-interviewee-updated-' + suffix + '@buildhire.local', password },
  });
  assert.equal(updatedIntervieweeLogin.statusCode, 200);

  const finalDecision = await app.inject({
    method: 'PATCH',
    url: '/api/v1/candidates/' + candidateId,
    headers: { cookie: agencyCookie },
    payload: { status: 'PASSED', statusReason: 'Passed technical interview.' },
  });
  assert.equal(finalDecision.statusCode, 200);
  const finalDecisionBody = json<{ data: { status: string } }>(finalDecision);
  assert.equal(finalDecisionBody.data.status, 'PASSED');

  const historyResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates/' + candidateId + '/history',
    headers: { cookie: adminCookieForTest(await login(emails.admin)) },
  });
  assert.equal(historyResponse.statusCode, 200);
  const historyBody = json<{ data: { statusHistory: Array<{ toStatus: string }>; interviews: Array<{ id: string; evaluations: Array<{ scores: Array<{ points: number }> }> }> } }>(historyResponse);
  assert.ok(historyBody.data.statusHistory.some((item) => item.toStatus === 'INTERVIEW_SCHEDULED'));
  assert.ok(historyBody.data.statusHistory.some((item) => item.toStatus === 'INTERVIEW_COMPLETED'));
  assert.ok(historyBody.data.statusHistory.some((item) => item.toStatus === 'PASSED'));
  assert.ok(historyBody.data.interviews.some((item) => item.id === interviewId && item.evaluations.some((evaluation) => evaluation.scores.length === 2)));

  const candidateUserCookie = await login('qa-interviewee-updated-' + suffix + '@buildhire.local');
  const candidateJobAccess = await app.inject({
    method: 'GET',
    url: '/api/v1/jobs',
    headers: { cookie: candidateUserCookie },
  });
  assert.equal(candidateJobAccess.statusCode, 403);

  const candidateHistoryAccess = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates/' + candidateId + '/history',
    headers: { cookie: candidateUserCookie },
  });
  assert.equal(candidateHistoryAccess.statusCode, 403);
});

const adminCookieForTest = (cookie: string): string => cookie;
