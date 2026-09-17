import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ title, message, icon = 'search', actionLabel, onAction }: EmptyStateProps) => (
  <section className="grid min-h-64 place-items-center p-6 text-center" aria-live="polite">
    <div className="max-w-sm">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name={icon} size={21}/></div>
      <h2 className="mt-4 text-sm font-black text-slate-800">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{message}</p>
      {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-4 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800">{actionLabel}</button>}
    </div>
  </section>
);
