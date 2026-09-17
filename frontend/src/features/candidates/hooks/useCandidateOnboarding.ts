import { useMemo } from 'react';
import { useCandidateContext } from './useCandidateContext';
import { buildOnboardingUpdate } from '../services/candidateOnboarding';
import type { CandidateOnboardingStatus } from '../types/candidate';

export const useCandidateOnboarding = () => {
  const { state, dispatch } = useCandidateContext();

  const counts = useMemo(() => {
    const values = state.candidates.map((candidate) => candidate.onboarding?.status ?? 'not-started');
    return {
      total: values.length,
      notStarted: values.filter((value) => value === 'not-started').length,
      invited: values.filter((value) => value === 'invited').length,
      inProgress: values.filter((value) => value === 'in-progress').length,
      submitted: values.filter((value) => value === 'submitted').length,
      needsChanges: values.filter((value) => value === 'needs-changes').length,
      completed: values.filter((value) => value === 'completed').length,
    };
  }, [state.candidates]);

  const updateStatus = (candidateId: string, status: CandidateOnboardingStatus, reviewerNote = '') => {
    const candidate = state.candidates.find((item) => item.id === candidateId);
    if (!candidate) return;
    const update = buildOnboardingUpdate(candidate, status, reviewerNote);
    dispatch({ type: 'UPDATE_ONBOARDING', candidateId, onboarding: update.onboarding, journeyEvent: update.journeyEvent });
  };

  return {
    counts,
    actions: {
      updateStatus,
      sendInvitation: (candidateId: string) => updateStatus(candidateId, 'invited'),
      markStarted: (candidateId: string) => updateStatus(candidateId, 'in-progress'),
      markSubmitted: (candidateId: string) => updateStatus(candidateId, 'submitted'),
      requestChanges: (candidateId: string, note: string) => updateStatus(candidateId, 'needs-changes', note),
      markCompleted: (candidateId: string) => updateStatus(candidateId, 'completed'),
    },
  };
};
