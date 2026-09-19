import { useEffect, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Job, UserRole } from '../../domain/types';

interface JobsPageProps { role: UserRole; }

interface ApplicationSummary {
  id: string;
  jobId: string;
}

const emptyForm = { title: '', description: '', location: '', openings: '1' };

export const JobsPage = ({ role }: JobsPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [jobs, setJobs] = useState<Job[]>(developmentMode ? state.jobs : []);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [applying, setApplying] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (developmentMode) {
      setJobs(state.jobs);
      if (role === 'INTERVIEWEE') {
        setAppliedJobIds(new Set(
          state.applications
            .filter((application) => application.candidateId === user?.candidateId || application.candidateId === 'candidate-1')
            .map((application) => application.jobId),
        ));
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const jobsRequest = apiFetch<Job[]>('/jobs');
    const applicationsRequest = role === 'INTERVIEWEE'
      ? apiFetch<ApplicationSummary[]>('/applications')
      : Promise.resolve([] as ApplicationSummary[]);

    Promise.all([jobsRequest, applicationsRequest])
      .then(([jobResult, applicationResult]) => {
        if (cancelled) return;
        setJobs(jobResult);
        setAppliedJobIds(new Set(applicationResult.map((application) => application.jobId)));
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load jobs.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, role, state.applications, state.jobs, user?.candidateId, user?.id]);

  const closeForm = () => {
    setShowForm(false);
    setEditingJobId(null);
    setForm(emptyForm);
  };

  const beginEdit = (job: Job) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title,
      description: job.description ?? '',
      location: job.location ?? '',
      openings: String(job.openings),
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const saveJob = async () => {
    if (!form.title.trim()) {
      setError('Job title is required.');
      return;
    }

    if (!user?.agencyId && !developmentMode) {
      setError('Your account is not linked to an agency.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingJobId) {
        const current = jobs.find((job) => job.id === editingJobId);
        if (!current) throw new Error('The selected job could not be found.');

        const updated: Job = developmentMode
          ? {
              ...current,
              title: form.title.trim(),
              description: form.description.trim() || null,
              location: form.location.trim() || null,
              openings: Math.max(1, Number(form.openings) || 1),
            }
          : await apiFetch<Job>('/jobs/' + editingJobId, {
              method: 'PATCH',
              body: JSON.stringify({
                title: form.title.trim(),
                description: form.description.trim() || null,
                location: form.location.trim() || null,
                openings: Math.max(1, Number(form.openings) || 1),
              }),
            });

        setJobs((currentJobs) => currentJobs.map((job) => job.id === updated.id ? updated : job));
        closeForm();
        setSuccessTitle('Job updated');
        setSuccess('"' + updated.title + '" was updated.');
        return;
      }

      const draft: Job = {
        id: 'job-' + Date.now(),
        agencyId: user?.agencyId ?? 'agency-1',
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        openings: Math.max(1, Number(form.openings) || 1),
        status: 'DRAFT',
        publishedAt: null,
      };

      const created = developmentMode
        ? draft
        : await apiFetch<Job>('/agencies/' + user!.agencyId + '/jobs', {
            method: 'POST',
            body: JSON.stringify({
              title: draft.title,
              description: draft.description,
              location: draft.location,
              openings: draft.openings,
            }),
          });

      if (developmentMode) dispatch({ type: 'CREATE_JOB', job: draft });
      setJobs((current) => [created, ...current]);
      closeForm();
      setSuccessTitle('Job created');
      setSuccess('"' + created.title + '" was created as a draft.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the job.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (job: Job) => {
    const nextStatus = job.status === 'PUBLISHED' ? 'CLOSED' : 'PUBLISHED';
    setError('');

    try {
      const updated = developmentMode
        ? {
            ...job,
            status: nextStatus,
            publishedAt: nextStatus === 'PUBLISHED' ? (job.publishedAt ?? new Date().toISOString()) : job.publishedAt,
          }
        : await apiFetch<Job>('/jobs/' + job.id, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
          });

      if (developmentMode) {
        dispatch({ type: 'SET_JOB_STATUS', jobId: job.id, status: nextStatus });
      }

      setJobs((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccessTitle(nextStatus === 'PUBLISHED' ? 'Job published' : 'Job closed');
      setSuccess('"' + job.title + '" is now ' + nextStatus.toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the job.');
    }
  };

  const applyToJob = async (job: Job) => {
    if (appliedJobIds.has(job.id)) return;

    if (!user?.candidateId && !developmentMode) {
      setError('Your account is not linked to a candidate profile.');
      return;
    }

    setApplying(job.id);
    setError('');

    try {
      if (developmentMode) {
        dispatch({
          type: 'APPLY_TO_JOB',
          application: {
            id: 'app-' + Date.now(),
            jobId: job.id,
            candidateId: user?.candidateId ?? 'candidate-1',
            status: 'APPLIED',
            appliedAt: new Date().toISOString(),
          },
        });
      } else {
        await apiFetch('/jobs/' + job.id + '/applications', {
          method: 'POST',
          body: JSON.stringify({}),
        });
      }

      setAppliedJobIds((current) => new Set(current).add(job.id));
      setSuccessTitle('Application submitted');
      setSuccess('Your application for "' + job.title + '" has been submitted.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit the application.');
    } finally {
      setApplying(null);
    }
  };

  const visibleJobs = jobs.filter((job) => role !== 'INTERVIEWEE' || job.status === 'PUBLISHED');

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'INTERVIEWEE' ? 'Open positions' : 'Agency workspace'}
        title="Jobs"
        description={role === 'INTERVIEWEE' ? 'Browse published jobs and apply to the positions that match your profile.' : 'Create, edit, publish, and close job advertisements.'}
        action={role === 'INTERVIEWEE' ? undefined : (
          <Button onClick={() => { setEditingJobId(null); setForm(emptyForm); setShowForm((value) => !value); setError(''); }}>
            <Icon name="plus" size={16} /> New job
          </Button>
        )}
      />

      {loading && <StateMessage kind="loading" title="Loading jobs" description="Fetching the latest job advertisements." />}
      {error && <StateMessage kind="error" title="Job action failed" description={error} />}
      {success && <StateMessage kind="success" title={successTitle} description={success} />}

      {showForm && (
        <Card>
          <h2 className="text-sm font-black text-slate-950">{editingJobId ? 'Edit job' : 'Create job'}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField label="Job title">
              <input className="field-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Mason — Dubai Project" />
            </FormField>
            <FormField label="Location">
              <input className="field-input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Dubai, UAE" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea className="field-input min-h-24 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </FormField>
            </div>
            <FormField label="Openings" hint="At least one opening will be stored.">
              <input type="number" min="1" className="field-input" value={form.openings} onChange={(event) => setForm({ ...form, openings: event.target.value })} />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button disabled={saving} onClick={() => void saveJob()}>{saving ? 'Saving…' : editingJobId ? 'Save changes' : 'Create draft'}</Button>
          </div>
        </Card>
      )}

      {!loading && visibleJobs.length === 0 && (
        <StateMessage kind="empty" title="No jobs to show" description={role === 'INTERVIEWEE' ? 'Published opportunities will appear here.' : 'Create your first job advertisement to start the recruitment flow.'} />
      )}

      {!loading && visibleJobs.length > 0 && (
        <div className="grid gap-4">
          {visibleJobs.map((job) => (
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
                  <Button disabled={appliedJobIds.has(job.id) || applying === job.id} onClick={() => void applyToJob(job)}>
                    {appliedJobIds.has(job.id) ? 'Applied' : applying === job.id ? 'Applying…' : 'Apply'}
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => beginEdit(job)}>Edit</Button>
                    <Button variant="secondary" size="sm" onClick={() => void setStatus(job)}>{job.status === 'PUBLISHED' ? 'Close' : 'Publish'}</Button>
                  </div>
                )}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 text-sm font-bold text-slate-800">{job.location ?? 'Not set'}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Openings</p><p className="mt-1 text-sm font-bold text-slate-800">{job.openings}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published</p><p className="mt-1 text-sm font-bold text-slate-800">{job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'Draft'}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};
