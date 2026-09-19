import { Icon } from './Icon';

type StateMessageKind = 'loading' | 'empty' | 'error' | 'success';

interface StateMessageProps {
  kind: StateMessageKind;
  title: string;
  description?: string;
}

const config: Record<StateMessageKind, { icon: 'clock' | 'file' | 'alert' | 'check'; className: string }> = {
  loading: { icon: 'clock', className: 'border-cyan-100 bg-cyan-50 text-cyan-800' },
  empty: { icon: 'file', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  error: { icon: 'alert', className: 'border-rose-200 bg-rose-50 text-rose-800' },
  success: { icon: 'check', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
};

export const StateMessage = ({ kind, title, description }: StateMessageProps) => {
  const item = config[kind];
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 ${item.className}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="mt-0.5 shrink-0"><Icon name={item.icon} size={16} /></span>
      <div>
        <p className="text-xs font-black">{title}</p>
        {description && <p className="mt-1 text-xs opacity-80">{description}</p>}
      </div>
    </div>
  );
};
