interface StatusPillProps {
  value: string;
}

const labels: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  CLOSED: 'Closed',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  COMPLETED: 'Completed',
  SCHEDULED: 'Scheduled',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

const toneClasses: Record<string, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  PUBLISHED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  SELECTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-800',
  SCREENING: 'border-amber-200 bg-amber-50 text-amber-800',
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-600',
  NOT_STARTED: 'border-slate-200 bg-slate-50 text-slate-600',
  SCHEDULED: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  INTERVIEW: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  APPLIED: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  SHORTLISTED: 'border-violet-200 bg-violet-50 text-violet-700',
  INACTIVE: 'border-slate-300 bg-slate-100 text-slate-500',
  CLOSED: 'border-slate-300 bg-slate-100 text-slate-600',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  WITHDRAWN: 'border-rose-200 bg-rose-50 text-rose-700',
  CANCELLED: 'border-rose-200 bg-rose-50 text-rose-700',
  NO_SHOW: 'border-rose-200 bg-rose-50 text-rose-700',
  SUBMITTED: 'border-cyan-200 bg-cyan-50 text-cyan-700',
};

export const StatusPill = ({ value }: StatusPillProps) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${toneClasses[value] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>
    {labels[value] ?? value}
  </span>
);
