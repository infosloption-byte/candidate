import { Icon } from '../../../shared/components/Icon';
import type { InterviewRescheduleHistory as RescheduleHistory, Interviewer } from '../types/interview';

interface InterviewRescheduleHistoryProps {
  history: RescheduleHistory[];
  interviewers: Interviewer[];
}

const formatChangedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const InterviewRescheduleHistory = ({ history, interviewers }: InterviewRescheduleHistoryProps) => {
  if (history.length === 0) return null;
  const nameById = new Map(interviewers.map((person) => [person.id, person.name]));
  const latestFirst = [...history].sort((left, right) => right.changedAt.localeCompare(left.changedAt));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="reschedule-history-title">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon name="calendar" size={16}/></div>
        <div><h2 id="reschedule-history-title" className="text-sm font-black text-slate-900">Schedule history</h2><p className="mt-0.5 text-[11px] text-slate-500">Every date, time, or interviewer change is preserved for review.</p></div>
      </div>
      <div className="mt-4 space-y-3">
        {latestFirst.map((item) => {
          const fromInterviewers = item.fromInterviewerIds.map((id) => nameById.get(id) ?? 'Former interviewer').join(', ');
          const toInterviewers = item.toInterviewerIds.map((id) => nameById.get(id) ?? 'Former interviewer').join(', ');
          return <article key={item.id} className={`rounded-xl border p-3 ${item.undoneAt ? 'border-slate-200 bg-slate-50' : 'border-cyan-100 bg-cyan-50/50'}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{item.undoneAt ? 'Reschedule undone' : 'Rescheduled'}</span><time className="text-[10px] font-semibold text-slate-400">{formatChangedAt(item.changedAt)}</time></div><p className="mt-2 text-xs font-bold text-slate-800">{item.fromDate} at {item.fromTime} → {item.toDate} at {item.toTime}</p><p className="mt-1 text-[10px] text-slate-500">{fromInterviewers || 'No interviewer'} → {toInterviewers || 'No interviewer'}</p><p className="mt-2 text-[10px] font-semibold leading-5 text-slate-600">{item.reason}</p>{item.undoneAt && <p className="mt-1 text-[10px] text-slate-400">Undone {formatChangedAt(item.undoneAt)}</p>}</article>;
        })}
      </div>
    </section>
  );
};
