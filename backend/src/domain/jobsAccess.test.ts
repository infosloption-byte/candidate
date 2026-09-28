import assert from 'node:assert/strict';
import test from 'node:test';
import { jobListWhereForUser } from './jobsAccess.js';

test('platform admins can see jobs across companies', () => {
  assert.equal(
    jobListWhereForUser({ role: 'ADMIN', companyId: null, agencyId: null, candidateAgencyId: null }),
    undefined,
  );
});

test('company admins only see jobs from their company', () => {
  assert.deepEqual(
    jobListWhereForUser({ role: 'COMPANY_ADMIN', companyId: 'company-1', agencyId: null, candidateAgencyId: null }),
    { companyId: 'company-1' },
  );
});

test('agency users only see jobs from their company', () => {
  assert.deepEqual(
    jobListWhereForUser({ role: 'AGENCY', companyId: 'company-1', agencyId: 'agency-1', candidateAgencyId: null }),
    { companyId: 'company-1' },
  );
});

test('interviewees only see published jobs', () => {
  assert.deepEqual(
    jobListWhereForUser({ role: 'INTERVIEWEE', companyId: 'company-1', agencyId: 'agency-1', candidateAgencyId: 'candidate-agency-1' }),
    { status: 'PUBLISHED' },
  );
});
