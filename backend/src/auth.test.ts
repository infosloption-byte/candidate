import assert from 'node:assert/strict';
import test from 'node:test';
import { hasCompanyAccess, hashPassword, verifyPassword } from './lib/auth.js';

test('password hashing produces a salted one-way hash', async () => {
  const password = 'Correct Horse Battery Staple';

  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword('wrong password', firstHash), false);
});

test('password hashing rejects short passwords', async () => {
  await assert.rejects(
    () => hashPassword('short'),
    /at least 8 characters/,
  );
});


test('company access allows only the same tenant or the platform admin', () => {
  const companyA = {
    id: 'user-a',
    companyId: 'company-a',
    companyName: 'A',
    agencyId: null,
    candidateId: null,
    name: 'Company A',
    email: 'a@example.com',
    role: 'COMPANY_ADMIN' as const,
    active: true,
  };
  const companyB = { ...companyA, id: 'user-b', companyId: 'company-b' };
  const platformAdmin = { ...companyA, id: 'admin', companyId: null, role: 'ADMIN' as const };

  assert.equal(hasCompanyAccess(companyA, 'company-a'), true);
  assert.equal(hasCompanyAccess(companyA, 'company-b'), false);
  assert.equal(hasCompanyAccess(companyB, 'company-a'), false);
  assert.equal(hasCompanyAccess(platformAdmin, 'company-a'), true);
  assert.equal(hasCompanyAccess(companyA, null), false);
});
