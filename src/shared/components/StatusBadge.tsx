import type { CandidateStatus } from '../../features/candidates/types/candidate';

interface StatusBadgeProps {
  status: CandidateStatus;
}

const statusStyles: Record<CandidateStatus, string> = {
  new: 'bg-slate-100 text-slate-700 ring-slate-200',
  screening: 'bg-amber-50 text-amber-700 ring-amber-200',
  interview: 'bg-blue-50 text-blue-700 ring-blue-200',
  selected: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reserve: 'bg-violet-50 text-violet-700 ring-violet-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const statusLabels: Record<CandidateStatus, string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  selected: 'Selected',
  reserve: 'Reserve',
  rejected: 'Rejected',
};

export const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[status]}`}>
    {statusLabels[status]}
  </span>
);
