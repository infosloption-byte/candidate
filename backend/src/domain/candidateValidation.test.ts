import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCandidateInput } from './candidateValidation.js';

test('candidate validation requires a usable name', () => {
  assert.deepEqual(
    validateCandidateInput({ name: 'A' }, 'create'),
    ['Candidate name must be at least 2 characters.'],
  );
});

test('candidate validation accepts a normal candidate profile', () => {
  assert.deepEqual(
    validateCandidateInput({
      name: 'Kamal Perera',
      email: 'kamal@example.com',
      experienceYears: 8,
      skills: ['Masonry', 'Tile'],
    }, 'create'),
    [],
  );
});

test('candidate validation rejects invalid experience', () => {
  assert.deepEqual(
    validateCandidateInput({ name: 'Kamal Perera', experienceYears: -1 }, 'create'),
    ['Experience years must be a whole number between 0 and 60.'],
  );
});
