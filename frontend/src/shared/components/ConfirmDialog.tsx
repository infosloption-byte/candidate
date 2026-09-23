import { useEffect } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  warning?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  warning,
  confirmLabel,
  cancelLabel = 'Keep interview',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const dialogRef = useFocusTrap<HTMLDivElement>({
    enabled: open,
    onEscape: busy ? undefined : onCancel,
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[3px]"
        onClick={busy ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className={danger
              ? 'grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600'
              : 'grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700'}
            >
              <Icon name={danger ? 'alert' : 'clock'} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">Confirm action</p>
              <h2 id="confirm-dialog-title" className="mt-1 text-base font-black text-slate-950 sm:text-lg">{title}</h2>
              <p id="confirm-dialog-description" className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
          </div>
        </div>

        {warning && (
          <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 sm:mx-6">
            <Icon name="alert" size={15} />
            <p className="text-[11px] leading-5 text-amber-800">{warning}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="secondary" size="sm" disabled={busy} onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" disabled={busy} onClick={onConfirm}>
            {busy ? 'Updating…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
