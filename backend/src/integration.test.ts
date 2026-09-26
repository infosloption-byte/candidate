import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { hashPassword } from './lib/auth.js';
import { getPrisma } from './lib/prisma.js';
import { buildApp } from './app.js';

const enabled = process.env.RUN_DB_TESTS === '1' && Boolean(process.env.DATABASE_URL);
const dbTest = enabled
  ? test
  : ((name: string, fn: () => void | Promise<void>) => test(name, { skip: 'RUN_DB_TESTS=1 and DATABASE_URL are required.' }, fn));

const password = 'IntegrationTestPassword123!';
const suffix = Date.now().toString(36);

const emails = {
  admin: 'qa-admin-' + suffix + '@buildhire.local',
  agencyA: 'qa-agency-a-' + suffix + '@buildhire.local',
  agencyB: 'qa-agency-b-' + suffix + '@buildhire.local',
  interviewer: 'qa-interviewer-' + suffix + '@buildhire.local',
  interviewerB: 'qa-interviewer-b-' + suffix + '@buildhire.local',
  globalInterviewer: 'qa-global-interviewer-' + suffix + '@buildhire.local',
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
let globalInterviewerId = '';
let candidateUserId = '';
let jobAId = '';
let jobBId = '';
let candidateId = '';
let interviewId = '';
let criterionAId = '';
let criterionBId = '';
let criterionGroupId = '';

const cookieFrom = (response: { headers: { 'set-cookie'?: string | string[] } }): string => {
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
    const globalInterviewer = await tx.user.create({ data: { agencyId: null, name: 'QA Global Interviewer', email: emails.globalInterviewer, passwordHash, role: 'INTERVIEWER' } });

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
      data: { name: 'Technical skill', description: 'Technical ability', maxPoints: 10, active: true },
    });
    const criterionB = await tx.interviewCriterion.create({
      data: { name: 'Communication', description: 'Communication and teamwork', maxPoints: 5, active: true },
    });

    const criterionGroup = await tx.interviewCriterionGroup.create({
      data: {
        name: 'QA Technical Group',
        category: 'Masonry',
        description: 'Technical interview QA scorecard.',
        criteria: {
          create: [
            { criterionId: criterionA.id, sortOrder: 0 },
            { criterionId: criterionB.id, sortOrder: 1 },
          ],
        },
      },
    });

    return { agencyA, agencyB, admin, agencyAUser, agencyBUser, interviewer, interviewerB, globalInterviewer, candidateUser, candidate, jobA, jobB, criterionA, criterionB, criterionGroup };
  });

  agencyAId = setup.agencyA.id;
  agencyBId = setup.agencyB.id;
  adminId = setup.admin.id;
  agencyAUserId = setup.agencyAUser.id;
  agencyBUserId = setup.agencyBUser.id;
  interviewerId = setup.interviewer.id;
  interviewerBId = setup.interviewerB.id;
  globalInterviewerId = setup.globalInterviewer.id;
  candidateUserId = setup.candidateUser.id;
  candidateId = setup.candidate.id;
  jobAId = setup.jobA.id;
  jobBId = setup.jobB.id;
  criterionAId = setup.criterionA.id;
  criterionBId = setup.criterionB.id;
  criterionGroupId = setup.criterionGroup.id;
});

after(async () => {
  if (!enabled || !prisma) return;

  try {
    await prisma.session.deleteMany({
      where: { userId: { in: [adminId, agencyAUserId, agencyBUserId, interviewerId, interviewerBId, globalInterviewerId, candidateUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, agencyAUserId, agencyBUserId, interviewerId, interviewerBId, globalInterviewerId, candidateUserId] } },
    });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } });
  } finally {
    if (app) {
      await app.close();
      app = null;
    }
    await prisma.$disconnect();
    prisma = null;
  }
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

