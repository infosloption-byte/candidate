import type { Candidate, CandidateJourneyEvent, CandidateOnboardingStatus } from '../types/candidate';

export const onboardingStatusLabel = (status: CandidateOnboardingStatus): string => ({
  'not-started': 'Not started',
  invited: 'Invited',
  'in-progress': 'In progress',
  submitted: 'Submitted',
  'needs-changes': 'Needs changes',
  completed: 'Completed',
}[status]);

export const onboardingStatusTone = (status: CandidateOnboardingStatus): 'neutral' | 'positive' | 'warning' | 'negative' => {
  if (status === 'completed' || status === 'submitted') return 'positive';
  if (status === 'needs-changes') return 'negative';
  if (status === 'invited' || status === 'in-progress') return 'warning';
  return 'neutral';
};

export const onboardingPercentForStatus = (status: CandidateOnboardingStatus): number => ({
  'not-started': 0,
  invited: 10,
  'in-progress': 55,
  submitted: 100,
  'needs-changes': 70,
  completed: 100,
}[status]);

export const onboardingNextAction = (status: CandidateOnboardingStatus): string => ({
  'not-started': 'Send invitation',
  invited: 'Mark started',
  'in-progress': 'Review submission',
  submitted: 'Verify profile',
  'needs-changes': 'Await candidate updates',
  completed: 'View verified profile',
}[status]);

export const onboardingSteps = [
  { id: 'identity', label: 'Identity & contact' },
  { id: 'trade', label: 'Trade & experience' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'documents', label: 'Documents' },
  { id: 'review', label: 'Review & submit' },
] as const;

export const buildOnboardingUpdate = (
  candidate: Candidate,
  status: CandidateOnboardingStatus,
  reviewerNote = '',
): { onboarding: NonNullable<Candidate['onboarding']>; journeyEvent: CandidateJourneyEvent } => {
  const now = new Date().toISOString();
  const previous = candidate.onboarding;
  const completionPercent = status === 'needs-changes'
    ? Math.max(35, previous?.completionPercent ?? onboardingPercentForStatus(status))
    : onboardingPercentForStatus(status);

  return {
    onboarding: {
      status,
      completionPercent,
      invitedAt: previous?.invitedAt ?? (status === 'invited' ? now : undefined),
      lastActivityAt: now,
      submittedAt: status === 'submitted' || status === 'completed' ? (previous?.submittedAt ?? now) : previous?.submittedAt,
      reviewedAt: status === 'completed' ? now : previous?.reviewedAt,
      reviewerNote: reviewerNote.trim() || previous?.reviewerNote,
    },
    journeyEvent: {
      id: \`onboarding-\${Date.now()}-\${candidate.id}\`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      title: \`Onboarding — \${onboardingStatusLabel(status)}\`,
      detail: status === 'needs-changes' && reviewerNote.trim()
        ? reviewerNote.trim()
        : \`Candidate onboarding moved to \${onboardingStatusLabel(status).toLowerCase()}.\`,
      tone: onboardingStatusTone(status),
    },
  };
};

export const getOnboardingCompletionLabel = (candidate: Candidate): string => {
  const onboarding = candidate.onboarding;
  if (!onboarding) return 'Not tracked';
  return \`\${Math.round(Math.max(0, Math.min(100, onboarding.completionPercent)))}%\`;
};
