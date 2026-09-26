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
import type { Job, UserRole } from '../../domain/types';

interface JobsPageProps {
  role: UserRole;
  onOpenJob?: (jobId: string) => void;
}

const emptyForm = { title: '', description: '', location: '', openings: '1' };
const JOBS_PAGE_SIZE = 10;

export const JobsPage = ({ role, onOpenJob }: JobsPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [jobs, setJobs] = useState<Job[]>(developmentMode ? state.jobs : []);
  const [showForm, setShowForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [positionRows, setPositionRows] = useState<Array<{ position: string; requiredCount: string }>>([{ position: '', requiredCount: '1' }]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'title' | 'openings' | 'filled' | 'interviews'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [listView, setListView] = useState<'cards' | 'table'>('cards');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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

      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    apiFetch<Job[]>('/jobs')
      .then((jobResult) => {
        if (cancelled) return;
        setJobs(jobResult);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load jobs.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [developmentMode, role, state.jobs, user?.id]);

  function closeForm() {
    setShowForm(false);
    setEditingJobId(null);
    setForm(emptyForm);
    setPositionRows([{ position: '', requiredCount: '1' }]);
  }

  const openCreateForm = () => {
    setEditingJobId(null);
    setForm(emptyForm);
    setPositionRows([{ position: '', requiredCount: '1' }]);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const beginEdit = (job: Job) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title,
      description: job.description ?? '',
      location: job.location ?? '',
      openings: String(job.openings),
    });
    setPositionRows(
      job.positions?.length
        ? job.positions.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({ position: item.position, requiredCount: String(item.requiredCount) }))
        : [{ position: job.title, requiredCount: String(job.openings) }],
    );
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const saveJob = async () => {
    if (!form.title.trim()) {
      setError('Job title is required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const normalizedPositions = positionRows
        .map((row) => ({ position: row.position.trim(), requiredCount: Math.max(0, Number(row.requiredCount) || 0) }))
        .filter((row) => row.position || row.requiredCount > 0);
      if (!normalizedPositions.length) {
        setError('Add at least one position.');
        return;
      }
      const invalidPosition = normalizedPositions.find((row) => !row.position || row.requiredCount < 1);
      if (invalidPosition) {
        setError('Every position needs a name and a required count of at least 1.');
        return;
      }
      const openings = normalizedPositions.reduce((sum, row) => sum + row.requiredCount, 0);
      if (openings > 1000) {
        setError('Total required workers cannot exceed 1000.');
        return;
      }

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
              positions: normalizedPositions.map((item, index) => ({
                id: current.positions?.[index]?.id ?? 'job-position-' + current.id + '-' + index,
                jobId: current.id,
                position: item.position,
                requiredCount: item.requiredCount,
                sortOrder: index,
              })),
            }
          : await apiFetch<Job>('/jobs/' + editingJobId, {
              method: 'PATCH',
              body: JSON.stringify({
                title: form.title.trim(),
                description: form.description.trim() || null,
                location: form.location.trim() || null,
                openings,
                positions: normalizedPositions,
              }),
            });

        setJobs((currentJobs) => currentJobs.map((job) => job.id === updated.id ? updated : job));
        closeForm();
        setSuccessTitle('Job updated');
        setSuccess('"' + updated.title + '" was updated.');
        return;
      }

      const draftId = 'job-' + Date.now();
      const draft: Job = {
        id: draftId,
        agencyId: null,
        positions: normalizedPositions.map((item, index) => ({
          id: 'job-position-' + draftId + '-' + index,
          jobId: draftId,
          position: item.position,
          requiredCount: item.requiredCount,
          sortOrder: index,
        })),
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        openings,
        status: 'DRAFT',
        publishedAt: null,
      };

      const created = developmentMode
        ? draft
        : await apiFetch<Job>('/jobs', {
            method: 'POST',
            body: JSON.stringify({
              title: draft.title,
              description: draft.description,
              location: draft.location,
              positions: normalizedPositions,
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

  const renderJobActions = (job: Job, _compact = false) => (
    <div className="flex items-center gap-1.5">
      <Button
        variant="secondary"
        size="sm"
        className="!size-10 !min-h-10 !p-0"
        title="Open job"
        aria-label="Open job"
        onClick={() => onOpenJob?.(job.id)}
      >
        <Icon name="eye" size={16} />
      </Button>
      {role !== 'INTERVIEWEE' && (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="!size-10 !min-h-10 !p-0"
            title="Edit job"
            aria-label="Edit job"
            onClick={() => beginEdit(job)}
          >
            <Icon name="pencil" size={16} />
          </Button>
          <Button
            variant={job.status === 'PUBLISHED' && (job.filledCount ?? 0) >= job.openings ? 'danger' : 'secondary'}
            size="sm"
            className="!size-10 !min-h-10 !p-0"
            title={job.status === 'PUBLISHED' ? 'Close job' : 'Publish job'}
            aria-label={job.status === 'PUBLISHED' ? 'Close job' : 'Publish job'}
            disabled={job.status === 'PUBLISHED' && (job.filledCount ?? 0) < job.openings}
            onClick={() => void setStatus(job)}
          >
            <Icon name={job.status === 'PUBLISHED' ? 'lock' : 'send'} size={16} />
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

            <div className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Job title">
                  <input
                    className="field-input"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="e.g. Dubai Tower Project"
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
              </div>

              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="field-label">Required positions</p>
                    <p className="mt-1 text-[10px] text-slate-400">Add each position needed for this job and the number of workers required.</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">
                    {positionRows.reduce((sum, row) => sum + (Number(row.requiredCount) || 0), 0)} workers
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {positionRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
                      <input
                        className="field-input min-w-0 bg-white"
                        value={row.position}
                        onChange={(event) => setPositionRows((current) => current.map((item, i) => i === index ? { ...item, position: event.target.value } : item))}
                        placeholder="Position"
                        aria-label={'Position ' + (index + 1)}
                      />
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        className="field-input bg-white"
                        value={row.requiredCount}
                        onChange={(event) => setPositionRows((current) => current.map((item, i) => i === index ? { ...item, requiredCount: event.target.value } : item))}
                        placeholder="Count"
                        aria-label={'Required count for position ' + (index + 1)}
                      />
                      <button
                        type="button"
                        aria-label={'Remove position ' + (index + 1)}
                        title="Remove position"
                        disabled={positionRows.length === 1}
                        className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                        onClick={() => setPositionRows((current) => current.length === 1 ? current : current.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50/40 hover:text-cyan-700"
                  onClick={() => setPositionRows((current) => [...current, { position: '', requiredCount: '1' }])}
                >
                  <Icon name="plus" size={14} /> Add position
                </button>
              </div>

              <FormField label="Job note">
                <textarea
                  className="field-input min-h-28 resize-y"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Add notes about the project, responsibilities, requirements or other useful information."
                />
              </FormField>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={closeForm} disabled={saving}>Cancel</Button>
              <Button
                disabled={saving || positionRows.length === 0}
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

          <button
            type="button"
            className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm md:hidden"
            aria-expanded={mobileFiltersOpen}
            aria-controls="mobile-job-filters"
            onClick={() => setMobileFiltersOpen((value) => !value)}
          >
            <span>{mobileFiltersOpen ? 'Hide filters' : 'More filters'}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={mobileFiltersOpen ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
            </svg>
          </button>

          <div id="mobile-job-filters" className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
            <label className="field-label">Status</label>
            <SelectMenu
              value={statusFilter}
              onChange={setStatusFilter}
              options={jobStatusOptions}
              ariaLabel="Filter jobs by status"
              className="mt-1"
            />
          </div>

          <div className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
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
        </div>

        {showAdvancedFilters && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="field-label">Status</label>
                <SelectMenu
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={jobStatusOptions}
                  ariaLabel="Filter jobs by status"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="field-label">Sort by</label>
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
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setSortDirection((value) => value === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDirection === 'asc' ? 'Ascending' : 'Descending'} order
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={mobileFiltersOpen ? 'flex items-center gap-2' : 'hidden items-center gap-2 md:flex'}>
            <button
              type="button"
              title={showAdvancedFilters ? 'Hide advanced filters' : 'More filters'}
              aria-label={showAdvancedFilters ? 'Hide advanced filters' : 'More filters'}
              className={`grid size-10 place-items-center rounded-xl border transition ${showAdvancedFilters ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setShowAdvancedFilters((value) => !value)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </button>
            <span className="text-[10px] font-bold text-slate-400">
              {showAdvancedFilters ? 'Advanced filters' : 'More filters'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-xs text-slate-500"><span className="font-black text-slate-800">{visibleJobs.length}</span> job(s)</p>

            {(search || statusFilter) && (
              <button
                type="button"
                title="Clear filters"
                aria-label="Clear filters"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 6h18M6 12h12M10 18h4" />
                  <path d="M7 6l1-2h8l1 2" />
                </svg>
              </button>
            )}

            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Job list view">
              <button
                type="button"
                aria-label="Card view"
                aria-pressed={listView === 'cards'}
                title="Card view"
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${listView === 'cards' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setListView('cards')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="14" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Table view"
                aria-pressed={listView === 'table'}
                title="Table view"
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${listView === 'table' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setListView('table')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="5" width="16" height="14" rx="1" />
                  <path d="M4 10h16M10 5v14" />
                </svg>
              </button>
            </div>
          </div>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paginatedJobs.map((job) => {
            const filledCount = job.filledCount ?? 0;
            const candidateCount = job.candidateCount ?? 0;
            const interviewCount = job.interviewCount ?? 0;
            const fillPercent = Math.min(100, Math.round((filledCount / Math.max(1, job.openings)) * 100));
            const positions = job.positions ?? [{ id: job.id + '-position', jobId: job.id, position: job.title, requiredCount: job.openings, sortOrder: 0 }];

            return (
              <Card key={job.id}>
                <div className="flex min-h-[25rem] flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
                          <Icon name="briefcase" size={17} />
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-black text-slate-950">{job.title}</h2>
                          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                            {job.location ?? 'Location not set'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusPill value={job.status} />
                    </div>
                  </div>

                  {role !== 'INTERVIEWEE' && (
                    <div className="mt-3 flex justify-end border-b border-slate-100 pb-3">
                      {renderJobActions(job)}
                    </div>
                  )}

                  <div className="mt-3 min-h-[2.75rem]">
                    <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                      {job.description ?? 'No description provided for this opening.'}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="min-w-0 rounded-xl bg-white px-3 py-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Required</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{job.openings}</p>
                      <p className="text-[9px] font-semibold text-slate-400">workers</p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-white px-3 py-2.5">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Positions</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{positions.length}</p>
                      <p className="text-[9px] font-semibold text-slate-400">{positions.length === 1 ? 'role' : 'roles'}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Worker progress</p>
                        <p className="mt-1 text-xs font-black text-slate-900">{filledCount} / {job.openings} filled</p>
                      </div>
                      <span className="text-xs font-black text-slate-600">{fillPercent}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: fillPercent + '%' }} />
                    </div>
                    <p className="mt-1.5 text-[9px] font-semibold text-slate-400">
                      {job.openings - filledCount > 0
                        ? (job.openings - filledCount) + ' opening(s) remaining'
                        : 'All required openings filled'}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="users" size={13} />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider">Candidates</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-slate-900">{candidateCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="calendar" size={13} />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider">Interviews</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-slate-900">{interviewCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white px-2.5 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Icon name="target" size={13} />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider">Filled</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-slate-900">{filledCount}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex-1 rounded-2xl border border-slate-100 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Position requirements</p>
                      <span className="text-[9px] font-bold text-slate-400">{positions.length} {positions.length === 1 ? 'position' : 'positions'}</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {positions.slice(0, 3).map((position) => (
                        <div key={position.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                          <span className="min-w-0 truncate text-[10px] font-bold text-slate-700">{position.position}</span>
                          <span className="shrink-0 rounded-full bg-cyan-50 px-2 py-0.5 text-[9px] font-black text-cyan-700">{position.requiredCount}</span>
                        </div>
                      ))}
                      {positions.length > 3 && (
                        <p className="pt-0.5 text-[9px] font-semibold text-slate-400">+ {positions.length - 3} more position(s)</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex min-w-0 items-center gap-1.5 text-[9px] font-semibold text-slate-400">
                      <Icon name="clock" size={12} />
                      <span className="truncate">
                        {job.publishedAt ? 'Published ' + new Date(job.publishedAt).toLocaleDateString() : 'Draft · not published'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-[10px] font-extrabold text-cyan-700 hover:text-cyan-800"
                      onClick={() => onOpenJob?.(job.id)}
                    >
                      View details
                    </button>
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