dbTest('admin can manage unified system users and interviewer types', async () => {
  assert.ok(app);
  assert.ok(prisma);

  const adminCookie = await login(emails.admin);

  const systemUsersResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/system-users',
    headers: { cookie: adminCookie },
  });
  assert.equal(systemUsersResponse.statusCode, 200);
  const systemUsersBody = json<{ data: Array<{ id: string; role: string; agencyId: string | null }> }>(systemUsersResponse);
  assert.ok(systemUsersBody.data.some((item) => item.id === adminId && item.role === 'ADMIN'));
  assert.ok(systemUsersBody.data.some((item) => item.id === agencyAUserId && item.role === 'AGENCY' && item.agencyId === agencyAId));

  const interviewerListResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/interviewers/all',
    headers: { cookie: adminCookie },
  });
  assert.equal(interviewerListResponse.statusCode, 200);
  const interviewerListBody = json<{ data: Array<{ id: string; role: string; agencyId: string | null }> }>(interviewerListResponse);
  assert.ok(interviewerListBody.data.some((item) => item.id === interviewerId && item.agencyId === agencyAId));
  assert.ok(interviewerListBody.data.some((item) => item.id === globalInterviewerId && item.agencyId === null));

  const createdAgencyUser = await app.inject({
    method: 'POST',
    url: '/api/v1/system-users',
    headers: { cookie: adminCookie },
    payload: {
      name: 'QA Created Agency User',
      email: 'qa-created-agency-' + suffix + '@buildhire.local',
      password,
      role: 'AGENCY',
      agencyId: agencyBId,
    },
  });
  assert.equal(createdAgencyUser.statusCode, 201);
  const createdAgencyUserBody = json<{ data: { id: string; role: string; agencyId: string | null } }>(createdAgencyUser);
  assert.equal(createdAgencyUserBody.data.role, 'AGENCY');
  assert.equal(createdAgencyUserBody.data.agencyId, agencyBId);
  const editableUser = await app.inject({
    method: 'POST',
    url: '/api/v1/system-users',
    headers: { cookie: adminCookie },
    payload: {
      name: 'QA Editable User',
      email: 'qa-editable-user-' + suffix + '@buildhire.local',
      password,
      role: 'ADMIN',
    },
  });
  assert.equal(editableUser.statusCode, 201);
  const editableUserBody = json<{ data: { id: string; email: string } }>(editableUser);

  const updatedEditableUser = await app.inject({
    method: 'PATCH',
    url: '/api/v1/system-users/' + editableUserBody.data.id,
    headers: { cookie: adminCookie },
    payload: {
      name: 'QA Editable User Updated',
      email: 'qa-editable-user-updated-' + suffix + '@buildhire.local',
      password: 'UpdatedIntegrationPassword456!',
    },
  });
  assert.equal(updatedEditableUser.statusCode, 200);
  const updatedEditableUserBody = json<{ data: { id: string; name: string; email: string; role: string } }>(updatedEditableUser);
  assert.equal(updatedEditableUserBody.data.name, 'QA Editable User Updated');
  assert.equal(updatedEditableUserBody.data.email, 'qa-editable-user-updated-' + suffix + '@buildhire.local');
  assert.equal(updatedEditableUserBody.data.role, 'ADMIN');

  const storedEditableUser = await prisma.user.findUnique({ where: { id: editableUserBody.data.id } });
  assert.ok(storedEditableUser);
  assert.notEqual(storedEditableUser!.passwordHash, password);
  const editableUserCookie = await login(updatedEditableUserBody.data.email, 'UpdatedIntegrationPassword456!');
  assert.match(editableUserCookie, /buildhire_session=/);

  await prisma.user.delete({ where: { id: createdAgencyUserBody.data.id } });
  await prisma.user.delete({ where: { id: editableUserBody.data.id } });

  const agencyCreateSystemUser = await app.inject({
    method: 'POST',
    url: '/api/v1/system-users',
    headers: { cookie: await login(emails.agencyA) },
    payload: {
      name: 'Should Not Be Created',
      email: 'qa-forbidden-system-' + suffix + '@buildhire.local',
      password,
      role: 'ADMIN',
    },
  });
  assert.equal(agencyCreateSystemUser.statusCode, 403);
});

