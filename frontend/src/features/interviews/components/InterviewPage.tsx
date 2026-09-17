import { useState } from 'react';
import { InterviewQueue } from './InterviewQueue';
import { InterviewWorkspace } from './InterviewWorkspace';
import { ScheduleInterviewDrawer } from './ScheduleInterviewDrawer';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';
import { useInterviewWorkspace } from '../hooks/useInterviewWorkspace';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import type { CandidateStatus, RejectionReason } from '../../candidates/types/candidate';
import type { Decision, Interview } from '../types/interview';

const candidateRejectionReasons: RejectionReason[] = ['Technical skill', 'Experience gap', 'Required skill missing', 'Communication', 'Documents', 'Availability', 'Client requirement', 'Other'];

const mapRejectionReason = (reason: string): RejectionReason => candidateRejectionReasons.includes(reason as RejectionReason) ? reason as RejectionReason : 'Other';

export const InterviewPage = () => {
  const { state, selectedInterview, sortedInterviews, interviewers, metrics, actions } = useInterviewWorkspace();
  const { state: candidateState, actions: candidateActions } = useCandidateWorkspace();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  if (state.loadState === 'loading') return <LoadingState label="Loading interviews" rows={5} />;
  if (state.loadState === 'error') return <ErrorState title="We could not load interviews" message={state.errorMessage ?? 'Interview data is temporarily unavailable.'} onRetry={actions.retryLoad} />;

  const scheduleCandidates = candidateState.candidates.filter((candidate) => candidate.status !== 'rejected');
  const handleCreateInterview = (interview: Interview) => {
    actions.createInterview(interview);
    candidateActions.moveToInterview(interview.candidateId);
  };
  const handleDecisionRecorded = (candidateId: string, decision: Exclude<Decision, 'pending'>, score: number, date: string, interviewer: string, profession: string, reason: string, note: string) => {
    const candidateStatus: Extract<CandidateStatus, 'selected' | 'reserve' | 'rejected'> = decision;
    const candidateReason: RejectionReason | '' = decision === 'rejected' ? mapRejectionReason(reason) : '';
    candidateActions.recordInterviewOutcome(candidateId, candidateStatus, date, interviewer, profession, score, candidateReason, note);
  };

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-slate-950">Interviews</h1><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{metrics.total}</span></div>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">Schedule, conduct and document interviews without losing the candidate context.</p>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:min-w-[420px]">
            <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-slate-400">Scheduled</p><p className="mt-1 text-sm font-black text-slate-900">{metrics.scheduled}</p></div>
            <div className="rounded-xl bg-violet-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-violet-600">Evaluation</p><p className="mt-1 text-sm font-black text-violet-800">{metrics.evaluation}</p></div>
            <div className="rounded-xl bg-emerald-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-emerald-600">Completed</p><p className="mt-1 text-sm font-black text-emerald-800">{metrics.completed}</p></div>
            <div className="rounded-xl bg-amber-50 p-2.5"><p className="text-[9px] uppercase tracking-wider text-amber-600">Attention</p><p className="mt-1 text-sm font-black text-amber-800">{metrics.needsDecision}</p></div>
          </div>
        </div>
      </header>

      {candidateState.loadState === 'error' && <div className="mx-4 mt-4 sm:mx-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Candidate data could not be loaded, so scheduling is temporarily unavailable.</div></div>}

      <div className="grid min-h-0 flex-1 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className={`${mobileDetailOpen ? 'hidden xl:block' : 'block'} min-h-0`}>
          <InterviewQueue interviews={sortedInterviews} selectedInterviewId={selectedInterview?.id ?? null} onSelect={(id) => { actions.selectInterview(id); setMobileDetailOpen(true); }} onSchedule={actions.openSchedule}/>
        </div>
        <div className={`${mobileDetailOpen ? 'block' : 'hidden xl:block'} min-w-0`}>
          <InterviewWorkspace interview={selectedInterview} onBack={() => setMobileDetailOpen(false)} onStatusChange={actions.updateStatus} onDecisionRecorded={handleDecisionRecorded}/>
        </div>
      </div>

      {sortedInterviews.length === 0 && <div className="pointer-events-none fixed inset-0 z-10 hidden place-items-center xl:grid"><div className="pointer-events-auto"><EmptyState title="No interviews scheduled" message="Create the first interview from the queue to start building your interview history." icon="calendar" actionLabel="Schedule interview" onAction={actions.openSchedule}/></div></div>}

      <ScheduleInterviewDrawer open={state.isScheduleDrawerOpen} candidates={scheduleCandidates} interviewers={interviewers} onClose={actions.closeSchedule} onCreate={handleCreateInterview}/>
    </div>
  );
};
