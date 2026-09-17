import { useMemo, useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useCandidateWorkspace } from '../hooks/useCandidateWorkspace';
import { useCandidateOnboarding } from '../hooks/useCandidateOnboarding';
import { getOnboardingCompletionLabel, onboardingNextAction, onboardingStatusLabel, onboardingStatusTone, onboardingSteps } from '../services/candidateOnboarding';
import type { CandidateOnboardingStatus } from '../types/candidate';

const statusFilters: Array<{ id: CandidateOnboardingStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'not-started', label: 'Not started' },
  { id: 'invited', label: 'Invited' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'needs-changes', label: 'Needs changes' },
  { id: 'completed', label: 'Completed' },
];

export const CandidateOnboardingPage = () => {
  const { state, actions } = useCandidateWorkspace();
  const { counts, actions: onboardingActions } = useCandidateOnboarding();
  const [statusFilter, setStatusFilter] = useState<CandidateOnboardingStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(state.selectedCandidateId ?? state.candidates[0]?.id ?? null);
  const [reviewNote, setReviewNote] = useState('');

  const filteredCandidates = useMemo(
    () => state.candidates.filter((candidate) => statusFilter === 'all' || (candidate.onboarding?.status ?? 'not-started') === statusFilter),
    [state.candidates, statusFilter],
  );
  const selectedCandidate = state.candidates.find((candidate) => candidate.id === selectedId) ?? filteredCandidates[0] ?? null;
  const selectedStatus = selectedCandidate?.onboarding?.status ?? 'not-started';

  const toneClasses = {
    neutral: 'bg-slate-100 text-slate-600',
    positive: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-800',
    negative: 'bg-rose-100 text-rose-700',
  } as const;

  const requestChanges = () => {
    if (!selectedCandidate || !reviewNote.trim()) return;
    onboardingActions.requestChanges(selectedCandidate.id, reviewNote);
    setReviewNote('');
  };

  const mainAction = () => {
    if (!selectedCandidate) return;
    if (selectedStatus === 'not-started') onboardingActions.sendInvitation(selectedCandidate.id);
    else if (selectedStatus === 'invited') onboardingActions.markStarted(selectedCandidate.id);
    else if (selectedStatus === 'in-progress') onboardingActions.markSubmitted(selectedCandidate.id);
    else if (selectedStatus === 'submitted') onboardingActions.markCompleted(selectedCandidate.id);
  };

  return (
    <section className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700">Candidate onboarding</span>
              <span className="text-xs font-semibold text-slate-400">{counts.total} candidates</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Move candidates from intake to recruitment-ready</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">A recruiter can create one candidate or bulk-import many records, then invite each candidate to complete their profile, review the submission, request changes and verify the record.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Not started</p><p className="mt-1 text-sm font-black text-slate-900">{counts.notStarted}</p></div>
            <div className="rounded-xl bg-amber-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-amber-600">In progress</p><p className="mt-1 text-sm font-black text-amber-800">{counts.inProgress + counts.invited}</p></div>
            <div className="rounded-xl bg-cyan-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-cyan-700">Needs review</p><p className="mt-1 text-sm font-black text-cyan-900">{counts.submitted + counts.needsChanges}</p></div>
            <div className="rounded-xl bg-emerald-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-emerald-600">Completed</p><p className="mt-1 text-sm font-black text-emerald-800">{counts.completed}</p></div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="toolbar" aria-label="Candidate onboarding filters">
          {statusFilters.map((item) => <button key={item.id} type="button" onClick={() => setStatusFilter(item.id)} title={\`Filter by \${item.label}\`} aria-pressed={statusFilter === item.id} className={\`rounded-full px-3 py-1.5 text-[10px] font-bold \${statusFilter === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}>{item.label}</button>)}
        </div>
      </header>

      <div className="grid min-h-[calc(100dvh-220px)] xl:grid-cols-[minmax(380px,0.9fr)_minmax(0,1.4fr)]">
        <section className="min-h-0 border-b border-slate-200 bg-white xl:border-b-0 xl:border-r" aria-label="Candidates in onboarding">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5"><p className="text-xs font-black text-slate-900">{filteredCandidates.length} candidates</p><p className="mt-0.5 text-[10px] text-slate-400">Select a candidate to manage handoff and review.</p></div>
          <div className="max-h-[60dvh] overflow-y-auto xl:max-h-none">
            {filteredCandidates.length === 0
              ? <div className="p-6 text-center"><div className="mx-auto grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-400"><Icon name="users" size={18} /></div><p className="mt-3 text-sm font-black text-slate-900">No candidates in this stage</p><p className="mt-1 text-xs leading-5 text-slate-500">Use Add candidate or Bulk import to create onboarding work.</p></div>
              : filteredCandidates.map((candidate) => {
                const status = candidate.onboarding?.status ?? 'not-started';
                const tone = onboardingStatusTone(status);
                return <button key={candidate.id} type="button" onClick={() => setSelectedId(candidate.id)} title={\`Open onboarding for \${candidate.name}\`} className={\`block w-full border-b border-slate-100 px-4 py-4 text-left hover:bg-slate-50 \${selectedCandidate?.id === candidate.id ? 'bg-cyan-50/60' : 'bg-white'}\`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{candidate.name}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-400">{candidate.reference} · {candidate.profession}</p></div><span className={\`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold \${toneClasses[tone]}\`}>{onboardingStatusLabel(status)}</span></div>
                  <div className="mt-3"><div className="flex items-center justify-between text-[10px] font-bold text-slate-500"><span>{getOnboardingCompletionLabel(candidate)}</span><span>{onboardingNextAction(status)}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: \`\${candidate.onboarding?.completionPercent ?? 0}%\` }} /></div></div>
                </button>;
              })}
          </div>
        </section>

        <section className="min-w-0 bg-slate-50 p-4 sm:p-6" aria-label="Onboarding review">
          {!selectedCandidate ? <div className="grid h-full min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><Icon name="users" size={22} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-black text-slate-900">Select a candidate</p><p className="mt-1 text-xs text-slate-500">The candidate onboarding checklist will appear here.</p></div></div> : <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">{selectedCandidate.reference}</p><h2 className="mt-1 text-xl font-black text-slate-950">{selectedCandidate.name}</h2><p className="mt-1 text-xs text-slate-500">{selectedCandidate.profession} · {selectedCandidate.experienceYears} years · {selectedCandidate.location}</p></div><div className="text-left sm:text-right"><p className="text-2xl font-black text-slate-950">{getOnboardingCompletionLabel(selectedCandidate)}</p><p className="text-[10px] font-semibold text-slate-400">Profile completion</p></div></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: \`\${selectedCandidate.onboarding?.completionPercent ?? 0}%\` }} /></div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-900">Onboarding checklist</p><p className="mt-1 text-xs text-slate-500">These are the information areas the future candidate portal will collect and the recruiter will verify.</p></div><span className={\`rounded-full px-2.5 py-1 text-[10px] font-bold \${toneClasses[onboardingStatusTone(selectedStatus)]}\`}>{onboardingStatusLabel(selectedStatus)}</span></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-5">{onboardingSteps.map((step, index) => { const complete = (selectedCandidate.onboarding?.completionPercent ?? 0) >= (index + 1) * 20; return <div key={step.id} className={\`rounded-xl border p-3 \${complete ? 'border-cyan-200 bg-cyan-50/70' : 'border-slate-200 bg-slate-50'}\`}><div className={\`grid size-7 place-items-center rounded-full text-[10px] font-black \${complete ? 'bg-cyan-500 text-white' : 'bg-white text-slate-400'}\`}>{complete ? '✓' : index + 1}</div><p className="mt-2 text-[10px] font-bold leading-4 text-slate-700">{step.label}</p></div>; })}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-sm font-black text-slate-900">Recruiter handoff</p>
              <p className="mt-1 text-xs text-slate-500">Use the primary action to simulate the candidate handoff until authenticated invitation delivery is connected to the backend.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedStatus !== 'completed' && selectedStatus !== 'needs-changes' && <button type="button" onClick={mainAction} title={\`Advance onboarding: \${onboardingNextAction(selectedStatus)}\`} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white ${selectedStatus === 'submitted' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}><Icon name={selectedStatus === 'submitted' ? 'check' : selectedStatus === 'not-started' ? 'plus' : 'arrow-right'} size={14} />{selectedStatus === 'submitted' ? 'Mark verified' : onboardingNextAction(selectedStatus)}</button>}
                
              </div>
              <label className="mt-4 block"><span className="field-label">Reviewer note / requested changes</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="field-input min-h-24 resize-y" placeholder="Example: Please upload the trade certificate and correct the passport number." /></label>
              <button type="button" onClick={requestChanges} disabled={!reviewNote.trim() || selectedStatus === 'completed'} title="Request the candidate to correct missing or inaccurate information" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">Request changes</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidate record</p><div className="mt-3 space-y-2 text-xs"><p><span className="font-semibold text-slate-400">Phone:</span> <span className="font-bold text-slate-700">{selectedCandidate.phone || 'Not provided'}</span></p><p><span className="font-semibold text-slate-400">Passport:</span> <span className="font-bold text-slate-700">{selectedCandidate.passportNumber || 'Not provided'}</span></p><p><span className="font-semibold text-slate-400">Source:</span> <span className="font-bold text-slate-700">{selectedCandidate.source}</span></p></div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Documents</p><div className="mt-3 space-y-2">{Object.entries(selectedCandidate.documents).map(([name, value]) => <div key={name} className="flex items-center justify-between text-xs"><span className="font-semibold capitalize text-slate-600">{name.replace(/([A-Z])/g, ' $1')}</span><span className={\`rounded-full px-2 py-1 text-[9px] font-bold \${value === 'verified' ? 'bg-emerald-100 text-emerald-700' : value === 'needs-review' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}\`}>{value}</span></div>)}</div></div>
            </div>
          </div>}
        </section>
      </div>
    </section>
  );
};
