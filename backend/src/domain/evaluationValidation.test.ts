import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApplicationStatus, validateEvaluationInput } from './evaluationValidation.js';

test('evaluation validation accepts a normal review', () => {
  assert.deepEqual(
    validateEvaluationInput({ rating: 4, recommendation: 'RECOMMENDED', comments: 'Good trade experience.' }),
    [],
  );
});

test('evaluation validation rejects an out of range rating', () => {
  assert.deepEqual(
    validateEvaluationInput({ rating: 6, recommendation: 'MAYBE' }),
    ['Rating must be a whole number between 1 and 5.'],
  );
});

test('evaluation resolution uses panel recommendation majority', () => {
  assert.equal(resolveApplicationStatus(['RECOMMENDED']), 'SELECTED');
  assert.equal(resolveApplicationStatus(['NOT_RECOMMENDED']), 'REJECTED');
  assert.equal(resolveApplicationStatus(['RECOMMENDED', 'NOT_RECOMMENDED']), 'INTERVIEW');
});
