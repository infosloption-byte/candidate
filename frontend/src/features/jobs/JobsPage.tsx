import { useState } from 'react';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import type { Job, UserRole } from '../../domain/types';

interface JobsPageProps { role: UserRole; }

export const JobsPage = ({ role }: JobsPageProps) => {
  const { state, dispatch } = useRecruitment();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', openings: '1' });
  const candidateId = state.users.find((user) => user.role === 'INTERVIEWEE')?.candidateId;
  const createJob = () => {
    if (!form.title.trim()) return;
    const job: Job = { id: `job-${Date.now()}`, agencyId: 'agency-1', title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null, openings: Math.max(1, Number(form.openings) || 1), status: 'DRAFT', publishedAt: null };
    dispatch({ type: 'CREATE_JOB', job });
    setForm({ title: '', description: '', location: '', openings: '1' });
    setShowForm(false);
  };

  return <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow={role === 'INTERVIEWEE' ? 'Open positions' : 'Agency workspace'} title="Jobs" description={role === 'INTERVIEWEE' ? 'Browse published jobs and apply to the positions that match your profile.' : 'Create, publish, and close job advertisements.'} action={role === 'INTERVIEWEE' ? undefined : <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="plus" size={16} /> New job</button>} />
    {showForm && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><div><label className="field-label">Job title</label><input className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mason — Dubai Project" /></div><div><label className="field-label">Location</label><input className="field-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dubai, UAE" /></div><div className="md:col-span-2"><label className="field-label">Description</label><textarea className="field-input min-h-24 resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div><label className="field-label">Openings</label><input type="number" min="1" className="field-input" value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })} /></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="button" onClick={createJob} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Create draft</button></div></div>}
    <div className="grid gap-4">{state.jobs.filter((job) => role !== 'INTERVIEWEE' || job.status === 'PUBLISHED').map((job) => {
      const alreadyApplied = candidateId ? state.applications.some((application) => application.jobId === job.id && application.candidateId === candidateId) : false;
      return <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-slate-950">{job.title}</h2><StatusPill value={job.status} /></div><p className="mt-2 text-sm text-slate-500">{job.description}</p></div>{role === 'INTERVIEWEE' ? <button type="button" disabled={alreadyApplied} onClick={() => candidateId && dispatch({ type: 'APPLY_TO_JOB', application: { id: `app-${Date.now()}`, jobId: job.id, candidateId, status: 'APPLIED', appliedAt: new Date().toISOString() } })} className="rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">{alreadyApplied ? 'Applied' : 'View & apply'}</button> : <div className="flex gap-2"><button type="button" onClick={() => dispatch({ type: 'SET_JOB_STATUS', jobId: job.id, status: job.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED' })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">{job.status === 'PUBLISHED' ? 'Close' : 'Publish'}</button></div>}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 text-sm font-bold text-slate-800">{job.location ?? 'Not set'}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Openings</p><p className="mt-1 text-sm font-bold text-slate-800">{job.openings}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published</p><p className="mt-1 text-sm font-bold text-slate-800">{job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'Draft'}</p></div></div></article>;
    })}</div>
  </section>;
};
