import { agencies } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';

export const AgenciesPage = () => (
  <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow="System administration" title="Agencies & Users" description="Admin manages agency workspaces and their users. Agency data remains isolated by agency ownership." action={<button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="plus" size={16} /> New agency</button>} />
    <div className="grid gap-4 md:grid-cols-2">{agencies.map((agency) => <article key={agency.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{agency.name}</h2><p className="mt-1 text-xs text-slate-400">{agency.slug}</p></div><StatusPill value={agency.status} /></div><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{agency.userCount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Users</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{agency.jobCount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jobs</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{agency.candidateCount}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidates</p></div></div><button type="button" className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Manage users</button></article>)}</div>
  </section>
);
