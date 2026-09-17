import { useState } from 'react';
import { CandidateFilters } from './CandidateFilters';
import { CandidateCard } from './CandidateCard';
import { CandidateProfile } from './CandidateProfile';
import { AddCandidateDrawer } from './AddCandidateDrawer';
import { RejectCandidateDialog } from './RejectCandidateDialog';
import { Icon } from '../../../shared/components/Icon';
import { useCandidateWorkspace } from '../hooks/useCandidateWorkspace';

export const CandidatePage = () => {
  const { state, visibleCandidates, selectedCandidate, rejectionCandidate, professions, metrics, actions } = useCandidateWorkspace();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  if (state.loadState === 'loading') return <div className="p-4 sm:p-6"><div className="grid gap-4 xl:grid-cols-[380px_1fr]"><div className="space-y-2">{[1,2,3,4,5].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />)}</div><div className="hidden h-[640px] animate-pulse rounded-2xl bg-white ring-1 ring-slate-200 xl:block" /></div></div>;
  if (state.loadState === 'error') return <section className="mx-auto grid min-h-full max-w-lg place-items-center p-6 text-center"><div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Icon name="alert" size={25}/></div><h1 className="mt-4 text-lg font-black text-slate-900">We could not load candidates</h1><p className="mt-2 text-sm leading-6 text-slate-500">{state.errorMessage}</p><button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Retry</button></div></section>;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-950">Candidates</h1><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{metrics.total}</span></div><p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Find the right person quickly, understand why they fit, and keep every decision attached to their profile.</p></div><div className="grid grid-cols-4 gap-2 sm:min-w-[420px]"><div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Available</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.available}</p></div><div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Interview</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.interviewing}</p></div><div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Selected</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.selected}</p></div><div className="rounded-xl bg-amber-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-amber-600">Attention</p><p className="mt-1 text-sm font-black text-amber-800">{metrics.attention}</p></div></div></div></header>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className={`${mobileDetailOpen ? 'hidden xl:flex' : 'flex'} min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0 xl:border-r`} aria-label="Candidate directory">
          <CandidateFilters search={state.filters.search} status={state.filters.status} profession={state.filters.profession} professions={professions} resultCount={visibleCandidates.length} onSearchChange={actions.setSearch} onStatusChange={actions.setStatus} onProfessionChange={actions.setProfession}/>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {visibleCandidates.length === 0 ? <div className="grid min-h-64 place-items-center p-6 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="search" size={21}/></div><h2 className="mt-4 text-sm font-bold text-slate-800">No candidates found</h2><p className="mt-1 text-xs leading-5 text-slate-500">Try a different search or filter, or add a new candidate to the pool.</p>{!state.filters.search && state.filters.status === 'all' && <button type="button" onClick={actions.openAddCandidate} className="mt-4 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white">Add candidate</button>}</div></div> : visibleCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} selected={candidate.id === selectedCandidate?.id} onSelect={(id) => { actions.selectCandidate(id); setMobileDetailOpen(true); }}/>) }
          </div>
        </section>
        <div className={`${mobileDetailOpen ? 'block' : 'hidden xl:block'} min-w-0`}><CandidateProfile candidate={selectedCandidate} onBack={() => setMobileDetailOpen(false)} onScreen={actions.moveToScreening} onInterview={actions.moveToInterview} onSelect={actions.selectCandidateForJob} onReserve={actions.moveToReserve} onReject={actions.openRejection}/></div>
      </div>

      <AddCandidateDrawer open={state.isAddDrawerOpen} professions={professions} onClose={actions.closeAddCandidate} onCreate={actions.createCandidate}/>
      <RejectCandidateDialog open={Boolean(rejectionCandidate)} candidateName={rejectionCandidate?.name ?? 'this candidate'} onClose={actions.closeRejection} onReject={(reason, note) => { if (rejectionCandidate) actions.rejectCandidate(rejectionCandidate.id, reason, note); }}/>
    </div>
  );
};
