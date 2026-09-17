import { Icon, type IconName } from './Icon';

interface PlaceholderPageProps { title: string; eyebrow: string; description: string; icon: IconName; }

export const PlaceholderPage = ({ title, eyebrow, description, icon }: PlaceholderPageProps) => (
  <section className="mx-auto flex min-h-full max-w-4xl items-center justify-center p-5 sm:p-8" aria-labelledby="placeholder-title">
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon name={icon} size={25} /></div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">{eyebrow}</p>
      <h1 id="placeholder-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
      <div className="mx-auto mt-6 max-w-md rounded-2xl bg-slate-50 p-4 text-left"><p className="text-xs font-bold text-slate-800">Frontend MVP foundation</p><p className="mt-1 text-[11px] leading-5 text-slate-500">This module is represented in the navigation now. Its detailed workflow will be added after the candidate workspace is validated.</p></div>
    </div>
  </section>
);
