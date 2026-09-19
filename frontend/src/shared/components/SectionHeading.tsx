import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const SectionHeading = ({ eyebrow, title, description, action }: SectionHeadingProps) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-600">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
    </div>
    {action}
  </div>
);
