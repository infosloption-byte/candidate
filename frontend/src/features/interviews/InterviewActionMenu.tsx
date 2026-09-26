import { useEffect, useRef, useState } from 'react';
import type { Interview, UserRole } from '../../domain/types';

interface Props {
  interview: Pick<Interview, 'id' | 'status' | 'scheduledAt' | 'durationMins'>;
  role: UserRole;
  now: number;
  onStart: () => void;
  onNoShow: () => void;
  onCancel: () => void;
}

const menuButtonClass = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45';

export const InterviewActionMenu = ({
  interview,
  role,
  now,
  onStart,
  onNoShow,
  onCancel,
}: Props) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const start = new Date(interview.scheduledAt).getTime();
  const end = start + interview.durationMins * 60_000;
  const startable = interview.status === 'SCHEDULED' && now >= start - 15 * 60_000 && now <= end;
  const expired = interview.status === 'SCHEDULED' && now > end;
  const startsLater = interview.status === 'SCHEDULED' && now < start - 15 * 60_000;
  const showInterviewerStart = role === 'INTERVIEWER';
  const showStatusActions = ['SCHEDULED', 'IN_PROGRESS'].includes(interview.status);

  const invoke = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        aria-label="More interview options"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More options"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
          <circle cx="5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="19" cy="12" r="1.7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-[calc(100%+0.5rem)] z-30 min-w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5"
        >
          {showInterviewerStart && (
            <button
              type="button"
              role="menuitem"
              disabled={!startable && !['IN_PROGRESS', 'COMPLETED'].includes(interview.status)}
              className={`${menuButtonClass} text-slate-800`}
              onClick={() => invoke(onStart)}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                  <path d="M8 5.7v12.6a1 1 0 0 0 1.5.86l9.7-6.3a1 1 0 0 0 0-1.72l-9.7-6.3A1 1 0 0 0 8 5.7Z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">
                  {interview.status === 'IN_PROGRESS'
                    ? 'Continue interview'
                    : interview.status === 'COMPLETED'
                      ? 'View interview'
                      : startable
                        ? 'Start interview'
                        : expired
                          ? 'Interview expired'
                          : startsLater
                            ? 'Starts later'
                            : 'Interview unavailable'}
                </span>
                {expired && <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">The scheduled time window has passed.</span>}
                {startsLater && <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">Available 15 minutes before the scheduled time.</span>}
              </span>
            </button>
          )}

          {showStatusActions && (
            <>
              <button
                type="button"
                role="menuitem"
                className={`${menuButtonClass} text-slate-700`}
                onClick={() => invoke(onNoShow)}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M6 8h12M8 5h8l1 15H7L8 5ZM10 11v5M14 11v5" />
                  </svg>
                </span>
                <span>No show</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className={`${menuButtonClass} text-rose-700 hover:bg-rose-50`}
                onClick={() => invoke(onCancel)}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
                    <path d="m8 8 8 8M16 8l-8 8" />
                  </svg>
                </span>
                <span>Cancel interview</span>
              </button>
            </>
          )}

          {!showInterviewerStart && !showStatusActions && (
            <p className="px-3 py-2 text-[11px] font-semibold text-slate-400">No actions available.</p>
          )}
        </div>
      )}
    </div>
  );
};
