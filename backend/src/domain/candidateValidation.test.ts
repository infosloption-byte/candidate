import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCandidateInput } from './candidateValidation.js';

const validCandidate = {
  agencyRegisterNo: 'AGR-1001',
  firstName: 'Kamal',
  lastName: 'Perera',
  birthdate: '1990-01-15',
  passportNumber: 'N1234567',
  passportExpiry: '2031-06-30',
  requestedProfession: 'Mason',
};

test('candidate validation requires the seven intake fields', () => {
  assert.deepEqual(
    validateCandidateInput({ firstName: 'Kamal', lastName: 'Perera' }, 'create'),
    [
      'Agency register number is required.',
      'Birth date is required.',
      'Passport number is required.',
      'Passport expiry date is required.',
      'Requested profession is required.',
    ],
  );
});

test('candidate validation accepts the canonical candidate intake payload', () => {
  assert.deepEqual(validateCandidateInput(validCandidate, 'create'), []);
});

test('candidate validation rejects future birth dates', () => {
  assert.deepEqual(
    validateCandidateInput({ ...validCandidate, birthdate: '2999-01-01' }, 'create'),
    ['Birth date cannot be in the future.'],
  );
});

test('candidate validation rejects malformed passport expiry dates', () => {
  assert.deepEqual(
    validateCandidateInput({ ...validCandidate, passportExpiry: 'not-a-date' }, 'create'),
    ['Passport expiry date is invalid.'],
  );
});

test('candidate validation rejects empty required fields on update', () => {
  assert.deepEqual(
    validateCandidateInput({ firstName: ' ' }, 'update'),
    ['First name cannot be empty.'],
  );
});
