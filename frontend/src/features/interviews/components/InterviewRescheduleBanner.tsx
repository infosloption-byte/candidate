interface InterviewRescheduleBannerProps {
  candidateName: string;
  changedAt: string;
  onUndo: () => void;
}

const formatChangedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export const InterviewRescheduleBanner = ({ candidateName, changedAt, onUndo }: InterviewRescheduleBannerProps) => (
  <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 sm:px-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-emerald-900">Schedule updated for {candidateName}</p><p className="mt-0.5 text-[10px] text-emerald-800/75">Saved at {formatChangedAt(changedAt)}. The change is recorded in schedule history.</p></div><button type="button" onClick={onUndo} className="self-start rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-black text-emerald-800 hover:bg-emerald-100 sm:self-auto">Undo last move</button></div>
  </div>
);
