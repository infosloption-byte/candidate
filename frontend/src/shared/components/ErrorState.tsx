import { Icon } from './Icon';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

export const ErrorState = ({ title, message, onRetry, retryLabel = 'Try again' }: ErrorStateProps) => (
  <section className="mx-auto grid min-h-full max-w-lg place-items-center p-5 text-center sm:p-8" role="alert" aria-live="assertive">
    <div className="w-full rounded-3xl border border-rose-200 bg-white p-7 shadow-sm sm:p-8">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600"><Icon name="alert" size={25}/></div>
      <h1 className="mt-4 text-lg font-black text-slate-900">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800">{retryLabel}</button>
    </div>
  </section>
);
