import type { CandidateStatus } from '../../features/candidates/types/candidate';

interface StatusBadgeProps { status: CandidateStatus; compact?: boolean; }

const labels: Record<CandidateStatus, string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  selected: 'Selected',
  reserve: 'Reserve',
  rejected: 'Rejected',
};

const styles: Record<CandidateStatus, string> = {
  new: 'bg-slate-100 text-slate-600 ring-slate-200',
  screening: 'bg-amber-50 text-amber-700 ring-amber-200',
  interview: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  selected: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reserve: 'bg-violet-50 text-violet-700 ring-violet-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const StatusBadge = ({ status, compact = false }: StatusBadgeProps) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 ${compact ? 'py-1 text-[10px]' : 'py-1.5 text-xs'} font-semibold ring-1 ${styles[status]}`}>
    <span className="size-1.5 rounded-full bg-current" />
    {labels[status]}
  </span>
);
