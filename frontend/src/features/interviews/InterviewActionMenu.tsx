import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    const reposition = () => {
      const button = buttonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;

      const buttonRect = button.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 8;
      const viewportPadding = 12;
      const spaceAbove = buttonRect.top - viewportPadding;
      const spaceBelow = window.innerHeight - buttonRect.bottom - viewportPadding;
      const nextPlacement: "top" | "bottom" =
        spaceBelow >= menuRect.height + gap || spaceBelow >= spaceAbove ? "bottom" : "top";

      const rawTop = nextPlacement === "top"
        ? buttonRect.top - menuRect.height - gap
        : buttonRect.bottom + gap;
      const top = Math.min(
        Math.max(viewportPadding, rawTop),
        Math.max(viewportPadding, window.innerHeight - menuRect.height - viewportPadding),
      );

      const rawLeft = buttonRect.right - menuRect.width;
      const left = Math.min(
        Math.max(viewportPadding, rawLeft),
        Math.max(viewportPadding, window.innerWidth - menuRect.width - viewportPadding),
      );

      setPlacement(nextPlacement);
      setMenuPosition({ top, left });
    };

    const frame = window.requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const start = new Date(interview.scheduledAt).getTime();
  const end = start + interview.durationMins * 60_000;
  const startable = interview.status === "SCHEDULED" && now >= start - 15 * 60_000 && now <= end;
  const expired = interview.status === "SCHEDULED" && now > end;
  const startsLater = interview.status === "SCHEDULED" && now < start - 15 * 60_000;
  const showInterviewerStart = role === "INTERVIEWER";
  const showStatusActions = ["SCHEDULED", "IN_PROGRESS"].includes(interview.status);

  const invoke = (action: () => void) => {
    setOpen(false);
    action();
  };

  const menu = open ? createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Interview actions"
      className="fixed z-[70] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-slate-100"
      style={{
        top: menuPosition?.top ?? 0,
        left: menuPosition?.left ?? 0,
        visibility: menuPosition ? "visible" : "hidden",
      }}
    >
      <div className="max-h-[min(22rem,calc(100dvh-2rem))] overflow-y-auto">
        {showInterviewerStart && (
          <button
            type="button"
            role="menuitem"
            disabled={!startable && !["IN_PROGRESS", "COMPLETED"].includes(interview.status)}
            className={menuButtonClass + " text-slate-800"}
            onClick={() => invoke(onStart)}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                <path d="M8 5.7v12.6a1 1 0 0 0 1.5.86l9.7-6.3a1 1 0 0 0 0-1.72l-9.7-6.3A1 1 0 0 0 8 5.7Z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">
                {interview.status === "IN_PROGRESS"
                  ? "Continue interview"
                  : interview.status === "COMPLETED"
                    ? "View interview"
                    : startable
                      ? "Start interview"
                      : expired
                        ? "Interview expired"
                        : startsLater
                          ? "Starts later"
                          : "Interview unavailable"}
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
              className={menuButtonClass + " text-slate-700"}
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
              className={menuButtonClass + " text-rose-700 hover:bg-rose-50"}
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
      <span
        className={"pointer-events-none absolute " + (placement === "bottom" ? "-top-1.5 right-3" : "-bottom-1.5 right-3") + " size-3 rotate-45 border " + (placement === "bottom" ? "border-b-0 border-r-0" : "border-t-0 border-l-0") + " border-slate-200 bg-white"}
        aria-hidden="true"
      />
    </div>,
    document.body,
  ) : null;

  return (
    <div ref={rootRef} className="flex w-full items-end sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        className={"grid size-10 place-items-center rounded-xl border bg-white shadow-sm transition " + (open ? "border-cyan-300 text-cyan-700 ring-2 ring-cyan-50" : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900")}
        aria-label="More interview options"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More options"
        onClick={() => {
          setOpen((current) => {
            const next = !current;
            if (next) setMenuPosition(null);
            return next;
          });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      {menu}
    </div>
  );
};