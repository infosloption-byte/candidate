import { Icon } from '../../../shared/components/Icon';

const jobs = [
  { project: 'Dubai Tower Project', role: 'Mason', needed: 20, shortlisted: 14, interview: 8 },
  { project: 'K-18 Commercial Complex', role: 'Shuttering Carpenter', needed: 10, shortlisted: 8, interview: 5 },
  { project: 'Doha Residences', role: 'Welder', needed: 12, shortlisted: 9, interview: 6 },
];

export const JobsPage = () => (
  <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><section className="mx-auto max-w-6xl"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold text-blue-600">Manpower demand</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Jobs</h1><p className="mt-2 text-sm text-slate-500">The future matching engine will use these requirements to surface suitable candidates.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Icon name="plus" size={16} /> New job</button></div><div className="mt-6 grid gap-4">{jobs.map((job) => <article key={`${job.project}-${job.role}`} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{job.project}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{job.role}</h2></div><div className="grid grid-cols-3 gap-6 text-right"><div><p className="text-lg font-bold text-slate-950">{job.needed}</p><p className="text-[11px] text-slate-400">Needed</p></div><div><p className="text-lg font-bold text-slate-950">{job.shortlisted}</p><p className="text-[11px] text-slate-400">Shortlisted</p></div><div><p className="text-lg font-bold text-slate-950">{job.interview}</p><p className="text-[11px] text-slate-400">Interview</p></div></div></div></article>)}</div></section></main>
);
