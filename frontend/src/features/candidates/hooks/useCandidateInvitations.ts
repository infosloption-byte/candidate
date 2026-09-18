import { useMemo } from 'react';
import { useCandidateContext } from './useCandidateContext';
import { buildInvitationTransition, invitationStatusLabel, reminderDue, type InvitationAction } from '../services/candidateInvitations';

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

  const transition = (candidateId: string, action: InvitationAction) => {
    const candidate = state.candidates.find((item) => item.id === candidateId);
    if (!candidate) return;
    const update = buildInvitationTransition(candidate, action);
    dispatch({ type: 'UPDATE_ONBOARDING', candidateId, onboarding: update.onboarding, journeyEvent: update.journeyEvent });
  };

  return {
    counts,
    statusLabel: invitationStatusLabel,
    actions: {
      send: (candidateId: string) => transition(candidateId, 'send'),
      resend: (candidateId: string) => transition(candidateId, 'resend'),
      markOpened: (candidateId: string) => transition(candidateId, 'opened'),
      markStarted: (candidateId: string) => transition(candidateId, 'started'),
      expire: (candidateId: string) => transition(candidateId, 'expired'),
      cancel: (candidateId: string) => transition(candidateId, 'cancelled'),
    },
  };
};
