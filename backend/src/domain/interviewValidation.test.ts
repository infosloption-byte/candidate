import assert from 'node:assert/strict';
import test from 'node:test';
import { rangesOverlap, validateInterviewInput } from './interviewValidation.js';

test('interview validation requires a panel and schedule time', () => {
  assert.deepEqual(
    validateInterviewInput({ type: 'TECHNICAL' }, 'create'),
    ['Interview date and time are required.', 'At least one interviewer is required.'],
  );
});

test('interview validation accepts a normal panel interview', () => {
  assert.deepEqual(
    validateInterviewInput({
      type: 'TECHNICAL',
      scheduledAt: '2026-09-24T09:00:00.000Z',
      durationMins: 45,
      interviewerIds: ['user-1', 'user-2'],
    }, 'create'),
    [],
  );
});

test('interview ranges overlap only when times intersect', () => {
  const start = new Date('2026-09-24T09:00:00.000Z');
  assert.equal(rangesOverlap(start, 45, new Date('2026-09-24T09:30:00.000Z'), 30), true);
  assert.equal(rangesOverlap(start, 45, new Date('2026-09-24T09:45:00.000Z'), 30), false);
});
