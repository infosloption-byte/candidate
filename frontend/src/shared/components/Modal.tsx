import type { ReactNode } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ModalProps {
  open?: boolean;
  onClose: () => void;
  labelledBy?: string;
  ariaLabel?: string;
  describedBy?: string;
  closeLabel?: string;
  /** Backdrop dismissal is opt-in so forms and long workflows cannot lose typed data accidentally. */
  dismissOnBackdrop?: boolean;
  /** Blocks Escape and backdrop close, e.g. while a save request is running. */
  busy?: boolean;
  containerClassName?: string;
  panelClassName?: string;
  role?: 'dialog' | 'alertdialog';
  children: ReactNode;
}

const DEFAULT_CONTAINER = 'z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6';
const DEFAULT_PANEL = 'my-auto w-full max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6';

/**
 * Shared popup shell: backdrop, focus trap, Escape handling, scroll lock and dialog semantics.
 * Backdrop dismissal is deliberately opt-in; forms should not lose entered data from an outside click.
 */
export const Modal = ({
  open = true,
  onClose,
  labelledBy,
  ariaLabel,
  describedBy,
  closeLabel = 'Close dialog',
  dismissOnBackdrop = false,
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
