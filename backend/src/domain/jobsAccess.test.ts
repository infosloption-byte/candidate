import assert from 'node:assert/strict';
import test from 'node:test';
import { jobListWhereForUser } from './jobsAccess.js';

test('interviewees only see published jobs from their linked agency', () => {
  assert.deepEqual(
    jobListWhereForUser({ role: 'INTERVIEWEE', agencyId: null, candidateAgencyId: 'agency-1' }),
    { status: 'PUBLISHED', agencyId: 'agency-1' },
  );
});

test('agency users only see their own agency jobs', () => {
  assert.deepEqual(
    jobListWhereForUser({ role: 'AGENCY', agencyId: 'agency-1', candidateAgencyId: null }),
    { agencyId: 'agency-1' },
  );
});
