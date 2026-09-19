import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEvaluationTotal, validateEvaluationInput } from './evaluationValidation.js';

test('evaluation validation accepts complete criterion scores', () => {
  assert.deepEqual(
    validateEvaluationInput({
      scores: [
        { criterionId: 'criterion-1', points: 8 },
        { criterionId: 'criterion-2', points: 4 },
      ],
      comments: 'Good technical ability.',
    }),
    [],
  );
});

test('evaluation validation requires at least one criterion score', () => {
  assert.deepEqual(
    validateEvaluationInput({ scores: [] }),
    ['At least one interview criterion score is required.'],
  );
});

test('evaluation validation rejects duplicate criteria and negative points', () => {
  assert.deepEqual(
    validateEvaluationInput({
      scores: [
        { criterionId: 'criterion-1', points: 3 },
        { criterionId: 'criterion-1', points: -1 },
      ],
    }),
    [
      'Each interview criterion can be scored only once.',
      'Score 2 must be a whole number of points greater than or equal to 0.',
    ],
  );
});

test('evaluation total sums criterion points', () => {
  assert.equal(calculateEvaluationTotal([{ points: 8 }, { points: 4 }, { points: 3 }]), 15);
});
