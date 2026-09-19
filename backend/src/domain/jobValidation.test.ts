import assert from 'node:assert/strict';
import test from 'node:test';
import { validateJobInput } from './jobValidation.js';

test('job creation requires a usable title', () => {
  assert.deepEqual(validateJobInput({ title: 'x', openings: 1 }, 'create'), [
    'Job title must be at least 3 characters.',
  ]);
});

test('job validation accepts a normal published job', () => {
  assert.deepEqual(
    validateJobInput({ title: 'Senior Mason', openings: 4, status: 'PUBLISHED' }, 'create'),
    [],
  );
});

test('job validation rejects invalid opening counts', () => {
  assert.deepEqual(
    validateJobInput({ title: 'Senior Mason', openings: 0 }, 'create'),
    ['Openings must be a whole number between 1 and 1000.'],
  );
});
