import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageInAgency, inCompany, isCompanyManager } from './tenant.js';

const admin = (companyId: string | null) => ({ role: 'COMPANY_ADMIN' as const, companyId, agencyId: null });
const agency = (companyId: string | null, agencyId: string) => ({ role: 'AGENCY' as const, companyId, agencyId });

test('inCompany never matches a missing company', () => {
  assert.equal(inCompany({ companyId: null }, null), false);
  assert.equal(inCompany({ companyId: null }, undefined), false);
  assert.equal(inCompany({ companyId: 'a' }, 'a'), true);
  assert.equal(inCompany({ companyId: 'a' }, 'b'), false);
});

test('company admins manage only resources of their own company', () => {
  const resource = { companyId: 'a', agencyId: 'ag1' };
  assert.equal(canManageInAgency(admin('a'), resource), true);
  assert.equal(canManageInAgency(admin('b'), resource), false);
  assert.equal(canManageInAgency(admin(null), resource), false);
});

test('agency users manage only their own agency inside their own company', () => {
  const resource = { companyId: 'a', agencyId: 'ag1' };
  assert.equal(canManageInAgency(agency('a', 'ag1'), resource), true);
  assert.equal(canManageInAgency(agency('a', 'ag2'), resource), false);
  assert.equal(canManageInAgency(agency('b', 'ag1'), resource), false);
});

test('platform admins and interviewers are never company managers by role alone', () => {
  const resource = { companyId: 'a', agencyId: 'ag1' };
  assert.equal(canManageInAgency({ role: 'ADMIN', companyId: 'a', agencyId: null }, resource), false);
  assert.equal(canManageInAgency({ role: 'INTERVIEWER', companyId: 'a', agencyId: 'ag1' }, resource), false);
  assert.equal(isCompanyManager(admin('a'), 'a'), true);
  assert.equal(isCompanyManager(admin('a'), 'b'), false);
});
