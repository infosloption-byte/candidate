import { useMemo } from 'react';
import { useCandidateContext } from './useCandidateContext';
import { invitationStatusLabel, reminderDue } from '../services/candidateInvitations';
import { resendCandidateInvitationApi, sendCandidateInvitationApi, transitionCandidateInvitationApi } from '../services/candidateOnboardingApi';

export const useCandidateInvitations = () => {
  const { state, dispatch } = useCandidateContext();

  const counts = useMemo(() => {
    const statuses = state.candidates.map((candidate) => candidate.onboarding?.invitation?.status ?? 'not-invited');
    return {
      total: statuses.length,
      pending: statuses.filter((value) => value === 'pending').length,
      opened: statuses.filter((value) => value === 'opened').length,
      started: statuses.filter((value) => value === 'started').length,
      expired: statuses.filter((value) => value === 'expired').length,
      cancelled: statuses.filter((value) => value === 'cancelled').length,
      notInvited: statuses.filter((value) => value === 'not-invited').length,
      reminderDue: state.candidates.filter(reminderDue).length,
    };
  }, [state.candidates]);

  const reconcile = (candidate: import('../types/candidate').Candidate) => {
    dispatch({ type: 'REPLACE_CANDIDATE', candidate });
  };

  const send = async (candidateId: string) => {
    const response = await sendCandidateInvitationApi(candidateId);
    reconcile(response.candidate);
  };

  const resend = async (candidateId: string) => {
    const response = await resendCandidateInvitationApi(candidateId);
    reconcile(response.candidate);
  };

  const transition = async (candidateId: string, action: 'opened' | 'started' | 'expired' | 'cancelled') => {
    const response = await transitionCandidateInvitationApi(candidateId, action);
    reconcile(response.candidate);
  };

  return {
    counts,
    statusLabel: invitationStatusLabel,
    actions: {
      send,
      resend,
      markOpened: (candidateId: string) => transition(candidateId, 'opened'),
      markStarted: (candidateId: string) => transition(candidateId, 'started'),
      expire: (candidateId: string) => transition(candidateId, 'expired'),
      cancel: (candidateId: string) => transition(candidateId, 'cancelled'),
    },
  };
};