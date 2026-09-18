import type { Candidate, CandidateInvitationStatus, CandidateJourneyEvent, CandidateOnboarding } from '../types/candidate';

export type InvitationAction = 'send' | 'resend' | 'opened' | 'started' | 'expired' | 'cancelled';

export const invitationStatusLabel = (status: CandidateInvitationStatus): string => ({
  pending: 'Invitation pending',
  opened: 'Invitation opened',
  started: 'Onboarding started',
  expired: 'Invitation expired',
  cancelled: 'Invitation cancelled',
}[status]);

export const invitationStatusTone = (status: CandidateInvitationStatus): 'neutral' | 'positive' | 'warning' | 'negative' =>
  status === 'opened' || status === 'started' ? 'positive' : status === 'pending' ? 'warning' : 'negative';

export const invitationNextAction = (status: CandidateInvitationStatus | null): string => ({
  pending: 'Resend invite',
  opened: 'Mark onboarding started',
  started: 'Open onboarding',
  expired: 'Resend invite',
  cancelled: 'Send invite again',
}[status ?? 'pending']);

const addDays = (date: Date, days: number): string => new Date(date.getTime() + days * 86400000).toISOString();

export const buildInvitationTransition = (
  candidate: Candidate,
  action: InvitationAction,
): { onboarding: NonNullable<Candidate['onboarding']>; journeyEvent: CandidateJourneyEvent } => {
  const now = new Date();
  const current = candidate.onboarding;
  const existing = current?.invitation;
  const onboardingStatus: CandidateOnboarding['status'] =
    action === 'started'
      ? 'in-progress'
      : (action === 'send' || action === 'resend' || action === 'opened') && (!current || current.status === 'not-started')
        ? 'invited'
        : current?.status ?? 'not-started';

  const invitation: NonNullable<Candidate['onboarding']>['invitation'] = {
    status: action === 'send' || action === 'resend' ? 'pending' : action === 'opened' ? 'opened' : action,
    sentAt: existing?.sentAt ?? now.toISOString(),
    lastSentAt: action === 'send' || action === 'resend' ? now.toISOString() : existing?.lastSentAt ?? now.toISOString(),
    expiresAt: existing?.expiresAt && action !== 'resend' ? existing.expiresAt : addDays(now, 7),
    openedAt: action === 'opened' ? now.toISOString() : existing?.openedAt,
    startedAt: action === 'started' ? now.toISOString() : existing?.startedAt,
    reminderDueAt: action === 'send' || action === 'resend' ? addDays(now, 2) : existing?.reminderDueAt,
    cancelledAt: action === 'cancelled' ? now.toISOString() : existing?.cancelledAt,
    sendCount: (existing?.sendCount ?? 0) + ((action === 'send' || action === 'resend') ? 1 : 0),
  };

  return {
    onboarding: {
      status: onboardingStatus,
      completionPercent: onboardingStatus === 'in-progress' ? Math.max(55, current?.completionPercent ?? 55) : Math.max(10, current?.completionPercent ?? 10),
      invitedAt: current?.invitedAt ?? invitation.sentAt,
      lastActivityAt: now.toISOString(),
      submittedAt: current?.submittedAt,
      reviewedAt: current?.reviewedAt,
      reviewerNote: current?.reviewerNote,
      invitation,
    },
    journeyEvent: {
      id: 'invitation-' + candidate.id + '-' + now.getTime(),
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      title: 'Invitation — ' + (action === 'send' ? 'Sent' : action === 'resend' ? 'Resent' : action === 'opened' ? 'Opened' : action === 'started' ? 'Onboarding started' : action === 'expired' ? 'Expired' : 'Cancelled'),
      detail: action === 'started' ? 'Candidate opened the onboarding workflow and started completing the profile.' : invitationStatusLabel(invitation.status) + '.',
      tone: invitationStatusTone(invitation.status),
    },
  };
};

export const reminderDue = (candidate: Candidate): boolean => {
  const invitation = candidate.onboarding?.invitation;
  return Boolean(invitation?.reminderDueAt && new Date(invitation.reminderDueAt).getTime() <= Date.now() && invitation.status === 'pending');
};
