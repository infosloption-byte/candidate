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

test('candidate validation accepts extended identity and work-readiness fields', () => {
  assert.deepEqual(
    validateCandidateInput({
      name: 'Ruwan Fernando',
      phone: '+94 77 123 4567',
      alternatePhone: '+94 76 234 5678',
      country: 'Sri Lanka',
      passportNumber: 'N9087654',
      passportExpiry: '2031-06-30',
      currentLocation: 'Colombo, Sri Lanka',
      availability: 'Immediately',
      visaStatus: 'Required',
      profession: 'Mason',
      experienceYears: 7,
      skills: ['Masonry', 'Tile'],
    }, 'create'),
    [],
  );
});

test('candidate validation rejects malformed passport expiry date', () => {
  assert.deepEqual(
    validateCandidateInput({ name: 'Ruwan Fernando', passportExpiry: 'not-a-date' }, 'create'),
    ['Candidate passport expiry date is invalid.'],
  );
});
