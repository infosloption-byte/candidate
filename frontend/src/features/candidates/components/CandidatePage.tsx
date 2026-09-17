import { useState } from 'react';
import { CandidateFilters } from './CandidateFilters';
import { CandidateSmartFiltersPanel } from './CandidateSmartFiltersPanel';
import { CandidateCard } from './CandidateCard';
import { CandidateProfile } from './CandidateProfile';
import { CandidateComparisonPanel } from './CandidateComparisonPanel';
import { AddCandidateDrawer } from './AddCandidateDrawer';
import { CandidateBulkImportDrawer } from './CandidateBulkImportDrawer';
import { CandidateOnboardingPage } from './CandidateOnboardingPage';
import { RejectCandidateDialog } from './RejectCandidateDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCandidateWorkspace } from '../hooks/useCandidateWorkspace';
import type { Availability, EnglishLevel } from '../types/candidate';

const englishLevels: EnglishLevel[] = ['Not assessed', 'Basic', 'Working', 'Good', 'Strong'];
const availabilities: Availability[] = ['Available now', 'Within 2 weeks', 'Within 1 month', 'Not available'];

export const CandidatePage = () => {
  const { state, visibleCandidates, selectedCandidate, rejectionCandidate, compareCandidates, duplicateMatches, professions, skillOptions, smartFilterCount, metrics, actions } = useCandidateWorkspace();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [smartFiltersOpen, setSmartFiltersOpen] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<'directory' | 'onboarding'>('directory');

  if (state.loadState === 'loading') return <LoadingState label="Loading candidates" rows={5} />;
  if (state.loadState === 'error') return <ErrorState title="We could not load candidates" message={state.errorMessage ?? 'Candidate data is temporarily unavailable.'} onRetry={actions.retryLoad} />;

  const compareOpen = compareCandidates.length > 0;
  const noCandidatesAtAll = state.candidates.length === 0;
  const comparisonBottomSpace = compareOpen ? (state.comparisonMinimized ? 88 : Math.min(state.comparisonHeight, Math.round(window.innerHeight * 0.72)) + 28) : 0;

  return (
    <div className="flex min-h-full flex-col" style={comparisonBottomSpace > 0 ? { paddingBottom: `${comparisonBottomSpace}px` } : undefined}>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-950">Candidates</h1><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{metrics.total}</span></div>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">Acquire candidate records, onboard them into the talent pool, and keep recruitment decisions attached to one profile.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setWorkspaceView('onboarding')} title="Open candidate onboarding workspace" className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold ${workspaceView === 'onboarding' ? 'border-cyan-200 bg-cyan-50 text-cyan-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><Icon name="users" size={15} /> Onboarding</button>
            <button type="button" onClick={actions.openBulkImport} title="Bulk import candidates from a CSV" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Icon name="download" size={15} /> Bulk import</button>
            <button type="button" onClick={actions.openAddCandidate} title="Create one candidate record manually" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="plus" size={15} /> Add candidate</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Available</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.available}</p></div>
          <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Interview</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.interviewing}</p></div>
          <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Selected</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.selected}</p></div>
          <div className="rounded-xl bg-cyan-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-cyan-700">Onboarding</p><p className="mt-1 text-sm font-black text-cyan-900">{state.candidates.filter((candidate) => (candidate.onboarding?.status ?? 'not-started') !== 'completed').length}</p></div>
        </div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3" role="tablist" aria-label="Candidate workspace views">
          <button type="button" role="tab" aria-selected={workspaceView === 'directory'} onClick={() => setWorkspaceView('directory')} title="Open candidate directory" className={`rounded-lg px-3 py-2 text-xs font-bold ${workspaceView === 'directory' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Directory</button>
          <button type="button" role="tab" aria-selected={workspaceView === 'onboarding'} onClick={() => setWorkspaceView('onboarding')} title="Track candidate onboarding and review" className={`rounded-lg px-3 py-2 text-xs font-bold ${workspaceView === 'onboarding' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Onboarding</button>
        </div>
      </header>

      {workspaceView === 'onboarding' ? <CandidateOnboardingPage /> : <div className="grid min-h-0 flex-1 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className={`${mobileDetailOpen ? 'hidden xl:flex' : 'flex'} min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0 xl:border-r`} aria-label="Candidate directory">
          <CandidateFilters search={state.filters.search} status={state.filters.status} profession={state.filters.profession} professions={professions} resultCount={visibleCandidates.length} smartFilterCount={smartFilterCount} smartFilters={state.smartFilters} smartFiltersOpen={smartFiltersOpen} onSearchChange={actions.setSearch} onStatusChange={actions.setStatus} onProfessionChange={actions.setProfession} onOpenSmartFilters={() => setSmartFiltersOpen((current) => !current)} />
          {smartFiltersOpen && <CandidateSmartFiltersPanel filters={state.smartFilters} topLevelFilters={state.filters} englishLevels={englishLevels} availabilities={availabilities} skillOptions={skillOptions} savedFilters={state.savedFilters} activeSavedFilterId={state.activeSavedFilterId} onChange={actions.setSmartFilters} onToggleSkill={actions.toggleSkillFilter} onClear={actions.clearSmartFilters} onClearAll={actions.clearAllFilters} onSaveFilter={actions.saveCurrentFilter} onApplySavedFilter={actions.applySavedFilter} onDeleteSavedFilter={actions.deleteSavedFilter}/>} 
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {visibleCandidates.length === 0 ? <EmptyState title={noCandidatesAtAll ? 'Your candidate pool is empty' : 'No candidates found'} message={noCandidatesAtAll ? 'Start with one candidate. You can add more details later as the recruitment workflow progresses.' : 'No candidate matches all of the current criteria.'} icon={noCandidatesAtAll ? 'users' : 'search'} actionLabel={noCandidatesAtAll ? 'Add candidate' : 'Clear filters'} onAction={noCandidatesAtAll ? actions.openAddCandidate : actions.clearAllFilters} /> : visibleCandidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} selected={candidate.id === selectedCandidate?.id} compareSelected={state.compareCandidateIds.includes(candidate.id)} compareDisabled={state.compareCandidateIds.length >= 4} onSelect={(id) => { actions.selectCandidate(id); setMobileDetailOpen(true); }} onToggleCompare={actions.toggleCompareCandidate}/>) }
          </div>
        </section>
        <div className={`${mobileDetailOpen ? 'block' : 'hidden xl:block'} min-w-0`}>
          <CandidateProfile candidate={selectedCandidate} allCandidates={state.candidates} duplicateMatches={duplicateMatches} onBack={() => setMobileDetailOpen(false)} onOpenDuplicate={(id) => { actions.closeAddCandidate(); actions.selectCandidate(id); setMobileDetailOpen(true); }} onAddTag={actions.addTag} onRemoveTag={actions.removeTag} onScreen={actions.moveToScreening} onInterview={actions.moveToInterview} onSelect={actions.selectCandidateForJob} onReserve={actions.moveToReserve} onReject={actions.openRejection}/>
        </div>
      </div>}

      <AddCandidateDrawer open={state.isAddDrawerOpen} professions={professions} existingCandidates={state.candidates} onClose={actions.closeAddCandidate} onCreate={actions.createCandidate} onReviewDuplicate={(id) => { actions.closeAddCandidate(); actions.selectCandidate(id); setMobileDetailOpen(true); }}/>
      <CandidateBulkImportDrawer open={state.isBulkImportOpen} existingCandidates={state.candidates} onClose={actions.closeBulkImport} onImport={actions.bulkImportCandidates} />
      <RejectCandidateDialog open={Boolean(rejectionCandidate)} candidateName={rejectionCandidate?.name ?? 'this candidate'} onClose={actions.closeRejection} onReject={(reason, note) => { if (rejectionCandidate) actions.rejectCandidate(rejectionCandidate.id, reason, note); }}/>
      <CandidateComparisonPanel candidates={compareCandidates} minimized={state.comparisonMinimized} height={state.comparisonHeight} onRemove={actions.toggleCompareCandidate} onClear={actions.clearComparison} onToggleMinimize={actions.setComparisonMinimized} onHeightChange={actions.setComparisonHeight}/>
    </div>
  );
};
