import { jobs } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import type { UserRole } from '../../domain/types';

interface JobsPageProps { role: UserRole; }

export const JobsPage = ({ role }: JobsPageProps) => (
  <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow={role === 'INTERVIEWEE' ? 'Open positions' : 'Agency workspace'} title="Jobs" description={role === 'INTERVIEWEE' ? 'Browse published jobs and apply to the positions that match your profile.' : 'Create and publish the job advertisement before candidates can apply.'} action={role === 'INTERVIEWEE' ? undefined : <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="plus" size={16} /> New job</button>} />
    <div className="grid gap-4">
      {jobs.filter((job) => role !== 'INTERVIEWEE' || job.status === 'PUBLISHED').map((job) => <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-slate-950">{job.title}</h2><StatusPill value={job.status} /></div><p className="mt-2 text-sm text-slate-500">{job.description}</p></div>
          {role === 'INTERVIEWEE' ? <button type="button" className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-cyan-600">View & apply</button> : <div className="flex gap-2"><button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Edit</button><button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{job.status === 'PUBLISHED' ? 'Close' : 'Publish'}</button></div>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 text-sm font-bold text-slate-800">{job.location ?? 'Not set'}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Openings</p><p className="mt-1 text-sm font-bold text-slate-800">{job.openings}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published</p><p className="mt-1 text-sm font-bold text-slate-800">{job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'Draft'}</p></div></div>
      </article>)}
    </div>
  </section>
);
