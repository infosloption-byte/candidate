import { useMemo, useState } from 'react';
import { InterviewCard } from './InterviewCard';
import { Icon } from '../../../shared/components/Icon';
import type { Interview } from '../types/interview';

interface InterviewQueueProps {
  interviews: Interview[];
  selectedInterviewId: string | null;
  onSelect: (interviewId: string) => void;
  onSchedule: () => void;
  onBulkSchedule: () => void;
}

type QueueFilter = 'all' | 'today' | 'attention' | 'completed';

const filterLabels: Array<{ value: QueueFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'completed', label: 'Completed' },
];

const isToday = (dateLabel: string): boolean => {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return dateLabel === today;
};

export const InterviewQueue = ({ interviews, selectedInterviewId, onSelect, onSchedule, onBulkSchedule }: InterviewQueueProps) => {
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [query, setQuery] = useState('');

  const visibleInterviews = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return interviews.filter((interview) => {
      if (filter === 'today' && !isToday(interview.date)) return false;
      if (filter === 'attention' && interview.status !== 'evaluation' && interview.status !== 'in-progress') return false;
      if (filter === 'completed' && interview.status !== 'completed') return false;
      if (!normalized) return true;
      return [interview.candidateName, interview.reference, interview.profession, interview.location, ...interview.interviewers.map((person) => person.name)].join(' ').toLowerCase().includes(normalized);
    });
  }, [filter, interviews, query]);

  return (
    <section className="flex min-h-0 flex-col border-b border-slate-200 bg-white xl:border-b-0 xl:border-r" aria-label="Interview queue">
      <header className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">Interview desk</p><h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">Interview queue</h2><p className="mt-1 text-xs leading-5 text-slate-500">Keep the next conversation and the next action visible.</p></div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2"><button type="button" onClick={onBulkSchedule} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-bold text-cyan-700 hover:bg-cyan-100"><Icon name="calendar" size={14}/>Batch</button><button type="button" onClick={onSchedule} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="plus" size={14}/>Schedule</button></div>
        </div>
        <label className="relative mt-4 block"><span className="sr-only">Search interviews</span><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate, trade, interviewer…" className="field-input bg-slate-50 pl-9"/></label>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">{filterLabels.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold ${filter === item.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{item.label}</button>)}</div>
        <p className="mt-3 text-[10px] text-slate-400">{visibleInterviews.length} interview{visibleInterviews.length === 1 ? '' : 's'} in this view</p>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{visibleInterviews.length === 0 ? <div className="grid min-h-64 place-items-center p-6 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="calendar" size={20}/></div><h3 className="mt-4 text-sm font-black text-slate-800">No interviews here</h3><p className="mt-1 text-xs leading-5 text-slate-500">Try another queue filter or schedule the next interview.</p></div></div> : visibleInterviews.map((interview) => <InterviewCard key={interview.id} interview={interview} selected={interview.id === selectedInterviewId} onSelect={onSelect}/>)}</div>
    </section>
  );
};
