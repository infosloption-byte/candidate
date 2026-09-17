import { InterviewScorecard } from './InterviewScorecard';
import { PracticalTestPanel } from './PracticalTestPanel';
import { InterviewDecisionPanel } from './InterviewDecisionPanel';
import { InterviewRescheduleHistory } from './InterviewRescheduleHistory';
import { Icon } from '../../../shared/components/Icon';
import { useInterviewScorecard } from '../hooks/useInterviewScorecard';
import type { Decision, Interview, InterviewStatus, Interviewer, PracticalResult } from '../types/interview';

interface InterviewWorkspaceProps {
  interview: Interview | null;
  interviewers: Interviewer[];
  onBack?: () => void;
  onStatusChange: (interviewId: string, status: InterviewStatus) => void;
  onDecisionRecorded: (candidateId: string, decision: Exclude<Decision, 'pending'>, score: number, date: string, interviewer: string, profession: string, reason: string, note: string) => void;
  onReschedule?: (interviewId: string) => void;
}

const statusLabel: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  evaluation: 'Evaluation',
  completed: 'Completed',
  'no-show': 'No show',
  cancelled: 'Cancelled',
};

const statusClass: Record<InterviewStatus, string> = {
  scheduled: 'bg-cyan-50 text-cyan-700',
  'in-progress': 'bg-amber-50 text-amber-700',
  evaluation: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  'no-show': 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const InterviewWorkspace = ({ interview, interviewers, onBack, onStatusChange, onDecisionRecorded, onReschedule }: InterviewWorkspaceProps) => {
  const scorecard = useInterviewScorecard(interview);

  if (!interview) return <section className="grid min-h-full place-items-center bg-slate-50 p-8"><div className="max-w-sm text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm"><Icon name="calendar" size={24}/></div><h2 className="mt-4 text-base font-black text-slate-800">Select an interview</h2><p className="mt-1 text-sm leading-6 text-slate-500">Choose an appointment from the queue to review its schedule, evidence and decision.</p></div></section>;

  const startInterview = () => onStatusChange(interview.id, 'in-progress');
  const openEvaluation = () => onStatusChange(interview.id, 'evaluation');
  const markNoShow = () => onStatusChange(interview.id, 'no-show');
  const cancelInterview = () => onStatusChange(interview.id, 'cancelled');
  const canEditEvidence = interview.status === 'in-progress' || interview.status === 'evaluation';
  const finalDecisionRecorded = interview.decision.decision !== 'pending';

  const handlePracticalResult = (itemId: string, result: PracticalResult) => scorecard.setPracticalResult(itemId, result);
  const handleDecision = (decision: Decision, reason: string, note: string) => {
    if (decision === 'pending') return;
    scorecard.setDecision(decision, reason, note);
    onDecisionRecorded(
      interview.candidateId,
      decision,
      scorecard.progress.totalScore ?? 0,
      interview.date,
      interview.interviewers[0]?.name ?? 'Interview panel',
      interview.profession,
      reason,
      note,
    );
  };

  return (
    <section className="min-h-full bg-slate-50" aria-label={`Interview workspace for ${interview.candidateName}`}>
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          {onBack && <button type="button" onClick={onBack} aria-label="Back to interview queue" className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 xl:hidden"><Icon name="arrow-left" size={17}/></button>}
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-sm font-black text-white">{interview.candidateName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-black tracking-tight text-slate-950">{interview.candidateName}</h1><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass[interview.status]}`}>{statusLabel[interview.status]}</span></div><p className="mt-1 text-sm text-slate-500">{interview.profession} · {interview.type} · {interview.reference}</p><p className="mt-1 text-xs text-slate-400">{interview.date} at {interview.time} · {interview.durationMinutes} min · {interview.location}</p></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2"><div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2"><span className="text-[10px] font-bold text-slate-400">Interviewers</span>{interview.interviewers.map((person) => <span key={person.id} className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200">{person.name}</span>)}</div></div>

        <div className="mt-4 flex flex-wrap gap-2">
          {interview.status === 'scheduled' && onReschedule && <button type="button" onClick={() => onReschedule(interview.id)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-2.5 text-xs font-bold text-cyan-700 hover:bg-cyan-100">Reschedule</button>}
          {interview.status === 'scheduled' && <><button type="button" onClick={startInterview} className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Start interview</button><button type="button" onClick={markNoShow} className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100">No show</button><button type="button" onClick={cancelInterview} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button></>}
          {interview.status === 'in-progress' && <button type="button" onClick={openEvaluation} className="rounded-xl bg-violet-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-violet-700">Open evaluation</button>}
          {interview.status === 'evaluation' && <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3.5 py-2.5 text-xs font-bold text-violet-700"><Icon name="sparkles" size={14}/>Evaluation mode</span>}
          {finalDecisionRecorded && <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700"><Icon name="check" size={14}/>Decision recorded</span>}
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="interview-notes-title"><div className="flex items-start justify-between gap-3"><div><h2 id="interview-notes-title" className="text-sm font-black text-slate-900">Interview notes</h2><p className="mt-0.5 text-[11px] text-slate-500">Capture context that is useful alongside the scorecard.</p></div><span className="text-[10px] font-semibold text-slate-400">Autosaved locally</span></div><textarea rows={4} value={interview.notes} onChange={(event) => canEditEvidence && scorecard.setInterviewNote(event.target.value)} disabled={!canEditEvidence} className="field-input mt-4 min-h-28 resize-y bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" placeholder="What stood out? What should the next reviewer know?"/></section>

        <InterviewScorecard interview={interview} completedCriteria={scorecard.progress.completedCriteria} totalCriteria={scorecard.progress.totalCriteria} totalScore={scorecard.progress.totalScore} editable={canEditEvidence} onScore={scorecard.setScore} onCriterionNote={scorecard.setCriterionNote}/>
        <PracticalTestPanel interview={interview} editable={canEditEvidence} onResult={handlePracticalResult} onNote={scorecard.setPracticalNote}/>
        <InterviewDecisionPanel interview={interview} canComplete={scorecard.canComplete && canEditEvidence} validationMessage={scorecard.validationMessage} onSubmit={handleDecision}/>
        <InterviewRescheduleHistory history={interview.rescheduleHistory ?? []} interviewers={interviewers}/>
      </div>
    </section>
  );
};
