import { Icon } from '../../../shared/components/Icon';
import type { Interview } from '../types/interview';

interface InterviewCardProps {
  interview: Interview;
  selected: boolean;
  onSelect: (interviewId: string) => void;
}

const statusLabel: Record<Interview['status'], string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  evaluation: 'Needs evaluation',
  completed: 'Completed',
  'no-show': 'No show',
  cancelled: 'Cancelled',
};

const statusClass: Record<Interview['status'], string> = {
  scheduled: 'bg-cyan-50 text-cyan-700',
  'in-progress': 'bg-amber-50 text-amber-700',
  evaluation: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  'no-show': 'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export const InterviewCard = ({ interview, selected, onSelect }: InterviewCardProps) => {
  const interviewerNames = interview.interviewers.map((interviewer) => interviewer.name).join(', ');

  return (
    <button
      type="button"
      onClick={() => onSelect(interview.id)}
      aria-pressed={selected}
      className={`w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-300 sm:px-5 ${selected ? 'bg-cyan-50/70' : 'bg-white'}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-[11px] font-black text-white">
          {interview.time}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900">{interview.candidateName}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{interview.profession} · {interview.type}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${statusClass[interview.status]}`}>{statusLabel[interview.status]}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1"><Icon name="calendar" size={12}/>{interview.date}</span>
            <span className="inline-flex items-center gap-1"><Icon name="users" size={12}/>{interviewerNames || 'Unassigned'}</span>
          </div>
        </div>
        <Icon name="chevron-right" size={16} className={`mt-3 shrink-0 ${selected ? 'text-cyan-600' : 'text-slate-300'}`} />
      </div>
    </button>
  );
};
