import type { ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ModalProps {
  /** Defaults to true so callers can render `<Modal>` conditionally, as the old inline popups did. */
  open?: boolean;
  onClose: () => void;
  /** Accessible name: pass `labelledBy` (id of a visible heading) or `ariaLabel`. */
  labelledBy?: string;
  ariaLabel?: string;
  /** Id of the element that describes the popup (used by confirmation dialogs). */
  describedBy?: string;
  /** Screen-reader label for the invisible backdrop button. */
  closeLabel?: string;
  /**
   * Whether clicking the dark backdrop closes the popup. Turn this off for forms and long
   * workflows, where a stray click outside would throw away what the user typed.
   */
  dismissOnBackdrop?: boolean;
  /** Blocks Escape and backdrop close, e.g. while a save request is running. */
  busy?: boolean;
  /** Tailwind layout classes for the full-screen container (alignment, padding, z-index). */
  containerClassName?: string;
  /** Tailwind classes for the dialog panel (width, radius, padding). */
  panelClassName?: string;
  role?: 'dialog' | 'alertdialog';
  children: ReactNode;
}

const DEFAULT_CONTAINER = 'z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6';
const DEFAULT_PANEL = 'my-auto w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6';

/**
 * The one popup shell for the app: dark blurred backdrop, focus trap, Escape handling, scroll lock
 * and dialog semantics. Every popup goes through this so a fix here applies everywhere.
 */
export const Modal = ({
  open = true,
  onClose,
  labelledBy,
  ariaLabel,
  describedBy,
  closeLabel = 'Close dialog',
  dismissOnBackdrop = true,
  busy = false,
  containerClassName = DEFAULT_CONTAINER,
  panelClassName = DEFAULT_PANEL,
  role = 'dialog',
  children,
}: ModalProps) => {
  const panelRef = useFocusTrap<HTMLDivElement>({
    enabled: open,
    onEscape: () => { if (!busy) onClose(); },
  });

  if (!open) return null;

  return (
    <div className={'fixed inset-0 ' + containerClassName} role="presentation">
      {/* Always rendered so the page is dimmed; only clickable when dismissing is safe. */}
      {dismissOnBackdrop ? (
        <button
          type="button"
          aria-label={closeLabel}
          tabIndex={-1}
          className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          onClick={() => { if (!busy) onClose(); }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" aria-hidden="true" />
      )}
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={'relative z-10 ' + panelClassName}
      >
        {children}
      </div>
    </div>
  );
};
