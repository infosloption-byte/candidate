import { useMemo } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { buildInterviewHistory, type InterviewHistoryEventKind } from '../services/interviewHistory';
import type { Interview } from '../types/interview';

interface InterviewHistoryTimelineProps {
  candidateId: string;
  interviews: Interview[];
}

const kindLabel: Record<InterviewHistoryEventKind, string> = {
  interview: 'Interview',
  reschedule: 'Schedule',
  decision: 'Decision',
};

const kindClass: Record<InterviewHistoryEventKind, string> = {
  interview: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  reschedule: 'bg-amber-50 text-amber-700 ring-amber-100',
  decision: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

const eventIcon: Record<InterviewHistoryEventKind, 'calendar' | 'clock' | 'check'> = {
  interview: 'calendar',
  reschedule: 'clock',
  decision: 'check',
};

const formatEventTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const InterviewHistoryTimeline = ({ candidateId, interviews }: InterviewHistoryTimelineProps) => {
  const candidateInterviews = useMemo(
    () => interviews.filter((interview) => interview.candidateId === candidateId),
    [candidateId, interviews],
  );
  const events = useMemo(() => buildInterviewHistory(candidateInterviews), [candidateInterviews]);

  if (candidateInterviews.length === 0) return null;

  const decisionCount = events.filter((event) => event.kind === 'decision').length;
  const rescheduleCount = events.filter((event) => event.kind === 'reschedule').length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="interview-history-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500" title="Interview history"><Icon name="calendar" size={16}/></div>
          <div>
            <h2 id="interview-history-title" className="text-sm font-black text-slate-900">Interview history & audit</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-slate-500">Appointments, schedule changes, and recorded decisions for this candidate.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[9px] font-black">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600" title="Total interviews for this candidate">{candidateInterviews.length} interview{candidateInterviews.length === 1 ? '' : 's'}</span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700" title="Recorded final decision changes">{decisionCount} decision{decisionCount === 1 ? '' : 's'}</span>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700" title="Recorded schedule changes">{rescheduleCount} reschedule{rescheduleCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      <ol className="mt-5 space-y-3" aria-label="Candidate interview audit timeline">
        {events.map((event) => (
          <li key={event.id} className="relative pl-10">
            <div className="absolute left-0 top-0.5 grid size-7 place-items-center rounded-full bg-white ring-1 ring-slate-200" aria-hidden="true">
              <Icon name={eventIcon[event.kind]} size={13}/>
            </div>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label={`${kindLabel[event.kind]}: ${event.title}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-1 text-[9px] font-black ring-1 ${kindClass[event.kind]}`}>{kindLabel[event.kind]}</span>
                <time className="text-[9px] font-semibold text-slate-400" dateTime={event.occurredAt}>{formatEventTime(event.occurredAt)}</time>
              </div>
              <h3 className="mt-2 text-xs font-black text-slate-800">{event.title}</h3>
              <p className="mt-1 text-[10px] leading-5 text-slate-600">{event.detail}</p>
              <p className="mt-1 text-[9px] font-semibold text-slate-400">{event.meta}{event.isUndone ? ' · Reverted' : ''}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
};