dbTest('global interviewer can authenticate without an agency', async () => {
  assert.ok(app);

  const interviewerCookie = await login(emails.globalInterviewer);
  const meResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { cookie: interviewerCookie },
  });
  assert.equal(meResponse.statusCode, 200);
  const meBody = json<{ data: { user: { role: string; agencyId: string | null } } }>(meResponse);
  assert.equal(meBody.data.user.role, 'INTERVIEWER');
  assert.equal(meBody.data.user.agencyId, null);

  const interviewsResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/interviews',
    headers: { cookie: interviewerCookie },
  });
  assert.equal(interviewsResponse.statusCode, 200);
});

dbTest('interviewer pool includes own agency and global interviewers without cross-agency leakage', async () => {
  assert.ok(app);

  const agencyCookie = await login(emails.agencyA);
  const agencyPool = await app.inject({
    method: 'GET',
    url: '/api/v1/interviewers?agencyId=' + agencyAId,
    headers: { cookie: agencyCookie },
  });
  assert.equal(agencyPool.statusCode, 200);
  const agencyPoolBody = json<{ data: Array<{ id: string; agencyId: string | null; role: string; active: boolean }> }>(agencyPool);
  const agencyPoolIds = new Set(agencyPoolBody.data.map((item) => item.id));
  assert.ok(agencyPoolIds.has(interviewerId));
  assert.ok(agencyPoolIds.has(globalInterviewerId));
  assert.equal(agencyPoolIds.has(interviewerBId), true);

  const agencyCrossPool = await app.inject({
    method: 'GET',
    url: '/api/v1/interviewers?agencyId=' + agencyBId,
    headers: { cookie: agencyCookie },
  });
  assert.equal(agencyCrossPool.statusCode, 403);

  const agencyBCookie = await login(emails.agencyB);
  const agencyBPool = await app.inject({
    method: 'GET',
    url: '/api/v1/interviewers?agencyId=' + agencyBId,
    headers: { cookie: agencyBCookie },
  });
  assert.equal(agencyBPool.statusCode, 200);
  const agencyBPoolBody = json<{ data: Array<{ id: string; agencyId: string | null }> }>(agencyBPool);
  const agencyBPoolIds = new Set(agencyBPoolBody.data.map((item) => item.id));
  assert.ok(agencyBPoolIds.has(globalInterviewerId));
  assert.equal(agencyBPoolIds.has(interviewerBId), false);

  const adminCookie = await login(emails.admin);
  const createdGlobal = await app.inject({
    method: 'POST',
    url: '/api/v1/interviewers',
    headers: { cookie: adminCookie },
    payload: {
      name: 'QA Created Global Interviewer',
      email: 'qa-created-global-' + suffix + '@buildhire.local',
      password,
    },
  });
  assert.equal(createdGlobal.statusCode, 201);
  const createdGlobalBody = json<{ data: { id: string; agencyId: string | null; role: string; active: boolean } }>(createdGlobal);
  assert.equal(createdGlobalBody.data.agencyId, null);
  assert.equal(createdGlobalBody.data.role, 'INTERVIEWER');
  assert.equal(createdGlobalBody.data.active, true);
  await prisma!.user.delete({ where: { id: createdGlobalBody.data.id } });
});

dbTest('global interviewer login keeps an authenticated session without an agency', async () => {
  assert.ok(app);

  const cookie = await login(emails.globalInterviewer);
  const meResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: { cookie },
  });

  assert.equal(meResponse.statusCode, 200);
  const meBody = json<{ data: { user: { id: string; role: string; agencyId: string | null } } }>(meResponse);
  assert.equal(meBody.data.user.id, globalInterviewerId);
  assert.equal(meBody.data.user.role, 'INTERVIEWER');
  assert.equal(meBody.data.user.agencyId, null);
});

