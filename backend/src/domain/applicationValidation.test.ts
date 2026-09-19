import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionApplication, validateApplicationStatus } from './applicationValidation.js';

test('application workflow allows screening and shortlist progression', () => {
  assert.equal(canTransitionApplication('APPLIED', 'SCREENING'), true);
  assert.equal(canTransitionApplication('SCREENING', 'SHORTLISTED'), true);
  assert.equal(canTransitionApplication('SHORTLISTED', 'INTERVIEW'), true);
});

test('application workflow rejects backward jumps', () => {
  assert.equal(canTransitionApplication('SHORTLISTED', 'APPLIED'), false);
  assert.equal(validateApplicationStatus('SHORTLISTED', 'APPLIED'), 'Application cannot move from SHORTLISTED to APPLIED.');
});

test('withdrawal is allowed before interview', () => {
  assert.equal(canTransitionApplication('SCREENING', 'WITHDRAWN'), true);
  assert.equal(canTransitionApplication('INTERVIEW', 'WITHDRAWN'), false);
});

test('final interview decisions must come from evaluations', () => {
  assert.equal(canTransitionApplication('INTERVIEW', 'SELECTED'), false);
  assert.equal(canTransitionApplication('INTERVIEW', 'REJECTED'), false);
});
