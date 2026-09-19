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
  registered: 'qa-registered-' + suffix + '@buildhire.local',
  bulkA: 'qa-bulk-a-' + suffix + '@buildhire.local',
  bulkB: 'qa-bulk-b-' + suffix + '@buildhire.local',
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

    return {
      agencyA,
      agencyB,
      admin,
      agencyAUser,
      agencyBUser,
      interviewer,
      interviewerB,
      candidateUser,
      jobA,
      jobB,
    };
  });

  agencyAId = setup.agencyA.id;
  agencyBId = setup.agencyB.id;
  adminId = setup.admin.id;
  agencyAUserId = setup.agencyAUser.id;
  agencyBUserId = setup.agencyBUser.id;
  interviewerId = setup.interviewer.id;
  interviewerBId = setup.interviewerB.id;
  candidateUserId = setup.candidateUser.id;
  jobAId = setup.jobA.id;
  jobBId = setup.jobB.id;
  candidateId = setup.candidateUser.candidateId ?? '';
});

after(async () => {
  if (!enabled || !prisma) return;

  await prisma.session.deleteMany({
    where: {
      userId: {
        in: [adminId, agencyAUserId, agencyBUserId, interviewerId, interviewerBId, candidateUserId],
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [adminId, agencyAUserId, agencyBUserId, interviewerId, interviewerBId, candidateUserId],
      },
    },
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

dbTest('candidate bulk onboarding is atomic and rejects duplicates', async () => {
  assert.ok(app);
  assert.ok(prisma);

  const agencyCookie = await login(emails.agencyA);
  const beforeCount = await prisma.candidate.count({ where: { agencyId: agencyAId } });

  const csv = [
    'name,email,phone,profession,experienceYears,skills',
    'Bulk Mason A,' + emails.bulkA + ',0771111111,Mason,4,Masonry;Blockwork',
    'Bulk Mason B,' + emails.bulkB + ',0772222222,Carpenter,6,Joinery;Formwork',
  ].join('\\n');

  const importResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/agencies/' + agencyAId + '/candidates/bulk',
    headers: { cookie: agencyCookie, 'content-type': 'text/csv' },
    payload: csv,
  });
  assert.equal(importResponse.statusCode, 201);
  const importBody = json<{ data: { importedCount: number } }>(importResponse);
  assert.equal(importBody.data.importedCount, 2);

  const afterImportCount = await prisma.candidate.count({ where: { agencyId: agencyAId } });
  assert.equal(afterImportCount, beforeCount + 2);

  const invalidCsv = [
    'name,email,phone,profession,experienceYears,skills',
    'Duplicate One,' + emails.bulkB + ',0773333333,Mason,2,Masonry',
    'Duplicate Two,' + emails.bulkB + ',0774444444,Carpenter,3,Joinery',
  ].join('\\n');

  const invalidResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/agencies/' + agencyAId + '/candidates/bulk',
    headers: { cookie: agencyCookie, 'content-type': 'text/csv' },
    payload: invalidCsv,
  });
  assert.equal(invalidResponse.statusCode, 400);

  const afterRejectedImportCount = await prisma.candidate.count({ where: { agencyId: agencyAId } });
  assert.equal(afterRejectedImportCount, afterImportCount);
});

dbTest('candidate application through panel interview and evaluation reaches final decision', async () => {
  assert.ok(app);

  const candidateCookie = await login(emails.interviewee);

  const documentContent = Buffer.from('BuildHire document integration test').toString('base64');
  const documentUpload = await app.inject({
    method: 'POST',
    url: '/api/v1/candidates/' + candidateId + '/documents',
    headers: { cookie: candidateCookie },
    payload: {
      fileName: 'qa-profile.pdf',
      mimeType: 'application/pdf',
      contentBase64: documentContent,
    },
  });
  assert.equal(documentUpload.statusCode, 201);
  const uploadedDocument = json<{ data: { id: string } }>(documentUpload);

  const agencyCookie = await login(emails.agencyA);
  const agencyDocuments = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates/' + candidateId + '/documents',
    headers: { cookie: agencyCookie },
  });
  assert.equal(agencyDocuments.statusCode, 200);
  const agencyDocumentsBody = json<{ data: Array<{ id: string }> }>(agencyDocuments);
  assert.ok(agencyDocumentsBody.data.some((document) => document.id === uploadedDocument.data.id));

  const otherAgencyCookie = await login(emails.agencyB);
  const isolatedDocuments = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates/' + candidateId + '/documents',
    headers: { cookie: otherAgencyCookie },
  });
  assert.equal(isolatedDocuments.statusCode, 403);

  const documentDownload = await app.inject({
    method: 'GET',
    url: '/api/v1/candidates/' + candidateId + '/documents/' + uploadedDocument.data.id,
    headers: { cookie: candidateCookie },
  });
  assert.equal(documentDownload.statusCode, 200);
  assert.equal(documentDownload.body, 'BuildHire document integration test');

  const documentDelete = await app.inject({
    method: 'DELETE',
    url: '/api/v1/candidates/' + candidateId + '/documents/' + uploadedDocument.data.id,
    headers: { cookie: candidateCookie },
  });
  assert.equal(documentDelete.statusCode, 204);

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
  interviewId = interview.data.id;

  const conflictResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/applications/' + application.data.id + '/interviews',
    headers: { cookie: agencyCookie },
    payload: {
      type: 'FINAL',
      scheduledAt,
      durationMins: 30,
      location: 'QA Room 2',
      interviewerIds: [interviewerId],
    },
  });
  assert.equal(conflictResponse.statusCode, 409);

  const outsiderCookie = await login(emails.interviewerB);
  const outsiderEvaluation = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interview.data.id + '/evaluations',
    headers: { cookie: outsiderCookie },
    payload: {
      rating: 5,
      recommendation: 'RECOMMENDED',
      comments: 'Not a panel member.',
    },
  });
  assert.equal(outsiderEvaluation.statusCode, 403);

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

  const agencyNotifications = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { cookie: agencyCookie },
  });
  assert.equal(agencyNotifications.statusCode, 200);
  const agencyNotificationBody = json<{ data: { notifications: Array<{ id: string }>; unreadCount: number } }>(agencyNotifications);
  assert.ok(agencyNotificationBody.data.notifications.length >= 1);
  assert.ok(agencyNotificationBody.data.unreadCount >= 1);

  const candidateNotifications = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: { cookie: candidateCookie },
  });
  assert.equal(candidateNotifications.statusCode, 200);
  const candidateNotificationBody = json<{ data: { notifications: Array<{ id: string }>; unreadCount: number } }>(candidateNotifications);
  assert.ok(candidateNotificationBody.data.notifications.length >= 1);
  assert.ok(candidateNotificationBody.data.unreadCount >= 1);

  const notificationId = candidateNotificationBody.data.notifications[0]?.id;
  assert.ok(notificationId);
  const readNotification = await app.inject({
    method: 'PATCH',
    url: '/api/v1/notifications/' + notificationId + '/read',
    headers: { cookie: candidateCookie, 'content-type': 'application/json' },
    payload: {},
  });
  assert.equal(readNotification.statusCode, 200);

  const auditResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/audit-events',
    headers: { cookie: agencyCookie },
  });
  assert.equal(auditResponse.statusCode, 200);
  const auditBody = json<{ data: Array<{ agencyId: string; entityType: string }> }>(auditResponse);
  assert.ok(auditBody.data.some((event) => event.agencyId === agencyAId && event.entityType === 'JobApplication'));
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