dbTest('global interviewer can be assigned to an agency interview and sees the assignment', async () => {
  assert.ok(app);
  assert.ok(prisma);

  const candidate = await prisma.candidate.create({
    data: {
      agencyId: agencyAId,
      reference: 'GLOBAL-I-' + suffix,
      name: 'Global Interviewer Candidate',
      profession: 'Welder',
      status: 'POOL',
      source: 'AGENCY_ADDED',
      onboardingStatus: 'COMPLETED',
      skills: ['Welding'],
    },
    select: { id: true },
  });

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/candidates/' + candidate.id + '/interviews',
    headers: { cookie: await login(emails.agencyA) },
    payload: {
      type: 'TECHNICAL',
      scheduledAt: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
      durationMins: 30,
      location: 'Global interviewer QA',
      interviewerIds: [globalInterviewerId],
      criterionGroupId,
    },
  });

  assert.equal(response.statusCode, 201);
  const body = json<{ data: { id: string; panel: Array<{ userId: string; user: { agencyId: string | null } }> } }>(response);
  assert.equal(body.data.panel.length, 1);
  assert.equal(body.data.panel[0]!.userId, globalInterviewerId);
  assert.equal(body.data.panel[0]!.user.agencyId, null);

  const globalCookie = await login(emails.globalInterviewer);
  const listResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/interviews',
    headers: { cookie: globalCookie },
  });
  assert.equal(listResponse.statusCode, 200);
  const listBody = json<{ data: Array<{ id: string }> }>(listResponse);
  assert.ok(listBody.data.some((item) => item.id === body.data.id));
});

