import { useMemo } from 'react';
import { useCandidateContext } from './useCandidateContext';
import {
  resendCandidateInvitationApi,
  sendCandidateInvitationApi,
  transitionCandidateInvitationApi,
  updateCandidateOnboardingApi,
} from '../services/candidateOnboardingApi';
import type { Candidate, CandidateOnboardingStatus } from '../types/candidate';

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

  const reconcile = (candidate: Candidate) => {
    dispatch({ type: 'REPLACE_CANDIDATE', candidate });
  };

  const updateStatus = async (
    candidateId: string,
    status: CandidateOnboardingStatus,
    reviewerNote = '',
  ): Promise<void> => {
    const response = await updateCandidateOnboardingApi(candidateId, status, reviewerNote);
    reconcile(response.candidate);
  };

  const sendInvitation = async (candidateId: string): Promise<void> => {
    const response = await sendCandidateInvitationApi(candidateId);
    reconcile(response.candidate);
  };

  const resendInvitation = async (candidateId: string): Promise<void> => {
    const response = await resendCandidateInvitationApi(candidateId);
    reconcile(response.candidate);
  };

  const transitionInvitation = async (
    candidateId: string,
    action: 'opened' | 'started' | 'expired' | 'cancelled',
  ): Promise<void> => {
    const response = await transitionCandidateInvitationApi(candidateId, action);
    reconcile(response.candidate);
  };

  return {
    counts,
    actions: {
      updateStatus,
      sendInvitation,
      resendInvitation,
      markInvitationOpened: (candidateId: string) => transitionInvitation(candidateId, 'opened'),
      markStarted: (candidateId: string) => transitionInvitation(candidateId, 'started'),
      expireInvitation: (candidateId: string) => transitionInvitation(candidateId, 'expired'),
      cancelInvitation: (candidateId: string) => transitionInvitation(candidateId, 'cancelled'),
      markSubmitted: (candidateId: string) => updateStatus(candidateId, 'submitted'),
      requestChanges: (candidateId: string, note: string) => updateStatus(candidateId, 'needs-changes', note),
      markCompleted: (candidateId: string) => updateStatus(candidateId, 'completed'),
    },
  };
};
