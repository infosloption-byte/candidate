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

export const StatusPill = ({ value }: StatusPillProps) => (
  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
    {labels[value] ?? value}
  </span>
);
