import { useState } from 'react';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import type { Job, UserRole } from '../../domain/types';

interface JobsPageProps { role: UserRole; }

export const JobsPage = ({ role }: JobsPageProps) => {
  const { state, dispatch } = useRecruitment();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ title: '', description: '', location: '', openings: '1' });
  const candidateId = state.users.find((user) => user.role === 'INTERVIEWEE')?.candidateId;
  const jobs = state.jobs.filter((job) => role !== 'INTERVIEWEE' || job.status === 'PUBLISHED');

  const createJob = () => {
    if (!form.title.trim()) {
      setError('Job title is required.');
      setSuccess('');
      return;
    }

    const job: Job = {
      id: `job-${Date.now()}`,
      agencyId: 'agency-1',
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      openings: Math.max(1, Number(form.openings) || 1),
      status: 'DRAFT',
      publishedAt: null,
    };

    dispatch({ type: 'CREATE_JOB', job });
    setForm({ title: '', description: '', location: '', openings: '1' });
    setShowForm(false);
    setError('');
    setSuccess(`"${job.title}" was created as a draft.`);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'INTERVIEWEE' ? 'Open positions' : 'Agency workspace'}
        title="Jobs"
        description={role === 'INTERVIEWEE' ? 'Browse published jobs and apply to the positions that match your profile.' : 'Create, publish, and close job advertisements.'}
        action={role === 'INTERVIEWEE' ? undefined : (
          <Button onClick={() => { setShowForm((value) => !value); setError(''); }}>
            <Icon name="plus" size={16} /> New job
          </Button>
        )}
      />

      {success && <StateMessage kind="success" title="Job created" description={success} />}
      {showForm && (
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Job title" error={error}>
              <input className="field-input" value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setError(''); }} placeholder="e.g. Mason — Dubai Project" />
            </FormField>
            <FormField label="Location">
              <input className="field-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dubai, UAE" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea className="field-input min-h-24 resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Openings" hint="At least one opening will be stored.">
              <input type="number" min="1" className="field-input" value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })} />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={createJob}>Create draft</Button>
          </div>
        </Card>
      )}

      {jobs.length === 0 ? (
        <StateMessage kind="empty" title="No jobs to show" description={role === 'INTERVIEWEE' ? 'Published opportunities will appear here.' : 'Create your first job advertisement to start the recruitment flow.'} />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const alreadyApplied = candidateId ? state.applications.some((application) => application.jobId === job.id && application.candidateId === candidateId) : false;
            return (
              <Card key={job.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">{job.title}</h2>
                      <StatusPill value={job.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{job.description ?? 'No description provided.'}</p>
                  </div>
                  {role === 'INTERVIEWEE' ? (
                    <Button
                      onClick={() => {
                        if (!candidateId || alreadyApplied) return;
                        dispatch({
                          type: 'APPLY_TO_JOB',
                          application: {
                            id: `app-${Date.now()}`,
                            jobId: job.id,
                            candidateId,
                            status: 'APPLIED',
                            appliedAt: new Date().toISOString(),
                          },
                        });
                        setSuccess(`Application submitted for "${job.title}".`);
                      }}
                      disabled={alreadyApplied}
                    >
                      {alreadyApplied ? 'Applied' : 'View & apply'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => dispatch({
                        type: 'SET_JOB_STATUS',
                        jobId: job.id,
                        status: job.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED',
                      })}
                    >
                      {job.status === 'PUBLISHED' ? 'Close' : 'Publish'}
                    </Button>
                  )}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 text-sm font-bold text-slate-800">{job.location ?? 'Not set'}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Openings</p><p className="mt-1 text-sm font-bold text-slate-800">{job.openings}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published</p><p className="mt-1 text-sm font-bold text-slate-800">{job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'Draft'}</p></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
