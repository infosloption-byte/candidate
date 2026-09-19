import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const SectionHeading = ({ eyebrow, title, description, action }: SectionHeadingProps) => (
  <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-600">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-1.5 text-[26px] font-black leading-tight tracking-[-0.025em] text-slate-950 sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-slate-500 sm:text-sm">
          {description}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
