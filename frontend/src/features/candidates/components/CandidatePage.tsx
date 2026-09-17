import { useState } from 'react';
import { CandidateFilters } from './CandidateFilters';
import { CandidateSmartFiltersPanel } from './CandidateSmartFiltersPanel';
import { CandidateCard } from './CandidateCard';
import { CandidateProfile } from './CandidateProfile';
import { CandidateComparisonPanel } from './CandidateComparisonPanel';
import { AddCandidateDrawer } from './AddCandidateDrawer';
import { RejectCandidateDialog } from './RejectCandidateDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCandidateWorkspace } from '../hooks/useCandidateWorkspace';
import type { Availability, EnglishLevel } from '../types/candidate';

const englishLevels: EnglishLevel[] = ['Not assessed', 'Basic', 'Working', 'Good', 'Strong'];
const availabilities: Availability[] = ['Available now', 'Within 2 weeks', 'Within 1 month', 'Not available'];

export const CandidatePage = () => {
  const {
    state,
    visibleCandidates,
    selectedCandidate,
    rejectionCandidate,
    compareCandidates,
    duplicateMatches,
    professions,
    skillOptions,
    smartFilterCount,
    metrics,
    actions,
  } = useCandidateWorkspace();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [smartFiltersOpen, setSmartFiltersOpen] = useState(false);

  if (state.loadState === 'loading') return <LoadingState label="Loading candidates" rows={5} />;
  if (state.loadState === 'error') return <ErrorState title="We could not load candidates" message={state.errorMessage ?? 'Candidate data is temporarily unavailable.'} onRetry={actions.retryLoad} />;

  const compareOpen = compareCandidates.length > 0;
  const noCandidatesAtAll = state.candidates.length === 0;

  return (
    <div className={`flex min-h-full flex-col ${compareOpen ? 'pb-[340px] lg:pb-[300px]' : ''}`}>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-950">Candidates</h1><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{metrics.total}</span></div><p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Find the right person quickly, understand why they fit, and keep every decision attached to their profile.</p></div><div className="grid grid-cols-4 gap-2 sm:min-w-[420px]"><div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Available</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.available}</p></div><div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Interview</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.interviewing}</p></div><div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Selected</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.selected}</p></div><div className="rounded-xl bg-amber-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-amber-600">Attention</p><p className="mt-1 text-sm font-black text-amber-800">{metrics.attention}</p></div></div></div></header>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className={`${mobileDetailOpen ? 'hidden xl:flex' : 'flex'} min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0 xl:border-r`} aria-label="Candidate directory">
          <CandidateFilters search={state.filters.search} status={state.filters.status} profession={state.filters.profession} professions={professions} resultCount={visibleCandidates.length} smartFilterCount={smartFilterCount} smartFilters={state.smartFilters} smartFiltersOpen={smartFiltersOpen} onSearchChange={actions.setSearch} onStatusChange={actions.setStatus} onProfessionChange={actions.setProfession} onOpenSmartFilters={() => setSmartFiltersOpen((current) => !current)} />
          {smartFiltersOpen && <CandidateSmartFiltersPanel filters={state.smartFilters} englishLevels={englishLevels} availabilities={availabilities} skillOptions={skillOptions} onChange={actions.setSmartFilters} onToggleSkill={actions.toggleSkillFilter} onClear={actions.clearSmartFilters}/>} 
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {visibleCandidates.length === 0 ? <EmptyState title={noCandidatesAtAll ? 'Your candidate pool is empty' : 'No candidates found'} message={noCandidatesAtAll ? 'Start with one candidate. You can add more details later as the recruitment workflow progresses.' : 'No candidate matches all of the current criteria.'} icon={noCandidatesAtAll ? 'users' : 'search'} actionLabel={noCandidatesAtAll ? 'Add candidate' : 'Clear filters'} onAction={noCandidatesAtAll ? actions.openAddCandidate : () => { actions.clearSmartFilters(); actions.setStatus('all'); actions.setProfession('all'); actions.setSearch(''); }} /> : visibleCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} selected={candidate.id === selectedCandidate?.id} compareSelected={state.compareCandidateIds.includes(candidate.id)} compareDisabled={state.compareCandidateIds.length >= 4} onSelect={(id) => { actions.selectCandidate(id); setMobileDetailOpen(true); }} onToggleCompare={actions.toggleCompareCandidate}/>) }
          </div>
        </section>
        <div className={`${mobileDetailOpen ? 'block' : 'hidden xl:block'} min-w-0`}>
          <CandidateProfile candidate={selectedCandidate} allCandidates={state.candidates} duplicateMatches={duplicateMatches} onBack={() => setMobileDetailOpen(false)} onOpenDuplicate={(id) => { actions.selectCandidate(id); setMobileDetailOpen(true); }} onScreen={actions.moveToScreening} onInterview={actions.moveToInterview} onSelect={actions.selectCandidateForJob} onReserve={actions.moveToReserve} onReject={actions.openRejection}/>
        </div>
      </div>

      <AddCandidateDrawer open={state.isAddDrawerOpen} professions={professions} onClose={actions.closeAddCandidate} onCreate={actions.createCandidate}/>
      <RejectCandidateDialog open={Boolean(rejectionCandidate)} candidateName={rejectionCandidate?.name ?? 'this candidate'} onClose={actions.closeRejection} onReject={(reason, note) => { if (rejectionCandidate) actions.rejectCandidate(rejectionCandidate.id, reason, note); }}/>
      <CandidateComparisonPanel candidates={compareCandidates} onRemove={actions.toggleCompareCandidate} onClear={actions.clearComparison}/>
    </div>
  );
};
