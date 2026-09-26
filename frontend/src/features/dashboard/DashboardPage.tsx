import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { Icon } from '../../shared/components/Icon';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { apiFetch } from '../../shared/lib/api';
import type { CandidateStatus, Interview, InterviewStatus, InterviewType, Job, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

interface Analytics {
  scope: UserRole;
  counts: {
    agencies: number;
    activeAgencies: number;
    candidates: number;
    jobs: number;
    publishedJobs: number;
    interviews: number;
    submittedEvaluations: number;
    draftEvaluations: number;
    pendingDecisions: number;
  };
  candidateStatuses: Record<string, number>;
  interviewStatuses: Record<string, number>;
  interviewTypes: Record<string, number>;
  averageScorePoints: number | null;
  recentCandidates: Array<{ id: string; name: string; reference: string; profession: string | null; status: CandidateStatus; statusUpdatedAt: string }>;
  selectedJob?: { id: string; title: string; location: string | null; status: string } | null;
  recentInterviews: Array<{ id: string; status: InterviewStatus; type: InterviewType; scheduledAt: string; candidate: { name: string; reference: string; passportNumber: string | null }; job?: { id: string; title: string; location: string | null } | null }>;
  upcomingInterviews: Array<{ id: string; scheduledAt: string; type: InterviewType; candidate: { name: string; reference: string; passportNumber: string | null }; job?: { id: string; title: string; location: string | null } | null }>;
}

const statusLabel = (value: string) => value.replaceAll('_', ' ');

const StatCard = ({ label, value, hint, icon }: { label: string; value: string | number; hint: string; icon: 'users' | 'briefcase' | 'calendar' | 'target' | 'chart' }) => (
  <Card className="relative overflow-hidden">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">{hint}</p>
      </div>
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
        <Icon name={icon} size={20} />
      </div>
    </div>
  </Card>
);

const BarList = ({ values, labels }: { values: Record<string, number>; labels: string[] }) => {
  const total = Math.max(1, Object.values(values).reduce((sum, value) => sum + value, 0));
  return (
    <div className="space-y-3">
      {labels.map((key) => {
        const value = values[key] ?? 0;
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
              <span className="font-bold capitalize text-slate-600">{statusLabel(key)}</span>
              <span className="font-black text-slate-950">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: Math.max(value ? 4 : 0, (value / total) * 100) + '%' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const DashboardPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state } = useRecruitment();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');

  const developmentAnalytics = useMemo<Analytics>(() => {
    const selectedJob = selectedJobId ? state.jobs.find((item) => item.id === selectedJobId) : undefined;
    const memberships = selectedJob ? state.jobCandidates.filter((item) => item.jobId === selectedJob.id) : [];
    const memberIds = new Set(memberships.map((item) => item.candidateId));
    const candidates = selectedJob ? state.candidates.filter((item) => memberIds.has(item.id)) : state.candidates;
    const interviews = selectedJob ? state.interviews.filter((item) => item.jobId === selectedJob.id) : state.interviews;
    const candidateStatuses = Object.fromEntries(
      ['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE']
        .map((status) => [status, candidates.filter((item) => item.status === status).length]),
    );
    const interviewStatuses = Object.fromEntries(
      ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
        .map((status) => [status, interviews.filter((item) => item.status === status).length]),
    );
    const interviewTypes = Object.fromEntries(
      ['SCREENING', 'TECHNICAL', 'PRACTICAL', 'FINAL']
        .map((type) => [type, interviews.filter((item) => item.type === type).length]),
    );
    const interviewView = (item: Interview) => ({
      id: item.id,
      status: item.status,
      type: item.type,
      scheduledAt: item.scheduledAt,
      candidate: {
        name: item.candidate?.name ?? item.candidateId,
        reference: item.candidate?.reference ?? item.candidateId,
        passportNumber: item.candidate?.passportNumber ?? state.candidates.find((candidate) => candidate.id === item.candidateId)?.passportNumber ?? null,
      },
      job: item.job ? { id: item.job.id, title: item.job.title, location: item.job.location } : selectedJob ? { id: selectedJob.id, title: selectedJob.title, location: selectedJob.location } : null,
    });
    return {
      scope: role,
      selectedJob: selectedJob ? { id: selectedJob.id, title: selectedJob.title, location: selectedJob.location, status: selectedJob.status } : null,
      counts: {
        agencies: state.agencies.length,
        activeAgencies: state.agencies.filter((item) => item.status === 'ACTIVE').length,
        candidates: selectedJob ? candidates.length : role === 'INTERVIEWER' ? 0 : candidates.length,
        jobs: selectedJob ? 1 : role === 'INTERVIEWER' ? 0 : state.jobs.length,
        publishedJobs: selectedJob ? (selectedJob.status === 'PUBLISHED' ? 1 : 0) : role === 'INTERVIEWER' ? 0 : state.jobs.filter((item) => item.status === 'PUBLISHED').length,
        interviews: interviews.length,
        submittedEvaluations: interviews.filter((item) => item.status === 'COMPLETED').length,
        draftEvaluations: interviews.filter((item) => item.status === 'IN_PROGRESS').length,
        pendingDecisions: candidates.filter((item) => item.status === 'INTERVIEW_COMPLETED').length,
      },
      candidateStatuses,
      interviewStatuses,
      interviewTypes,
      averageScorePoints: null,
      recentCandidates: candidates.slice(0, 8).map((item) => ({ id: item.id, name: item.name, reference: item.reference, profession: item.profession, status: item.status, statusUpdatedAt: item.statusUpdatedAt })),
      recentInterviews: interviews.slice(0, 8).map(interviewView),
      upcomingInterviews: interviews.filter((item) => item.status === 'SCHEDULED' && new Date(item.scheduledAt).getTime() >= Date.now()).sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt)).slice(0, 8).map(interviewView),
    };
  }, [role, selectedJobId, state]);

  useEffect(() => {
    if (developmentMode) {
      setJobs(state.jobs);
      setAnalytics(developmentAnalytics);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const query = selectedJobId ? '?jobId=' + encodeURIComponent(selectedJobId) : '';
    Promise.all([
      apiFetch<Analytics>('/analytics/summary' + query),
      apiFetch<Interview[]>('/interviews' + query),
    ])
      .then(([result, interviews]) => {
        if (cancelled) return;
        const jobRecords = [...new Map(
          interviews
            .filter((interview) => interview.job)
            .map((interview) => [interview.job!.id, interview.job as NonNullable<Interview['job']>]),
        ).values()].map((job) => ({ id: job.id, title: job.title, location: job.location, status: job.status }));
        if (role !== 'INTERVIEWER') {
          void apiFetch<Job[]>('/jobs')
            .then((availableJobs) => {
              if (!cancelled) setJobs(availableJobs);
            })
            .catch(() => undefined);
        } else {
          setJobs(jobRecords);
        }
        setAnalytics(result);
      })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard analytics.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [developmentMode, developmentAnalytics, role, selectedJobId, state.jobs]);

  if (loading) {
    return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="loading" title="Loading dashboard" description="Preparing the latest recruitment and interview statistics." /></section>;
  }
  if (error || !analytics) {
    return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="error" title="Dashboard unavailable" description={error || 'No analytics data was returned.'} /></section>;
  }

  const { counts, candidateStatuses, interviewStatuses, interviewTypes, upcomingInterviews } = analytics;
  const activeJob = selectedJobId ? jobs.find((job) => job.id === selectedJobId) : null;
  const completionRate = counts.interviews ? Math.round(((interviewStatuses.COMPLETED ?? 0) / counts.interviews) * 100) : 0;
  const decisionRate = counts.candidates ? Math.round(((candidateStatuses.PASSED ?? 0) + (candidateStatuses.REJECTED ?? 0) + (candidateStatuses.HIRED ?? 0)) / counts.candidates * 100) : 0;

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Live workspace</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Good to see you, {user?.name ?? 'there'}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {selectedJobId
              ? 'Job-scoped recruitment intelligence for ' + (activeJob?.title ?? analytics.selectedJob?.title ?? 'the selected job') + '.'
              : role === 'ADMIN'
                ? 'System-wide recruitment intelligence across agencies, candidates, jobs and interview panels.'
                : role === 'AGENCY'
                  ? 'A focused view of your recruitment pipeline, interview workload and candidate movement.'
                  : 'Your interview desk at a glance — upcoming panels, evaluation workload and completed interviews.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-52">
            <SelectMenu
              value={selectedJobId}
              onChange={setSelectedJobId}
              options={[
                { value: '', label: 'All jobs' },
                ...jobs.map((job) => ({ value: job.id, label: job.title })),
              ]}
              ariaLabel="Filter dashboard by job"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">
            Updated {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {role === 'ADMIN' && <StatCard label="Agencies" value={counts.agencies} hint={counts.activeAgencies + ' active'} icon="users" />}
        {role !== 'INTERVIEWER' && <StatCard label="Candidates" value={counts.candidates} hint={(counts.pendingDecisions) + ' awaiting decision'} icon="users" />}
        {role !== 'INTERVIEWER' && <StatCard label="Open jobs" value={counts.publishedJobs} hint={counts.jobs + ' total positions'} icon="briefcase" />}
        <StatCard label="Interviews" value={counts.interviews} hint={(interviewStatuses.SCHEDULED ?? 0) + ' scheduled'} icon="calendar" />
        <StatCard label="Completion" value={completionRate + '%'} hint={(interviewStatuses.IN_PROGRESS ?? 0) + ' currently in progress'} icon="target" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-base font-black text-slate-950">Candidate pipeline</h2><p className="mt-1 text-xs text-slate-400">Every candidate lifecycle stage in the current scope.</p></div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-700">{decisionRate}% finalised</div>
          </div>
          <div className="mt-6"><BarList values={candidateStatuses} labels={['POOL','READY_FOR_INTERVIEW','INTERVIEW_SCHEDULED','INTERVIEW_COMPLETED','PASSED','REJECTED','ON_HOLD','HIRED','INACTIVE']} /></div>
        </Card>
        <Card>
          <h2 className="text-base font-black text-slate-950">Interview status</h2>
          <p className="mt-1 text-xs text-slate-400">Operational workload by interview state.</p>
          <div className="mt-6"><BarList values={interviewStatuses} labels={['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW']} /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="text-base font-black text-slate-950">Interview mix</h2>
          <p className="mt-1 text-xs text-slate-400">Volume by interview type.</p>
          <div className="mt-5 space-y-2">
            {['SCREENING','TECHNICAL','PRACTICAL','FINAL'].map((type) => (
              <div key={type} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold text-slate-600">{statusLabel(type)}</span><span className="text-sm font-black text-slate-950">{interviewTypes[type] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-end justify-between gap-3"><div><h2 className="text-base font-black text-slate-950">Upcoming interviews</h2><p className="mt-1 text-xs text-slate-400">The next panel sessions requiring attention.</p></div><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{upcomingInterviews.length} shown</span></div>
          <div className="mt-5 divide-y divide-slate-100">
            {upcomingInterviews.length ? upcomingInterviews.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.candidate.name}</p><p className="mt-1 text-xs text-slate-400">{item.candidate.reference} · Passport: {item.candidate.passportNumber ?? 'Not provided'} · {statusLabel(item.type)}{item.job?.title ? ' · ' + item.job.title : ''}</p></div>
                <div className="shrink-0 text-right"><p className="text-xs font-black text-slate-900">{new Date(item.scheduledAt).toLocaleDateString()}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
              </div>
            )) : <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-xs text-slate-400">No upcoming interviews.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between"><div><h2 className="text-base font-black text-slate-950">Evaluation workload</h2><p className="mt-1 text-xs text-slate-400">Panel scoring activity in your scope.</p></div><Icon name="chart" size={20} /></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submitted</p><p className="mt-1 text-2xl font-black">{counts.submittedEvaluations}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Drafts</p><p className="mt-1 text-2xl font-black">{counts.draftEvaluations}</p></div>
          </div>
          {analytics.averageScorePoints !== null && <p className="mt-4 text-xs font-semibold text-slate-500">Average submitted criterion score: <strong className="text-slate-950">{analytics.averageScorePoints.toFixed(2)} points</strong></p>}
        </Card>

        {role !== 'INTERVIEWER' ? (
          <Card>
            <h2 className="text-base font-black text-slate-950">Decision queue</h2>
            <p className="mt-1 text-xs text-slate-400">Candidates that reached interview completion.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['INTERVIEW_COMPLETED','PASSED','REJECTED','HIRED'].map((status) => (
                <div key={status} className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{statusLabel(status)}</p><p className="mt-1 text-xl font-black text-slate-950">{candidateStatuses[status] ?? 0}</p></div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <h2 className="text-base font-black text-slate-950">My interview desk</h2>
            <p className="mt-1 text-xs text-slate-400">Keep the panel moving from scheduled to submitted.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'].map((status) => (
                <div key={status} className="rounded-2xl bg-slate-50 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{statusLabel(status)}</p><p className="mt-1 text-xl font-black text-slate-950">{interviewStatuses[status] ?? 0}</p></div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};
