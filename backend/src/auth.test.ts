import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from './lib/auth.js';

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
