import { useEffect, useMemo, useState } from 'react';
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
import type { Agency, Job, UserRole } from '../../domain/types';

interface JobsPageProps { role: UserRole; }

const emptyForm = { title: '', description: '', location: '', openings: '1' };

export const JobsPage = ({ role }: JobsPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [jobs, setJobs] = useState<Job[]>(developmentMode ? state.jobs : []);
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [agencyId, setAgencyId] = useState(user?.role === 'ADMIN' ? '' : (user?.agencyId ?? 'agency-1'));
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setJobs(state.jobs);
      setAgencies(state.agencies);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const requests: [Promise<Job[]>, Promise<Agency[]>] = [
      apiFetch<Job[]>('/jobs'),
      role === 'ADMIN' ? apiFetch<Agency[]>('/agencies') : Promise.resolve([] as Agency[]),
    ];

    Promise.all(requests)
      .then(([jobResult, agencyResult]) => {
        if (cancelled) return;
        setJobs(jobResult);
        if (role === 'ADMIN') {
          setAgencies(agencyResult);
          setAgencyId((current) => current || agencyResult.find((item) => item.status === 'ACTIVE')?.id || '');
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load jobs.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [developmentMode, role, state.jobs, state.agencies, user?.id]);

  const closeForm = () => {
    setShowForm(false);
    setEditingJobId(null);
    setForm(emptyForm);
  };

  const beginEdit = (job: Job) => {
    setEditingJobId(job.id);
    setAgencyId(job.agencyId);
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
    if (!agencyId && !developmentMode) {
      setError('Select an agency workspace.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingJobId) {
        const current = jobs.find((job) => job.id === editingJobId);
        if (!current) throw new Error('The selected job could not be found.');

        const updated: Job = developmentMode
          ? { ...current, title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null, openings: Math.max(1, Number(form.openings) || 1) }
          : await apiFetch<Job>('/jobs/' + editingJobId, {
              method: 'PATCH',
              body: JSON.stringify({ title: form.title.trim(), description: form.description.trim() || null, location: form.location.trim() || null, openings: Math.max(1, Number(form.openings) || 1) }),
            });

        setJobs((currentJobs) => currentJobs.map((job) => job.id === updated.id ? updated : job));
        closeForm();
        setSuccessTitle('Job updated');
        setSuccess('"' + updated.title + '" was updated.');
        return;
      }

      const draft: Job = {
        id: 'job-' + Date.now(),
        agencyId: agencyId || 'agency-1',
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        openings: Math.max(1, Number(form.openings) || 1),
        status: 'DRAFT',
        publishedAt: null,
      };

      const created = developmentMode
        ? draft
        : await apiFetch<Job>('/agencies/' + agencyId + '/jobs', {
            method: 'POST',
            body: JSON.stringify({ title: draft.title, description: draft.description, location: draft.location, openings: draft.openings }),
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
      const updated: Job = developmentMode
        ? { ...job, status: nextStatus as Job['status'], publishedAt: nextStatus === 'PUBLISHED' ? (job.publishedAt ?? new Date().toISOString()) : job.publishedAt }
        : await apiFetch<Job>('/jobs/' + job.id, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      if (developmentMode) dispatch({ type: 'SET_JOB_STATUS', jobId: job.id, status: nextStatus });
      setJobs((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccessTitle(nextStatus === 'PUBLISHED' ? 'Job published' : 'Job closed');
      setSuccess('"' + job.title + '" is now ' + nextStatus.toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the job.');
    }
  };

  const visibleJobs = useMemo(() => {
    const available = jobs.filter((job) => role !== 'INTERVIEWEE' || job.status === 'PUBLISHED');
    const query = search.trim().toLowerCase();
    if (!query) return available;
    return available.filter((job) => [job.title, job.description ?? '', job.location ?? '', job.status].some((value) => value.toLowerCase().includes(query)));
  }, [jobs, role, search]);

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'ADMIN' ? 'All agency workspaces' : role === 'INTERVIEWEE' ? 'Available positions' : 'Agency workspace'}
        title="Jobs"
        description={role === 'INTERVIEWEE' ? 'Review positions associated with your agency. Interviews are assigned directly from the candidate pool.' : 'Manage internal job openings and positions used when scheduling candidate interviews.'}
        action={role !== 'INTERVIEWEE' ? (
          <Button onClick={() => { setEditingJobId(null); setForm(emptyForm); setShowForm((value) => !value); setError(''); }}>
            <Icon name="plus" size={16} /> New job
          </Button>
        ) : undefined}
      />

      {role === 'ADMIN' && (
        <Card>
          <FormField label="Agency workspace" hint="Admin can manage jobs for any agency.">
            <select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}>
              <option value="">Select an agency</option>
              {agencies.filter((item) => item.status === 'ACTIVE').map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
            </select>
          </FormField>
        </Card>
      )}

      {loading && <StateMessage kind="loading" title="Loading jobs" description="Fetching the latest positions." />}
      {error && <StateMessage kind="error" title="Job action failed" description={error} />}
      {success && <StateMessage kind="success" title={successTitle || 'Saved'} description={success} />}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="field-label">Job search</p>
            <p className="mt-1 text-xs text-slate-400">Search by title, location, description, or status.</p>
          </div>
          <input className="field-input w-full sm:max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs…" aria-label="Search jobs" />
        </div>
      </Card>

      {showForm && (
        <Card>
          <h2 className="text-sm font-black text-slate-950">{editingJobId ? 'Edit job' : 'Create job'}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {role === 'ADMIN' && !editingJobId && (
              <FormField label="Agency workspace">
                <select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}>
                  <option value="">Select an agency</option>
                  {agencies.filter((item) => item.status === 'ACTIVE').map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
                </select>
              </FormField>
            )}
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
            <FormField label="Openings">
              <input type="number" min="1" className="field-input" value={form.openings} onChange={(event) => setForm({ ...form, openings: event.target.value })} />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button disabled={saving || (!developmentMode && !agencyId)} onClick={() => void saveJob()}>{saving ? 'Saving…' : editingJobId ? 'Save changes' : 'Create draft'}</Button>
          </div>
        </Card>
      )}

      {!loading && visibleJobs.length === 0 && <StateMessage kind="empty" title="No jobs to show" description="Create a job position to use when assigning candidates to interviews." />}

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
                  {role === 'ADMIN' && (
                    <p className="mt-2 text-xs font-semibold text-cyan-700">
                      {agencies.find((agency) => agency.id === job.agencyId)?.name ?? 'Agency workspace'}
                    </p>
                  )}
                </div>
                {role !== 'INTERVIEWEE' && (
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
