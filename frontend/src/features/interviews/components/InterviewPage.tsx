import { useState } from 'react';
import { InterviewCalendar } from './InterviewCalendar';
import { InterviewQueue } from './InterviewQueue';
import { InterviewWorkspace } from './InterviewWorkspace';
import { ScheduleInterviewDrawer } from './ScheduleInterviewDrawer';
import { BulkScheduleInterviewDrawer } from './BulkScheduleInterviewDrawer';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Icon } from '../../../shared/components/Icon';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { useInterviewWorkspace } from '../hooks/useInterviewWorkspace';
import { useInterviewBulkScheduler } from '../hooks/useInterviewBulkScheduler';
import { useInterviewCalendar } from '../hooks/useInterviewCalendar';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import type { CandidateStatus, RejectionReason } from '../../candidates/types/candidate';
import type { Decision, Interview } from '../types/interview';

type InterviewPageMode = 'queue' | 'calendar';

const candidateRejectionReasons: RejectionReason[] = ['Technical skill', 'Experience gap', 'Required skill missing', 'Communication', 'Documents', 'Availability', 'Client requirement', 'Other'];
const mapRejectionReason = (reason: string): RejectionReason => candidateRejectionReasons.includes(reason as RejectionReason) ? reason as RejectionReason : 'Other';

