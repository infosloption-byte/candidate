import assert from 'node:assert/strict';
import test from 'node:test';
import { validateJobInput } from './jobValidation.js';

const positions = [{ position: 'Mason', requiredCount: 2 }];

test('job creation requires a usable title', () => {
  assert.deepEqual(validateJobInput({ title: 'x', positions }, 'create'), [
    'Job title must be at least 3 characters.',
  ]);
});

test('job validation accepts a normal published job', () => {
  assert.deepEqual(
    validateJobInput({ title: 'Senior Mason', positions: [{ position: 'Mason', requiredCount: 4 }], status: 'PUBLISHED' }, 'create'),
    [],
  );
});

test('job validation rejects invalid opening counts', () => {
  assert.deepEqual(
    validateJobInput({ title: 'Senior Mason', openings: 0, positions }, 'create'),
    ['Required worker count must be a whole number between 1 and 1000.'],
  );
});

test('job creation requires at least one position row', () => {
  assert.deepEqual(validateJobInput({ title: 'Senior Mason' }, 'create'), ['At least one job position is required.']);
  assert.ok(validateJobInput({ title: 'Senior Mason', positions: [] }, 'create').length > 0);
});

test('job positions must be unique and within limits', () => {
  const duplicate = validateJobInput({ title: 'Senior Mason', positions: [{ position: 'Mason', requiredCount: 1 }, { position: 'mason', requiredCount: 1 }] }, 'create');
  assert.ok(duplicate.some((message) => message.includes('duplicate position')));

  const tooMany = validateJobInput({ title: 'Senior Mason', positions: [{ position: 'A', requiredCount: 600 }, { position: 'B', requiredCount: 600 }] }, 'create');
  assert.ok(tooMany.some((message) => message.includes('Total required workers')));

  const zero = validateJobInput({ title: 'Senior Mason', positions: [{ position: 'A', requiredCount: 0 }] }, 'create');
  assert.ok(zero.some((message) => message.includes('required count')));
});
