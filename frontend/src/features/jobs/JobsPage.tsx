import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { DataTable } from '../../shared/components/DataTable';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { Pagination } from '../../shared/components/Pagination';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import type { Agency, Job, UserRole } from '../../domain/types';

interface JobsPageProps {
  role: UserRole;
  onOpenJob?: (jobId: string) => void;
}

const emptyForm = { title: '', description: '', location: '', openings: '1' };
const JOBS_PAGE_SIZE = 10;

const label = (value: string): string => value.replaceAll('_', ' ');

export const JobsPage = ({ role, onOpenJob }: JobsPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [jobs, setJobs] = useState<Job[]>(developmentMode ? state.jobs : []);
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [agencyId, setAgencyId] = useState(user?.agencyId ?? '');
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'title' | 'openings' | 'filled' | 'interviews'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [listView, setListView] = useState<'cards' | 'table'>('cards');
  const [jobPage, setJobPage] = useState(1);

  const formModalOpen = showForm && role !== 'INTERVIEWEE';
  const formModalRef = useFocusTrap<HTMLDivElement>({
    enabled: formModalOpen,
    onEscape: () => closeForm(),
  });

  useEffect(() => {
    if (!formModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [formModalOpen]);

  useEffect(() => {
    if (developmentMode) {
      setJobs(state.jobs);
      setAgencies(state.agencies);
      if (role !== 'ADMIN') setAgencyId(user?.agencyId ?? '');
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
  }, [developmentMode, role, state.jobs, state.agencies, user?.agencyId, user?.id]);

  function closeForm() {
    setShowForm(false);
    setEditingJobId(null);
    setForm(emptyForm);
  }

  const openCreateForm = () => {
    setEditingJobId(null);
    setForm(emptyForm);
    if (role !== 'ADMIN') setAgencyId(user?.agencyId ?? '');
    setShowForm(true);
    setError('');
    setSuccess('');
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
      setError('Select an agency for this job.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const openings = Math.max(1, Number(form.openings) || 1);

      if (editingJobId) {
        const current = jobs.find((job) => job.id === editingJobId);
        if (!current) throw new Error('The selected job could not be found.');

        const updated: Job = developmentMode
          ? {
              ...current,
              title: form.title.trim(),
              description: form.description.trim() || null,
              location: form.location.trim() || null,
              openings,
            }
          : await apiFetch<Job>('/jobs/' + editingJobId, {
              method: 'PATCH',
              body: JSON.stringify({
                title: form.title.trim(),
                description: form.description.trim() || null,
                location: form.location.trim() || null,
                openings,
              }),
            });

        setJobs((currentJobs) => currentJobs.map((job) => job.id === updated.id ? updated : job));
        closeForm();
        setSuccessTitle('Job updated');
        setSuccess('"' + updated.title + '" was updated.');
        return;
      }

      const targetAgencyId = agencyId || user?.agencyId || 'agency-1';
      const draft: Job = {
        id: 'job-' + Date.now(),
        agencyId: targetAgencyId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        openings,
        status: 'DRAFT',
        publishedAt: null,
      };

      const created = developmentMode
        ? draft
        : await apiFetch<Job>('/agencies/' + targetAgencyId + '/jobs', {
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
    const filledCount = job.filledCount ?? 0;

    if (nextStatus === 'CLOSED' && filledCount < job.openings) {
      setError('A job can only be closed after all required openings are filled.');
      return;
    }

    setError('');
    try {
      const updated: Job = developmentMode
        ? {
            ...job,
            status: nextStatus as Job['status'],
            publishedAt: nextStatus === 'PUBLISHED' ? (job.publishedAt ?? new Date().toISOString()) : job.publishedAt,
          }
        : await apiFetch<Job>('/jobs/' + job.id, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
          });

      if (developmentMode) dispatch({ type: 'SET_JOB_STATUS', jobId: job.id, status: nextStatus });
      setJobs((current) => current.map((item) => item.id === updated.id
        ? {
            ...item,
            ...updated,
            candidateCount: updated.candidateCount ?? item.candidateCount,
            interviewCount: updated.interviewCount ?? item.interviewCount,
            filledCount: updated.filledCount ?? item.filledCount,
          }
        : item));
      setSuccessTitle(nextStatus === 'PUBLISHED' ? 'Job published' : 'Job closed');
      setSuccess('"' + job.title + '" is now ' + nextStatus.toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the job.');
    }
  };

  const displayJobs = useMemo(
    () => developmentMode
      ? jobs.map((job) => {
          const memberships = state.jobCandidates.filter((item) => item.jobId === job.id);
          const interviews = state.interviews.filter((item) => item.jobId === job.id);
          return {
            ...job,
            candidateCount: memberships.length,
            interviewCount: interviews.length,
            filledCount: memberships.filter((item) => item.status === 'HIRED').length,
          };
        })
      : jobs,
    [developmentMode, jobs, state.interviews, state.jobCandidates],
  );

  const visibleJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = displayJobs.filter((job) => {
      const matchesRole = role !== 'INTERVIEWEE' || job.status === 'PUBLISHED';
      const matchesStatus = !statusFilter || job.status === statusFilter;
      const matchesQuery = !query || [
        job.title,
        job.description ?? '',
        job.location ?? '',
        job.status,
      ].some((value) => value.toLowerCase().includes(query));

      return matchesRole && matchesStatus && matchesQuery;
    });

    return [...filtered].sort((left, right) => {
      let result = 0;
      if (sortBy === 'created') result = (left.publishedAt ?? '').localeCompare(right.publishedAt ?? '');
      if (sortBy === 'title') result = left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
      if (sortBy === 'openings') result = left.openings - right.openings;
      if (sortBy === 'filled') result = (left.filledCount ?? 0) - (right.filledCount ?? 0);
      if (sortBy === 'interviews') result = (left.interviewCount ?? 0) - (right.interviewCount ?? 0);
      return sortDirection === 'asc' ? result : -result;
    });
  }, [displayJobs, role, search, sortBy, sortDirection, statusFilter]);

  const jobTotalPages = Math.max(1, Math.ceil(visibleJobs.length / JOBS_PAGE_SIZE));
  const activeJobPage = Math.min(jobPage, jobTotalPages);
  const paginatedJobs = useMemo(
    () => visibleJobs.slice((activeJobPage - 1) * JOBS_PAGE_SIZE, activeJobPage * JOBS_PAGE_SIZE),
    [activeJobPage, visibleJobs],
  );

  useEffect(() => {
    setJobPage(1);
  }, [search, statusFilter, sortBy, sortDirection]);

  const jobStatusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'CLOSED', label: 'Closed' },
  ];

  const renderJobActions = (job: Job, compact = false) => (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => onOpenJob?.(job.id)}>
        Open job
      </Button>
      {role !== 'INTERVIEWEE' && (
        <>
          <Button variant="secondary" size="sm" onClick={() => beginEdit(job)}>Edit</Button>
          <Button
            variant={job.status === 'PUBLISHED' && (job.filledCount ?? 0) >= job.openings ? 'danger' : 'secondary'}
            size="sm"
            disabled={job.status === 'PUBLISHED' && (job.filledCount ?? 0) < job.openings}
            onClick={() => void setStatus(job)}
          >
            {job.status === 'PUBLISHED' ? 'Close' : 'Publish'}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'INTERVIEWEE' ? 'Available positions' : 'Recruitment'}
        title="Jobs"
        description={role === 'INTERVIEWEE'
          ? 'Review positions available for your interview assignments.'
          : 'Create and manage job openings that drive the candidate and interview workflow.'}
        action={role !== 'INTERVIEWEE' ? (
          <Button onClick={openCreateForm}>
            <Icon name="plus" size={16} /> New job
          </Button>
        ) : undefined}
      />

      {error && <StateMessage kind="error" title="Job action failed" description={error} floating={formModalOpen} />}
      {success && <StateMessage kind="success" title={successTitle || 'Saved'} description={success} />}
      {loading && <StateMessage kind="loading" title="Loading jobs" description="Fetching the latest job openings." />}

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button
            type="button"
            aria-label="Close job dialog"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={closeForm}
          />
          <div
            ref={formModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-form-title"
            tabIndex={-1}
            className="relative z-10 my-auto w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">
                  {editingJobId ? 'Job settings' : 'New opening'}
                </p>
                <h2 id="job-form-title" className="mt-1 text-lg font-black text-slate-950">
                  {editingJobId ? 'Edit job' : 'Create job'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {editingJobId ? 'Update the job details without changing its recruitment history.' : 'Set the opening details first. Candidates and interviews are managed from the job workflow.'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {role === 'ADMIN' && !editingJobId && (
                <div className="sm:col-span-2">
                  <FormField label="Agency">
                    <SelectMenu
                      value={agencyId}
                      onChange={setAgencyId}
                      options={[
                        { value: '', label: 'Select an agency' },
                        ...agencies.filter((item) => item.status === 'ACTIVE').map((agency) => ({ value: agency.id, label: agency.name })),
                      ]}
                      ariaLabel="Select agency for job"
                    />
                  </FormField>
                </div>
              )}

              <FormField label="Job title">
                <input
                  className="field-input"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="e.g. Mason — Dubai Project"
                  autoFocus
                />
              </FormField>

              <FormField label="Location">
                <input
                  className="field-input"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  placeholder="Dubai, UAE"
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Description">
                  <textarea
                    className="field-input min-h-28 resize-y"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Describe the role, project, responsibilities and requirements."
                  />
                </FormField>
              </div>

              <FormField label="Required workers">
                <input
                  type="number"
                  min="1"
                  className="field-input"
                  value={form.openings}
                  onChange={(event) => setForm({ ...form, openings: event.target.value })}
                />
              </FormField>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={closeForm} disabled={saving}>Cancel</Button>
              <Button
                disabled={saving || (!developmentMode && !agencyId)}
                onClick={() => void saveJob()}
              >
                {saving ? 'Saving…' : editingJobId ? 'Save changes' : 'Create draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <label className="field-label">Search jobs</label>
            <input
              className="field-input mt-1 w-full"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, location, description or status…"
            />
          </div>

          <div className="min-w-0">
            <label className="field-label">Status</label>
            <SelectMenu
              value={statusFilter}
              onChange={setStatusFilter}
              options={jobStatusOptions}
              ariaLabel="Filter jobs by status"
              className="mt-1"
            />
          </div>

          <div className="min-w-0">
            <label className="field-label">Sort</label>
            <div className="mt-1 flex min-w-0 gap-1.5">
              <SelectMenu
                value={sortBy}
                onChange={(value) => setSortBy(value as typeof sortBy)}
                options={[
                  { value: 'created', label: 'Latest' },
                  { value: 'title', label: 'Title' },
                  { value: 'openings', label: 'Required workers' },
                  { value: 'filled', label: 'Filled workers' },
                  { value: 'interviews', label: 'Interviews' },
                ]}
                ariaLabel="Sort jobs by"
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                title={sortDirection === 'asc' ? 'Ascending order' : 'Descending order'}
                aria-label={sortDirection === 'asc' ? 'Switch to descending sort' : 'Switch to ascending sort'}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                onClick={() => setSortDirection((value) => value === 'asc' ? 'desc' : 'asc')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                  {sortDirection === 'asc'
                    ? <path d="M12 19V5m0 0-5 5m5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    : <path d="M12 5v14m0 0-5-5m5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
                </svg>
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <label className="field-label">View</label>
            <div className="mt-1 inline-flex h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                aria-pressed={listView === 'cards'}
                className={`flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-bold transition ${listView === 'cards' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setListView('cards')}
              >
                Cards
              </button>
              <button
                type="button"
                aria-pressed={listView === 'table'}
                className={`flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-bold transition ${listView === 'table' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setListView('table')}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            <span className="font-black text-slate-800">{visibleJobs.length}</span> job(s)
          </p>

          {(search || statusFilter) && (
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {!loading && visibleJobs.length === 0 && (
        <StateMessage
          kind="empty"
          title="No jobs to show"
          description={search || statusFilter ? 'Try changing the filters or search terms.' : 'Create a job opening to start building its candidate pool.'}
        />
      )}

      {!loading && visibleJobs.length > 0 && listView === 'cards' && (
        <div className="grid gap-4">
          {paginatedJobs.map((job) => {
            const filledCount = job.filledCount ?? 0;
            const candidateCount = job.candidateCount ?? 0;
            const interviewCount = job.interviewCount ?? 0;
            const fillPercent = Math.min(100, Math.round((filledCount / Math.max(1, job.openings)) * 100));

            return (
              <Card key={job.id}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-black text-slate-950">{job.title}</h2>
                      <StatusPill value={job.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-slate-500">
                      {job.description ?? 'No description provided.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-cyan-500" />
                        {job.location ?? 'Location not set'}
                      </span>
                      <span>{job.openings} worker{job.openings === 1 ? '' : 's'}</span>
                      <span>{candidateCount} candidate{candidateCount === 1 ? '' : 's'}</span>
                      <span>{interviewCount} interview{interviewCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>

                  {role !== 'INTERVIEWEE' && (
                    <div className="shrink-0">
                      {renderJobActions(job)}
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Worker progress</p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {filledCount} / {job.openings} filled
                      </p>
                    </div>
                    <span className="text-xs font-black text-slate-600">{fillPercent}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: fillPercent + '%' }} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidate pool</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{candidateCount}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interviews</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{interviewCount}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filled</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{filledCount} / {job.openings}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && visibleJobs.length > 0 && listView === 'table' && (
        <DataTable
          rows={paginatedJobs}
          getRowKey={(job) => job.id}
          columns={[
            {
              key: 'job',
              header: 'Job',
              render: (job) => (
                <div className="min-w-56">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900">{job.title}</p>
                    <StatusPill value={job.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{job.location ?? 'Location not set'}</p>
                </div>
              ),
            },
            {
              key: 'requirement',
              header: 'Workers',
              render: (job) => (
                <div>
                  <p className="font-black text-slate-800">{job.filledCount ?? 0} / {job.openings}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">filled</p>
                </div>
              ),
            },
            {
              key: 'candidates',
              header: 'Candidates',
              render: (job) => <span className="font-bold text-slate-700">{job.candidateCount ?? 0}</span>,
            },
            {
              key: 'interviews',
              header: 'Interviews',
              render: (job) => <span className="font-bold text-slate-700">{job.interviewCount ?? 0}</span>,
            },
            {
              key: 'actions',
              header: 'Actions',
              className: 'whitespace-nowrap',
              render: (job) => renderJobActions(job, true),
            },
          ]}
        />
      )}

      {!loading && visibleJobs.length > 0 && (
        <Pagination
          page={activeJobPage}
          pageSize={JOBS_PAGE_SIZE}
          total={visibleJobs.length}
          onPageChange={setJobPage}
        />
      )}
    </section>
  );
};
