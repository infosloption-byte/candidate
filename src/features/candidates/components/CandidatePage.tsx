import { CandidateCard } from './CandidateCard';
import { CandidateFilters } from './CandidateFilters';
import { CandidateProfile } from './CandidateProfile';
import { AddCandidateDrawer } from './AddCandidateDrawer';
import { RejectCandidateDialog } from './RejectCandidateDialog';
import { useCandidateWorkspace } from '../hooks/useCandidateWorkspace';
import { Icon } from '../../../shared/components/Icon';

export const CandidatePage = () => {
  const {
    state,
    visibleCandidates,
    selectedCandidate,
    professions,
    rejectionCandidate,
    actions,
  } = useCandidateWorkspace();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold tracking-tight text-slate-950">Candidates</h1><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{state.candidates.length}</span></div><p className="mt-1 text-sm text-slate-500">One place for candidate profiles, workflow status and interview evidence.</p></div>
          <button type="button" onClick={actions.openAddCandidate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"><Icon name="plus" size={17} /> Add candidate</button>
        </div>
      </header>
      <main className="grid min-h-0 flex-1 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section aria-label="Candidate directory" className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0 xl:border-r">
          <CandidateFilters search={state.filters.search} status={state.filters.status} profession={state.filters.profession} professions={professions} resultCount={visibleCandidates.length} onSearchChange={actions.setSearch} onStatusChange={actions.setStatus} onProfessionChange={actions.setProfession} />
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {visibleCandidates.length === 0 ? <div className="p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="search" /></div><h2 className="mt-4 text-sm font-semibold text-slate-800">No candidates found</h2><p className="mt-1 text-xs leading-5 text-slate-500">Try a different search or clear one of the filters.</p></div> : visibleCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} selected={candidate.id === selectedCandidate?.id} onSelect={actions.selectCandidate} />)}
          </div>
        </section>
        <CandidateProfile candidate={selectedCandidate} onScreen={actions.moveToScreening} onInterview={actions.moveToInterview} onSelect={actions.selectCandidateForJob} onReserve={actions.moveToReserve} onReject={actions.openRejection} />
      </main>
      <AddCandidateDrawer open={state.isAddDrawerOpen} onClose={actions.closeAddCandidate} onCreate={actions.createCandidate} />
      <RejectCandidateDialog open={Boolean(rejectionCandidate)} candidateName={rejectionCandidate?.name ?? 'this candidate'} onClose={actions.closeRejection} onReject={actions.rejectCandidate} />
    </div>
  );
};
