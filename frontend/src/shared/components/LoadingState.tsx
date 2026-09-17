interface LoadingStateProps {
  label?: string;
  rows?: number;
}

export const LoadingState = ({ label = 'Loading', rows = 4 }: LoadingStateProps) => (
  <section className="mx-auto w-full max-w-4xl p-5 sm:p-8" aria-busy="true" aria-live="polite" aria-label={label}>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, index) => <div key={index} className="flex gap-3"><div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-3 w-2/5 animate-pulse rounded bg-slate-100" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" /></div></div>)}
      </div>
    </div>
  </section>
);
