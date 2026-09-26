import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { Icon } from '../../shared/components/Icon';
import { apiFetch } from '../../shared/lib/api';
import type { JobDetail, JobCandidate, JobStatus, UserRole } from '../../domain/types';

interface JobDetailPageProps {
  role: UserRole;
  jobId: string | null;
  onBack: () => void;
  onCandidates: (jobId: string) => void;
  onInterviews: (jobId: string) => void;
}

const label = (value: string): string => value.replaceAll('_', ' ');

const toJobDetailFromState = (
  job: JobDetail,
  memberships: JobCandidate[],
  interviews: JobDetail['interviews'],
): JobDetail => {
  const candidatePool = memberships.filter((item) => item.jobId === job.id);
  const jobInterviews = interviews.filter((item) => item.jobId === job.id);
  return {
    ...job,
    candidatePool,
    interviews: jobInterviews,
    candidateCount: candidatePool.length,
    interviewCount: jobInterviews.length,
    filledCount: candidatePool.filter((item) => item.status === 'HIRED').length,
  };
};

export const JobDetailPage = ({ role, jobId, onBack, onCandidates, onInterviews }: JobDetailPageProps) => {
  const { developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const stateJob = useMemo(
    () => (jobId ? state.jobs.find((item) => item.id === jobId) : undefined),
    [jobId, state.jobs],
  );

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }

    if (developmentMode) {
      if (!stateJob) {
        setJob(null);
        setLoading(false);
        return;
      }
      setJob(toJobDetailFromState(stateJob, state.jobCandidates, state.interviews));
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch<JobDetail>('/jobs/' + jobId)
      .then((result) => {
        if (!cancelled) setJob(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load the job.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [developmentMode, jobId, state.interviews, state.jobCandidates, stateJob]);

  const setJobStatus = async (nextStatus: JobStatus) => {
    if (!job) return;
    if (nextStatus === 'CLOSED' && (job.filledCount ?? 0) < job.openings) {
      setError('The job can only be closed after all required openings have been filled.');
      return;
    }
    setActionBusy(true);
    setError('');
    try {
      const updated = developmentMode
        ? { ...job, status: nextStatus, publishedAt: nextStatus === 'PUBLISHED' ? (job.publishedAt ?? new Date().toISOString()) : job.publishedAt }
        : await apiFetch<JobDetail>('/jobs/' + job.id, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
          });

      if (developmentMode) dispatch({ type: 'SET_JOB_STATUS', jobId: job.id, status: nextStatus });
      setJob((current) => current ? { ...current, ...updated } : updated);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the job.');
    } finally {
      setActionBusy(false);
    }
  };

  if (!jobId) {
    return <StateMessage kind="empty" title="No job selected" description="Choose a job from the Jobs page." />;
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="loading" title="Loading job" description="Fetching the job, candidate pool and interview activity." /></section>;
  }

  if (!job) {
    return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="error" title="Job not found" description={error || 'The requested job is unavailable.'} /></section>;
  }

  const filledCount = job.filledCount ?? job.candidatePool.filter((item) => item.status === 'HIRED').length;
  const candidateCount = job.candidateCount ?? job.candidatePool.length;
  const interviewCount = job.interviewCount ?? job.interviews.length;
  const progress = job.openings ? Math.min(100, Math.round((filledCount / job.openings) * 100)) : 0;
  const canManage = role === 'ADMIN' || role === 'AGENCY';

  return (
    <section className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <Icon name="chevron-left" size={15} /> Jobs
        </Button>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => onCandidates(job.id)} disabled={job.status === 'CLOSED'}>
              <Icon name="users" size={15} /> Add candidates
            </Button>
            <Button size="sm" onClick={() => onInterviews(job.id)} disabled={job.status === 'CLOSED' || candidateCount === 0}>
              <Icon name="calendar" size={15} /> Schedule interviews
            </Button>
            {job.status === 'DRAFT' && <Button variant="secondary" size="sm" disabled={actionBusy} onClick={() => void setJobStatus('PUBLISHED')}>Publish job</Button>}
            {job.status === 'PUBLISHED' && (
              <Button variant="danger" size="sm" disabled={actionBusy || filledCount < job.openings} onClick={() => void setJobStatus('CLOSED')}>
                Close job
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <StateMessage kind="error" title="Job action failed" description={error} />}

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill value={job.status} />
              {job.agency && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{job.agency.name}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{job.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{job.description || 'No job description provided.'}</p>
          </div>
          <div className="w-full shrink-0 lg:w-72">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Worker requirement</p>
              <p className="text-sm font-black text-slate-950">{filledCount} / {job.openings}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: progress + '%' }} />
            </div>
            <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{job.openings - filledCount > 0 ? (job.openings - filledCount) + ' opening(s) remaining' : 'All openings filled'}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Location</p><p className="mt-1 text-sm font-bold text-slate-800">{job.location || 'Not set'}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Openings</p><p className="mt-1 text-sm font-bold text-slate-800">{job.openings}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Candidates</p><p className="mt-1 text-sm font-bold text-slate-800">{candidateCount}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Interviews</p><p className="mt-1 text-sm font-bold text-slate-800">{interviewCount}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Published</p><p className="mt-1 text-sm font-bold text-slate-800">{job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'Draft'}</p></div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Candidate pool</h2>
              <p className="mt-1 text-xs text-slate-400">Candidates collected specifically for this job.</p>
            </div>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{candidateCount}</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {job.candidatePool.length ? job.candidatePool.map((membership) => (
              <div key={membership.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{membership.candidate.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{membership.candidate.reference} · {membership.candidate.profession || 'Profession not set'} · {membership.candidate.agencyId}</p>
                </div>
                <StatusPill value={membership.status} />
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm font-bold text-slate-700">No candidates in this job pool yet.</p>
                <p className="mt-1 text-xs text-slate-400">Use Add candidates to collect matching workers from the candidate pool.</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950">Interview activity</h2>
              <p className="mt-1 text-xs text-slate-400">Every interview attached to this job.</p>
            </div>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{interviewCount}</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {job.interviews.length ? job.interviews.map((interview) => (
              <div key={interview.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{interview.candidate?.name ?? interview.candidateId}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{label(interview.type)} · {new Date(interview.scheduledAt).toLocaleString()}</p>
                  </div>
                  <StatusPill value={interview.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">
                  <span>{interview.durationMins} min</span>
                  <span>·</span>
                  <span>{interview.panel?.length ?? interview.panelUserIds.length} interviewer(s)</span>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm font-bold text-slate-700">No interviews scheduled yet.</p>
                <p className="mt-1 text-xs text-slate-400">Once candidates are in the pool, schedule their interviews from here.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};