dbTest('bulk interview scheduling creates consecutive interview slots for selected candidates', async () => {
  assert.ok(app);

  const agencyCookie = await login(emails.agencyA);
  const candidateOne = await prisma!.candidate.create({
    data: {
      agencyId: agencyAId,
      reference: 'BULK-I-' + suffix + '-1',
      name: 'Bulk Interview Candidate One',
      profession: 'Mason',
      status: 'POOL',
      source: 'AGENCY_ADDED',
      onboardingStatus: 'COMPLETED',
      skills: ['Masonry'],
    },
    select: { id: true },
  });
  const candidateTwo = await prisma!.candidate.create({
    data: {
      agencyId: agencyAId,
      reference: 'BULK-I-' + suffix + '-2',
      name: 'Bulk Interview Candidate Two',
      profession: 'Welder',
      status: 'POOL',
      source: 'AGENCY_ADDED',
      onboardingStatus: 'COMPLETED',
      skills: ['Welding'],
    },
    select: { id: true },
  });
  const candidates = [candidateOne, candidateTwo];

  const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/bulk',
    headers: { cookie: agencyCookie },
    payload: {
      candidateIds: candidates.map((item) => item.id),
      type: 'TECHNICAL',
      scheduledAt: start.toISOString(),
      durationMins: 30,
      location: 'QA Interview Room',
      interviewerIds: [interviewerId],
      criterionGroupId,
    },
  });

  assert.equal(response.statusCode, 201);
  const body = json<{ data: { importedCount: number; candidates: Array<{ candidateId: string; scheduledAt: string }> } }>(response);
  assert.equal(body.data.importedCount, 2);
  assert.equal(new Date(body.data.candidates[1]!.scheduledAt).getTime() - new Date(body.data.candidates[0]!.scheduledAt).getTime(), 30 * 60 * 1000);
});
dbTest('agency bulk candidate import preserves profile fields and rejects duplicate emails', async () => {
  assert.ok(app);

  const agencyCookie = await login(emails.agencyA);
  const firstEmail = 'bulk-one-' + suffix + '@buildhire.local';
  const secondEmail = 'bulk-two-' + suffix + '@buildhire.local';
  const csv = [
    'name,email,phone,alternatePhone,country,passportNumber,passportExpiry,currentLocation,availability,visaStatus,profession,experienceYears,skills',
    'Bulk Candidate One,' + firstEmail + ',+94 77 100 1001,+94 76 100 1001,Sri Lanka,N1234567,2031-12-31,Colombo,Immediately,Required,Mason,8,"Masonry,Blockwork,Plastering"',
    'Bulk Candidate Two,' + secondEmail + ',+94 77 100 1002,+94 76 100 1002,Sri Lanka,N7654321,2030-06-30,Kandy,Within 2 weeks,In process,Structural Welder,12,"Arc Welding,Steel Fabrication"',
  ].join('\n') + '\n';

  const importResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/agencies/' + agencyAId + '/candidates/bulk',
    headers: { cookie: agencyCookie, 'content-type': 'text/csv' },
    payload: csv,
  });
  assert.equal(importResponse.statusCode, 201);

  const importBody = json<{ data: { importedCount: number; candidates: Array<{ name: string; email: string | null; phone: string | null; alternatePhone: string | null; country: string | null; passportNumber: string | null; passportExpiry: string | null; currentLocation: string | null; availability: string | null; visaStatus: string | null; experienceYears: number | null; skills: unknown }> } }>(importResponse);
  assert.equal(importBody.data.importedCount, 2);
  assert.deepEqual(
    importBody.data.candidates.map((item) => ({
      name: item.name,
      email: item.email,
      phone: item.phone,
      alternatePhone: item.alternatePhone,
      country: item.country,
      passportNumber: item.passportNumber,
      passportExpiry: item.passportExpiry,
      currentLocation: item.currentLocation,
      availability: item.availability,
      visaStatus: item.visaStatus,
      experienceYears: item.experienceYears,
      skills: item.skills,
    })),
    [
      { name: 'Bulk Candidate One', email: firstEmail, phone: '+94 77 100 1001', alternatePhone: '+94 76 100 1001', country: 'Sri Lanka', passportNumber: 'N1234567', passportExpiry: '2031-12-31T00:00:00.000Z', currentLocation: 'Colombo', availability: 'Immediately', visaStatus: 'Required', experienceYears: 8, skills: ['Masonry', 'Blockwork', 'Plastering'] },
      { name: 'Bulk Candidate Two', email: secondEmail, phone: '+94 77 100 1002', alternatePhone: '+94 76 100 1002', country: 'Sri Lanka', passportNumber: 'N7654321', passportExpiry: '2030-06-30T00:00:00.000Z', currentLocation: 'Kandy', availability: 'Within 2 weeks', visaStatus: 'In process', experienceYears: 12, skills: ['Arc Welding', 'Steel Fabrication'] },
    ],
  );

  const duplicateResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/agencies/' + agencyAId + '/candidates/bulk',
    headers: { cookie: agencyCookie, 'content-type': 'text/csv' },
    payload: [
      'name,email,phone,alternatePhone,country,passportNumber,passportExpiry,currentLocation,availability,visaStatus,profession,experienceYears,skills',
      'Duplicate Candidate,' + firstEmail + ',+94 77 100 1003,,Sri Lanka,N0000000,2032-01-01,Colombo,Immediately,Required,Mason,3,"Masonry"',
    ].join('\n') + '\n',
  });
  assert.equal(duplicateResponse.statusCode, 400);
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
      criterionGroupId,
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
      criterionGroupId,
    },
  });
  assert.equal(duplicateTimeConflict.statusCode, 409);

  const rescheduledAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
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
      criterionGroupId,
    },
  });
  assert.equal(crossAgencySchedule.statusCode, 403);

  const outsiderCookie = await login(emails.interviewerB);
  const outsiderEvaluation = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interviewId + '/start',
    headers: { cookie: outsiderCookie },
  });
  assert.equal(outsiderEvaluation.statusCode, 403);

  const interviewerCookie = await login(emails.interviewer);
  const startResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interviewId + '/start',
    headers: { cookie: interviewerCookie },
  });
  assert.equal(startResponse.statusCode, 200);
  const startBody = json<{ data: { status: string; criterionAssignments: Array<{ criterionId: string; maxPoints: number }> } }>(startResponse);
  assert.equal(startBody.data.status, 'IN_PROGRESS');
  assert.equal(startBody.data.criterionAssignments.length, 2);

  const draftResponse = await app.inject({
    method: 'PUT',
    url: '/api/v1/interviews/' + interviewId + '/evaluation',
    headers: { cookie: interviewerCookie },
    payload: {
      scores: [
        { criterionId: criterionAId, points: 9 },
      ],
      comments: 'Draft notes while the interview is in progress.',
    },
  });
  assert.equal(draftResponse.statusCode, 200);
  const draftBody = json<{ data: { evaluation: { status: string }; summary: { drafts: number; submitted: number; totalPoints: number } } }>(draftResponse);
  assert.equal(draftBody.data.evaluation.status, 'DRAFT');
  assert.equal(draftBody.data.summary.drafts, 1);
  assert.equal(draftBody.data.summary.submitted, 0);
  assert.equal(draftBody.data.summary.totalPoints, 0);

  const submitIncomplete = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interviewId + '/evaluation/submit',
    headers: { cookie: interviewerCookie },
  });
  assert.equal(submitIncomplete.statusCode, 400);

  const completeDraft = await app.inject({
    method: 'PUT',
    url: '/api/v1/interviews/' + interviewId + '/evaluation',
    headers: { cookie: interviewerCookie },
    payload: {
      scores: [
        { criterionId: criterionAId, points: 9 },
        { criterionId: criterionBId, points: 4 },
      ],
      comments: 'Meets the required technical and communication criteria.',
    },
  });
  assert.equal(completeDraft.statusCode, 200);

  const evaluationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + interviewId + '/evaluation/submit',
    headers: { cookie: interviewerCookie },
  });
  assert.equal(evaluationResponse.statusCode, 201);
  const evaluationBody = json<{ data: { interviewCompleted: boolean; summary: { totalPoints: number; maxPoints: number; averagePercentage: number | null; submitted: number } } }>(evaluationResponse);
  assert.equal(evaluationBody.data.interviewCompleted, true);
  assert.equal(evaluationBody.data.summary.submitted, 1);
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
      criterionGroupId,
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

  const secondInterview = json<{ data: { id: string } }>(secondInterviewResponse);
  const outsiderStatusChange = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + secondInterview.data.id + '/status',
    headers: { cookie: await login(emails.interviewerB) },
    payload: { status: 'CANCELLED' },
  });
  assert.equal(outsiderStatusChange.statusCode, 403);

  const interviewerCancellation = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + secondInterview.data.id + '/status',
    headers: { cookie: interviewerCookie },
    payload: { status: 'CANCELLED' },
  });
  assert.equal(interviewerCancellation.statusCode, 200);
  const interviewerCancellationBody = json<{ data: { status: string; candidate: { status: string } } }>(interviewerCancellation);
  assert.equal(interviewerCancellationBody.data.status, 'CANCELLED');
  assert.equal(interviewerCancellationBody.data.candidate.status, 'READY_FOR_INTERVIEW');

  const noShowInterviewResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/candidates/' + candidateId + '/interviews',
    headers: { cookie: agencyCookie },
    payload: {
      jobId: jobAId,
      type: 'FINAL',
      scheduledAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      durationMins: 30,
      location: 'QA No Show Room',
      interviewerIds: [interviewerId],
      criterionGroupId,
    },
  });
  assert.equal(noShowInterviewResponse.statusCode, 201);
  const noShowInterview = json<{ data: { id: string } }>(noShowInterviewResponse);
  const interviewerNoShow = await app.inject({
    method: 'POST',
    url: '/api/v1/interviews/' + noShowInterview.data.id + '/status',
    headers: { cookie: interviewerCookie },
    payload: { status: 'NO_SHOW' },
  });
  assert.equal(interviewerNoShow.statusCode, 200);
  const interviewerNoShowBody = json<{ data: { status: string; candidate: { status: string } } }>(interviewerNoShow);
  assert.equal(interviewerNoShowBody.data.status, 'NO_SHOW');
  assert.equal(interviewerNoShowBody.data.candidate.status, 'ON_HOLD');

  const finalDecision = await app.inject({
    method: 'PATCH',
    url: '/api/v1/candidates/' + candidateId,
    headers: { cookie: agencyCookie },
    payload: { status: 'PASSED', statusReason: 'Passed technical interview.' },
  });
  assert.equal(finalDecision.statusCode, 200);
  const finalDecisionBody = json<{ data: { status: string } }>(finalDecision);
  assert.equal(finalDecisionBody.data.status, 'PASSED');

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
