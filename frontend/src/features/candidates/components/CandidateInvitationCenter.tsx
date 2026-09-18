import { useMemo, useState } from 'react';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useCandidateContext } from '../hooks/useCandidateContext';
import { useCandidateInvitations } from '../hooks/useCandidateInvitations';
import { invitationNextAction, invitationStatusLabel, invitationStatusTone } from '../services/candidateInvitations';
import type { CandidateInvitationStatus } from '../types/candidate';

const filters: Array<{ value: CandidateInvitationStatus | 'not-invited' | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'not-invited', label: 'Not invited' },
  { value: 'pending', label: 'Pending' },
  { value: 'opened', label: 'Opened' },
  { value: 'started', label: 'Started' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const CandidateInvitationCenter = ({ onOpenOnboarding }: { onOpenOnboarding: (candidateId: string) => void }) => {
  const { state } = useCandidateContext();
  const { counts, actions } = useCandidateInvitations();
  const { can } = usePermissions();
  const [filter, setFilter] = useState<CandidateInvitationStatus | 'not-invited' | 'all'>('all');
  const canInvite = can('candidate.invite');
  const rows = useMemo(
    () => state.candidates.filter((candidate) =>
      filter === 'all'
        ? true
        : filter === 'not-invited'
          ? !candidate.onboarding?.invitation
          : candidate.onboarding?.invitation?.status === filter),
    [state.candidates, filter],
  );
  const toneClasses = {
    neutral: 'bg-slate-100 text-slate-600',
    positive: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-800',
    negative: 'bg-rose-100 text-rose-700',
  } as const;

  return <section className="min-h-full bg-slate-100 p-4 sm:p-6">
    <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Candidate invitations</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Invitation center</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Send, resend, monitor opens and onboarding starts, handle expiry/cancellation, and keep invitation history attached to each candidate.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] uppercase text-amber-600">Pending</p><p className="text-lg font-black text-amber-800">{counts.pending}</p></div>
          <div className="rounded-xl bg-cyan-50 p-3"><p className="text-[9px] uppercase text-cyan-600">Opened</p><p className="text-lg font-black text-cyan-800">{counts.opened}</p></div>
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] uppercase text-emerald-600">Started</p><p className="text-lg font-black text-emerald-800">{counts.started}</p></div>
          <div className="rounded-xl bg-rose-50 p-3"><p className="text-[9px] uppercase text-rose-600">Reminder due</p><p className="text-lg font-black text-rose-800">{counts.reminderDue}</p></div>
        </div>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4" role="toolbar" aria-label="Invitation filters">
        {filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} title={'Filter invitations by ' + item.label} aria-pressed={filter === item.value} className={'whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold ' + (filter === item.value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600')}>{item.label}</button>)}
      </div>
    </header>

    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Invitation</th><th className="px-4 py-3">Last sent</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">Reminder</th><th className="px-4 py-3">Activity</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((candidate) => {
              const invitation = candidate.onboarding?.invitation;
              const status = invitation?.status;
              const tone = status ? invitationStatusTone(status) : 'neutral';
              const activity = candidate.journey.filter((event) => event.title.toLowerCase().includes('invitation')).slice(0, 3);
              return <tr key={candidate.id} className="align-top">
                <td className="px-4 py-3"><p className="font-black text-slate-900">{candidate.name}</p><p className="mt-1 text-[10px] text-slate-400">{candidate.reference} · {candidate.profession}</p></td>
                <td className="px-4 py-3">{status ? <span className={'rounded-full px-2 py-1 text-[9px] font-bold ' + toneClasses[tone]}>{invitationStatusLabel(status)}</span> : <span className="text-slate-400">Not invited</span>}</td>
                <td className="px-4 py-3 text-slate-600">{invitation?.lastSentAt ? new Date(invitation.lastSentAt).toLocaleString('en-GB') : '—'}{invitation && <p className="mt-1 text-[10px] text-slate-400">{invitation.sendCount} send{invitation.sendCount === 1 ? '' : 's'}</p>}</td>
                <td className="px-4 py-3 text-slate-600">{invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('en-GB') : '—'}</td>
                <td className="px-4 py-3 text-slate-600">{invitation?.reminderDueAt ? new Date(invitation.reminderDueAt).toLocaleDateString('en-GB') : '—'}{invitation?.reminderDueAt && new Date(invitation.reminderDueAt).getTime() <= Date.now() && status === 'pending' && <span className="ml-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">Due</span>}</td>
                <td className="px-4 py-3"><div className="space-y-1">{activity.length ? activity.map((event) => <p key={event.id} className="text-[10px] leading-4 text-slate-500">{event.title} · {event.date}</p>) : <span className="text-[10px] text-slate-400">No invitation activity yet.</span>}</div></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">
                  {canInvite && (!status || status === 'cancelled' || status === 'expired') && <button type="button" onClick={() => actions.send(candidate.id)} title="Send onboarding invitation" className="rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] font-bold text-white">Invite</button>}
                  {canInvite && status === 'pending' && <><button type="button" onClick={() => actions.resend(candidate.id)} title="Resend onboarding invitation" className="rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-bold text-slate-700">Resend</button><button type="button" onClick={() => actions.markOpened(candidate.id)} title="Mark invitation as opened" className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-2 text-[10px] font-bold text-cyan-700">Mark opened</button><button type="button" onClick={() => actions.cancel(candidate.id)} title="Cancel invitation" className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[10px] font-bold text-rose-700">Cancel</button></>}
                  {canInvite && status === 'opened' && <><button type="button" onClick={() => actions.markStarted(candidate.id)} title="Mark onboarding as started" className="rounded-lg bg-cyan-600 px-2.5 py-2 text-[10px] font-bold text-white">Mark started</button><button type="button" onClick={() => actions.cancel(candidate.id)} title="Cancel invitation" className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[10px] font-bold text-rose-700">Cancel</button></>}
                  {status === 'started' && <button type="button" onClick={() => onOpenOnboarding(candidate.id)} title="Open candidate onboarding review" className="rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] font-bold text-white">Open onboarding</button>}
                </div><p className="mt-2 text-[10px] text-slate-400">{status ? invitationNextAction(status) : 'Send first invitation'}</p></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
};