export const InterviewPage = () => {
  const { state, selectedInterview, sortedInterviews, interviewers, metrics, actions } = useInterviewWorkspace();
  const calendar = useInterviewCalendar();
  const { state: candidateState, actions: candidateActions } = useCandidateWorkspace();
  const [mode, setMode] = useState<InterviewPageMode>('queue');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [calendarDetailOpen, setCalendarDetailOpen] = useState(false);
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);
  const calendarDetailRef = useFocusTrap({ enabled: calendarDetailOpen, onEscape: () => setCalendarDetailOpen(false) });
  const bulk = useInterviewBulkScheduler({ candidates: candidateState.candidates, open: bulkScheduleOpen, onClose: () => setBulkScheduleOpen(false), onScheduled: (candidateIds) => candidateActions.moveCandidatesToInterview(candidateIds) });

  if (state.loadState === 'loading') return <LoadingState label="Loading interviews" rows={5} />;
  if (state.loadState === 'error') return <ErrorState title="We could not load interviews" message={state.errorMessage ?? 'Interview data is temporarily unavailable.'} onRetry={actions.retryLoad} />;

  const scheduleCandidates = candidateState.candidates.filter((candidate) => candidate.status !== 'rejected');
  const handleCreateInterview = (interview: Interview) => { actions.createInterview(interview); candidateActions.moveToInterview(interview.candidateId); };
  const handleDecisionRecorded = (candidateId: string, decision: Exclude<Decision, 'pending'>, score: number, date: string, interviewer: string, profession: string, reason: string, note: string) => {
    const candidateStatus: Extract<CandidateStatus, 'selected' | 'reserve' | 'rejected'> = decision;
    const candidateReason: RejectionReason | '' = decision === 'rejected' ? mapRejectionReason(reason) : '';
    candidateActions.recordInterviewOutcome(candidateId, candidateStatus, date, interviewer, profession, score, candidateReason, note);
  };
  const selectCalendarInterview = (interviewId: string) => { actions.selectInterview(interviewId); setCalendarDetailOpen(true); };

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-950">Interviews</h1><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{metrics.total}</span></div><p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">Schedule, conduct and document interviews. Use batch planning when a large candidate group must be processed across a tight window.</p></div>
          <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setBulkScheduleOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-[11px] font-black text-cyan-700 hover:bg-cyan-100"><Icon name="calendar" size={14}/>Batch schedule</button><button type="button" onClick={actions.openSchedule} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-[11px] font-black text-white hover:bg-slate-800"><Icon name="plus" size={14}/>Schedule one</button><div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Interview view"><button type="button" aria-pressed={mode === 'queue'} onClick={() => setMode('queue')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold ${mode === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Icon name="sliders" size={13}/>Queue</button><button type="button" aria-pressed={mode === 'calendar'} onClick={() => setMode('calendar')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold ${mode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Icon name="calendar" size={13}/>Calendar</button></div></div>
        </div>
        {mode === 'queue' && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Scheduled</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.scheduled}</p></div><div className="rounded-xl bg-violet-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-violet-600">Evaluation</p><p className="mt-1 text-sm font-black text-violet-800">{metrics.evaluation}</p></div><div className="rounded-xl bg-emerald-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-emerald-600">Completed</p><p className="mt-1 text-sm font-black text-emerald-800">{metrics.completed}</p></div><div className="rounded-xl bg-amber-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-amber-600">Needs action</p><p className="mt-1 text-sm font-black text-amber-800">{metrics.needsDecision}</p></div></div>}
      </header>
      {candidateState.loadState === 'error' && <div className="mx-4 mt-4 sm:mx-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Candidate data could not be loaded, so bulk scheduling is temporarily unavailable.</div></div>}
      {mode === 'queue' ? <div className="grid min-h-0 flex-1 xl:grid-cols-[380px_minmax(0,1fr)]"><div className={`${mobileDetailOpen ? 'hidden xl:block' : 'block'} min-h-0`}><InterviewQueue interviews={sortedInterviews} selectedInterviewId={selectedInterview?.id ?? null} onSelect={(id) => { actions.selectInterview(id); setMobileDetailOpen(true); }} onSchedule={actions.openSchedule} onBulkSchedule={() => setBulkScheduleOpen(true)}/></div><div className={`${mobileDetailOpen ? 'block' : 'hidden xl:block'} min-w-0`}><InterviewWorkspace interview={selectedInterview} onBack={() => setMobileDetailOpen(false)} onStatusChange={actions.updateStatus} onDecisionRecorded={handleDecisionRecorded}/></div></div> : <div className="min-h-0 flex-1">{sortedInterviews.length === 0 ? <div className="grid min-h-[55dvh] place-items-center p-6"><EmptyState title="No interviews scheduled" message="Schedule the first interview to start building your calendar and interview history." icon="calendar" actionLabel="Schedule interview" onAction={actions.openSchedule}/></div> : <InterviewCalendar view={calendar.view} days={calendar.days} entriesByDay={calendar.entriesByDay} conflictCount={calendar.conflictCount} onViewChange={calendar.setView} onDateChange={calendar.setDate} onMove={calendar.move} onToday={calendar.goToday} onSelectInterview={selectCalendarInterview} onSchedule={actions.openSchedule}/>}</div>}
      <ScheduleInterviewDrawer open={state.isScheduleDrawerOpen} candidates={scheduleCandidates} interviewers={interviewers} onClose={actions.closeSchedule} onCreate={handleCreateInterview}/>
      <BulkScheduleInterviewDrawer open={bulkScheduleOpen} candidates={bulk.eligibleCandidates} interviewers={interviewers} pageCandidates={bulk.pageCandidates} filteredCount={bulk.filteredCandidates.length} page={bulk.page} pageCount={bulk.pageCount} selectedIds={bulk.selectedIds} allFilteredSelected={bulk.allFilteredSelected} query={bulk.query} config={bulk.config} plan={bulk.plan} error={bulk.error} editingSlot={bulk.editingSlot} editDraft={bulk.editDraft} editError={bulk.editError} onClose={() => setBulkScheduleOpen(false)} onQueryChange={bulk.actions.setQuery} onPageChange={bulk.actions.setPage} onToggleCandidate={bulk.actions.toggleCandidate} onToggleAllFiltered={bulk.actions.toggleAllFiltered} onConfigField={bulk.actions.setConfigField} onToggleInterviewer={bulk.actions.toggleInterviewer} onGenerate={bulk.actions.generatePlan} onRebalance={bulk.actions.rebalance} onApply={bulk.actions.applyPlan} onReset={bulk.actions.reset} onStartEdit={bulk.actions.startEdit} onEditField={bulk.actions.setEditField} onSaveEdit={bulk.actions.saveEdit} onCancelEdit={bulk.actions.cancelEdit}/>
      {calendarDetailOpen && selectedInterview && <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Interview details for ${selectedInterview.candidateName}`}><button type="button" aria-label="Close interview details" onClick={() => setCalendarDetailOpen(false)} className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"/><aside ref={calendarDetailRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col overflow-y-auto bg-slate-50 shadow-2xl"><InterviewWorkspace interview={selectedInterview} onBack={() => setCalendarDetailOpen(false)} onStatusChange={actions.updateStatus} onDecisionRecorded={handleDecisionRecorded}/></aside></div>}
    </div>
  );
};
