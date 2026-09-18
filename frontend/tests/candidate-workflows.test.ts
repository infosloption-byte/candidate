import { describe, expect, it } from 'vitest';
import { findDuplicateMatches, findDuplicateMatchesForDraft } from '../src/features/candidates/services/candidateMatching';
import { buildOnboardingUpdate, onboardingPercentForStatus, onboardingNextAction } from '../src/features/candidates/services/candidateOnboarding';
import { buildInvitationTransition, reminderDue } from '../src/features/candidates/services/candidateInvitations';
import { validateJobDraft } from '../src/features/jobs/services/jobValidation';
import { makeCandidate } from './fixtures';

describe('candidate intelligence and onboarding workflows', () => {
  it('flags a high-confidence duplicate on the same passport', () => {
    const source = makeCandidate({ id: 'candidate-001' });
    const duplicate = makeCandidate({
      id: 'candidate-002',
      name: 'Different Name',
      phone: '+94 71 000 0000',
      passportNumber: source.passportNumber,
    });

    const matches = findDuplicateMatches([source, duplicate], source.id);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      candidateId: duplicate.id,
      confidence: 'high',
      score: 80,
    });
    expect(matches[0]?.reasons).toContain('Same passport number');
  });

  it('flags a possible duplicate from name, profession and age evidence', () => {
    const source = makeCandidate();
    const candidate = makeCandidate({
      id: 'candidate-002',
      phone: '+94 71 111 2222',
      passportNumber: 'POSSIBLE-02',
      age: 32,
    });

    const matches = findDuplicateMatches([source, candidate], source.id);

    expect(matches[0]).toMatchObject({
      candidateId: candidate.id,
      confidence: 'possible',
      score: 55,
    });
  });

  it('returns draft duplicate matches without requiring a saved candidate first', () => {
    const candidate = makeCandidate({ id: 'candidate-002' });
    const draft = {
      name: candidate.name,
      phone: '+94 70 000 0000',
      passportNumber: 'DRAFT-01',
      age: String(candidate.age),
      location: candidate.location,
      profession: candidate.profession,
      originalProfession: candidate.originalProfession,
      experienceYears: String(candidate.experienceYears),
      secondarySkills: candidate.secondarySkills.join(', '),
      overseasCountries: candidate.overseasCountries.join(', '),
      englishLevel: candidate.englishLevel,
      locationReady: candidate.locationReady,
      drivingLicense: candidate.drivingLicense,
      availability: candidate.availability,
      source: candidate.source,
    };

    const matches = findDuplicateMatchesForDraft([candidate], draft);

    expect(matches[0]?.candidateId).toBe(candidate.id);
    expect(matches[0]?.confidence).toBe('possible');
  });

  it('maps onboarding status to the expected progress and next action', () => {
    expect(onboardingPercentForStatus('not-started')).toBe(0);
    expect(onboardingPercentForStatus('in-progress')).toBe(55);
    expect(onboardingPercentForStatus('completed')).toBe(100);
    expect(onboardingNextAction('submitted')).toBe('Verify profile');
  });

  it('builds a submitted onboarding update and preserves the journey audit event', () => {
    const candidate = makeCandidate({
      onboarding: {
        status: 'in-progress',
        completionPercent: 55,
        lastActivityAt: '2026-09-17T00:00:00.000Z',
      },
    });

    const update = buildOnboardingUpdate(candidate, 'submitted', 'Profile submitted for recruiter review.');

    expect(update.onboarding).toMatchObject({
      status: 'submitted',
      completionPercent: 100,
      reviewerNote: 'Profile submitted for recruiter review.',
    });
    expect(update.journeyEvent.title).toBe('Onboarding — Submitted');
    expect(update.journeyEvent.tone).toBe('positive');
  });

  it('creates an invitation transition with a reminder deadline', () => {
    const transition = buildInvitationTransition(makeCandidate(), 'send');

    expect(transition.onboarding.status).toBe('invited');
    expect(transition.onboarding.invitation).toMatchObject({
      status: 'pending',
      sendCount: 1,
    });
    expect(transition.onboarding.invitation?.reminderDueAt).toBeTruthy();
    expect(transition.journeyEvent.title).toBe('Invitation — Sent');
  });

  it('identifies a pending invitation as reminder-due after its deadline', () => {
    const candidate = makeCandidate({
      onboarding: {
        status: 'invited',
        completionPercent: 10,
        invitation: {
          status: 'pending',
          sentAt: '2026-09-15T00:00:00.000Z',
          lastSentAt: '2026-09-15T00:00:00.000Z',
          expiresAt: '2026-09-22T00:00:00.000Z',
          reminderDueAt: '2026-09-16T00:00:00.000Z',
          sendCount: 1,
        },
      },
    });

    expect(reminderDue(candidate)).toBe(true);
  });
});

describe('job validation workflow', () => {
  const validDraft = {
    title: 'Mason — Dubai Tower Project',
    project: 'Dubai Tower Project',
    location: 'Dubai, UAE',
    client: 'Gulf Build Contracting',
    profession: 'Mason',
    openings: '5',
    requiredExperience: '5',
    requiredSkills: 'Tile, Putty',
    preferredSkills: 'Plaster',
    startDate: '2026-10-01',
    deadline: '2026-10-15',
    status: 'open' as const,
  };

  it('accepts a complete valid job draft', () => {
    expect(validateJobDraft(validDraft)).toEqual([]);
  });

  it('blocks incomplete job drafts and invalid ranges', () => {
    const errors = validateJobDraft({
      ...validDraft,
      title: '',
      openings: '0',
      requiredExperience: '60',
      startDate: '2026-10-15',
      deadline: '2026-10-01',
    });

    expect(errors).toEqual(expect.arrayContaining([
      'Job title is required.',
      'Openings must be at least 1.',
      'Minimum experience must be between 0 and 50 years.',
      'Deadline cannot be before the start date.',
    ]));
  });
});
