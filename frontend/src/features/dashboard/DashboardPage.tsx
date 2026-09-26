import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { StatusPill } from '../../shared/components/StatusPill';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { Icon, type IconName } from '../../shared/components/Icon';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { apiFetch } from '../../shared/lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import type { CandidateStatus, Interview, InterviewStatus, InterviewType, Job, UserRole } from '../../domain/types';

interface Props {
  role: UserRole;
}

type JobFilterOption = Pick<Job, 'id' | 'title' | 'location' | 'status'>;

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
    totalOpenings: number;
    filledWorkers: number;
    remainingOpenings: number;
    pendingInterviewerEvaluations: number;
  };
  candidateStatuses: Record<string, number>;
  interviewStatuses: Record<string, number>;
  interviewTypes: Record<string, number>;
  averageScorePoints: number | null;
  recentCandidates: Array<{
    id: string;
    name: string;
    reference: string;
    requestedProfession: string | null;
    status: CandidateStatus;
    statusUpdatedAt: string;
  }>;
  recentInterviews: Array<{
    id: string;
    status: InterviewStatus;
    type: InterviewType;
    scheduledAt: string;
    candidate: { name: string; reference: string; passportNumber: string | null };
    job?: { id: string; title: string; location: string | null } | null;
  }>;
  upcomingInterviews: Array<{
    id: string;
    scheduledAt: string;
    type: InterviewType;
    candidate: { name: string; reference: string; passportNumber: string | null };
    job?: { id: string; title: string; location: string | null } | null;
  }>;
  selectedJob?: { id: string; title: string; location: string | null; status: string } | null;
}

const statusLabel = (value: string) => value.replaceAll('_', ' ');
const startOfToday = () => {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value.getTime();
};
const endOfToday = () => {
  const value = new Date();
  value.setHours(23, 59, 59, 999);
  return value.getTime();
};
const isToday = (value: string) => {
  const timestamp = new Date(value).getTime();
  return timestamp >= startOfToday() && timestamp <= endOfToday();
};

const toneClasses = {
  cyan: { icon: 'bg-cyan-50 text-cyan-700', value: 'text-slate-950', ring: 'bg-cyan-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', value: 'text-slate-950', ring: 'bg-emerald-500' },
  amber: { icon: 'bg-amber-50 text-amber-700', value: 'text-slate-950', ring: 'bg-amber-500' },
  rose: { icon: 'bg-rose-50 text-rose-700', value: 'text-slate-950', ring: 'bg-rose-500' },
  violet: { icon: 'bg-violet-50 text-violet-700', value: 'text-slate-950', ring: 'bg-violet-500' },
} as const;

type Tone = keyof typeof toneClasses;

const MetricCard = ({
  label,
  value,
  hint,
  icon,
  tone = 'cyan',
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: IconName;
  tone?: Tone;
}) => (
  <Card className="min-w-0 overflow-hidden">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className={`mt-2 text-2xl font-black tracking-tight ${toneClasses[tone].value} sm:text-3xl`}>{value}</p>
        <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">{hint}</p>
      </div>
      <div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${toneClasses[tone].icon}`}>
        <Icon name={icon} size={18} />
      </div>
    </div>
  </Card>
);

const ProgressBar = ({ value, tone = 'cyan' }: { value: number; tone?: Tone }) => (
  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
    <div className={`h-full rounded-full transition-all ${toneClasses[tone].ring}`} style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
  </div>
);

const PipelineCard = ({ label, value, total, tone = 'cyan' }: { label: string; value: number; total: number; tone?: Tone }) => {
  const ratio = total ? (value / total) * 100 : 0;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-sm font-black text-slate-950">{value}</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={ratio} tone={tone} />
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-400">{Math.round(ratio)}% of scoped candidates</p>
    </div>
  );
};

const ScheduleItem = ({
  item,
  interviewer = false,
}: {
  item: Analytics['upcomingInterviews'][number];
  interviewer?: boolean;
}) => (
  <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-cyan-300">
        <Icon name="calendar" size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-900">{item.candidate.name}</p>
        <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
          {item.candidate.reference}
          {item.candidate.passportNumber ? ' · Passport: ' + item.candidate.passportNumber : ''}
        </p>
        <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
          {statusLabel(item.type)}{item.job?.title ? ' · ' + item.job.title : ''}
        </p>
      </div>
    </div>
    <div className="shrink-0 sm:text-right">
      <p className="text-xs font-black text-slate-900">{new Date(item.scheduledAt).toLocaleDateString()}</p>
      <p className="mt-1 text-[10px] font-semibold text-slate-400">
        {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      {interviewer && <span className="mt-2 inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-700">Assigned</span>}
    </div>
  </div>
);

export const DashboardPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { t } = useLanguage();
  const { state } = useRecruitment();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [jobs, setJobs] = useState<JobFilterOption[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');

  const developmentAnalytics = useMemo<Analytics>(() => {
    const selectedJob = selectedJobId ? state.jobs.find((item) => item.id === selectedJobId) : undefined;
    const allInterviews = role === 'INTERVIEWER'
      ? state.interviews.filter((item) => item.panelUserIds.includes(user?.id ?? ''))
      : state.interviews;
    const interviews = selectedJob ? allInterviews.filter((item) => item.jobId === selectedJob.id) : allInterviews;
    const memberIds = selectedJob
      ? new Set(state.jobCandidates.filter((item) => item.jobId === selectedJob.id).map((item) => item.candidateId))
      : null;
    const candidates = role === 'INTERVIEWER'
      ? state.candidates.filter((item) => new Set(interviews.map((interview) => interview.candidateId)).has(item.id))
      : memberIds
        ? state.candidates.filter((item) => memberIds.has(item.id))
        : state.candidates;
    const scopedJobs = role === 'INTERVIEWER'
      ? state.jobs.filter((item) => new Set(interviews.map((interview) => interview.jobId).filter(Boolean)).has(item.id))
      : selectedJob ? [selectedJob] : state.jobs;
    const scopedMemberships = state.jobCandidates.filter((item) => new Set(scopedJobs.map((job) => job.id)).has(item.jobId));
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
    const submittedForInterviewer = interviews.filter((item) => item.evaluations?.some((evaluation) => evaluation.interviewerId === user?.id && evaluation.status === 'SUBMITTED')).length;
    const pendingForInterviewer = role === 'INTERVIEWER'
      ? interviews.filter((item) => ['IN_PROGRESS', 'COMPLETED'].includes(item.status) && !item.evaluations?.some((evaluation) => evaluation.interviewerId === user?.id && evaluation.status === 'SUBMITTED')).length
      : 0;
    const totalOpenings = scopedJobs.reduce((sum, item) => sum + item.openings, 0);
    const filledWorkers = scopedMemberships.filter((item) => item.status === 'HIRED').length;

    return {
      scope: role,
      selectedJob: selectedJob ? { id: selectedJob.id, title: selectedJob.title, location: selectedJob.location, status: selectedJob.status } : null,
      counts: {
        agencies: state.agencies.length,
        activeAgencies: state.agencies.filter((item) => item.status === 'ACTIVE').length,
        candidates: candidates.length,
        jobs: scopedJobs.length,
        publishedJobs: scopedJobs.filter((item) => item.status === 'PUBLISHED').length,
        interviews: interviews.length,
        submittedEvaluations: role === 'INTERVIEWER' ? submittedForInterviewer : interviews.filter((item) => item.status === 'COMPLETED').length,
        draftEvaluations: role === 'INTERVIEWER' ? pendingForInterviewer : interviews.filter((item) => item.status === 'IN_PROGRESS').length,
        pendingDecisions: role === 'INTERVIEWER' ? 0 : candidates.filter((item) => item.status === 'INTERVIEW_COMPLETED').length,
        totalOpenings,
        filledWorkers,
        remainingOpenings: Math.max(0, totalOpenings - filledWorkers),
        pendingInterviewerEvaluations: pendingForInterviewer,
      },
      candidateStatuses,
      interviewStatuses,
      interviewTypes,
      averageScorePoints: null,
      recentCandidates: candidates.slice().sort((a, b) => b.statusUpdatedAt.localeCompare(a.statusUpdatedAt)).slice(0, 8).map((item) => ({
        id: item.id,
        name: item.name,
        reference: item.reference,
        requestedProfession: item.requestedProfession,
        status: item.status,
        statusUpdatedAt: item.statusUpdatedAt,
      })),
      recentInterviews: interviews.slice().sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).slice(0, 8).map(interviewView),
      upcomingInterviews: interviews
        .filter((item) => item.status === 'SCHEDULED' && new Date(item.scheduledAt).getTime() >= Date.now())
        .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
        .slice(0, 8)
        .map(interviewView),
    };
  }, [role, selectedJobId, state, user?.id]);

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
      apiFetch<Interview[]>('/interviews'),
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
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard analytics.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, developmentAnalytics, role, selectedJobId, state.jobs]);

  if (loading) {
    return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="loading" title="Loading dashboard" description="Preparing your recruitment command center." /></section>;
  }

  if (error || !analytics) {
    return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="error" title="Dashboard unavailable" description={error || 'No analytics data was returned.'} /></section>;
  }

  const { counts, candidateStatuses, interviewStatuses, interviewTypes, upcomingInterviews, recentCandidates } = analytics;
  const activeJob = selectedJobId ? jobs.find((job) => job.id === selectedJobId) : null;
  const completionRate = counts.interviews ? Math.round(((interviewStatuses.COMPLETED ?? 0) / counts.interviews) * 100) : 0;
  const fillRate = counts.totalOpenings ? Math.round((counts.filledWorkers / counts.totalOpenings) * 100) : 0;
  const decisionRate = counts.candidates
    ? Math.round(((candidateStatuses.PASSED ?? 0) + (candidateStatuses.REJECTED ?? 0) + (candidateStatuses.HIRED ?? 0)) / counts.candidates * 100)
    : 0;
  const noShowRate = counts.interviews ? Math.round(((interviewStatuses.NO_SHOW ?? 0) / counts.interviews) * 100) : 0;
  const todayInterviews = upcomingInterviews.filter((item) => isToday(item.scheduledAt));
  const nextInterview = upcomingInterviews[0] ?? null;

  const roleLabel = role === 'ADMIN' ? 'Operations command center' : role === 'AGENCY' ? 'Agency recruitment desk' : 'Interviewer command center';
  const roleDescription = selectedJobId
    ? 'Focused on the selected job and its active recruitment workflow.'
    : role === 'ADMIN'
      ? 'Monitor capacity, candidate flow, interviews and decisions across the platform.'
      : role === 'AGENCY'
        ? 'Track your hiring pipeline, open roles, interviews and candidate movement.'
        : 'See your assigned interviews, evaluation workload and the next actions that need attention.';

  return (
    <section className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-5 sm:p-5 lg:space-y-6 lg:p-8">
      <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-xl">
        <div className="grid gap-5 p-5 text-white sm:p-7 lg:grid-cols-[1.3fr_.7fr] lg:items-end lg:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Live workspace</span>
              {selectedJobId && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">Job scope</span>}
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{t('Good to see you,')} {user?.name ?? t('there')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{roleLabel} · {roleDescription}</p>
            {nextInterview && (
              <div className="mt-5 flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Next interview</p>
                  <p className="mt-1 truncate text-sm font-black text-white">{nextInterview.candidate.name}</p>
                  <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{nextInterview.job?.title ?? 'Platform interview'} · {statusLabel(nextInterview.type)}</p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-sm font-black text-white">{new Date(nextInterview.scheduledAt).toLocaleDateString()}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">{new Date(nextInterview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-1">
            <SelectMenu
              value={selectedJobId}
              onChange={setSelectedJobId}
              options={[
                { value: '', label: 'All jobs' },
                ...jobs.map((job) => ({ value: job.id, label: job.title })),
              ]}
              ariaLabel="Filter dashboard by job"
            />
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 lg:justify-start">
              <span>Updated</span>
              <span className="ml-2 text-slate-100">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {role === 'INTERVIEWER' ? (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Assigned interviews" value={counts.interviews} hint={(interviewStatuses.SCHEDULED ?? 0) + ' scheduled'} icon="calendar" tone="cyan" />
            <MetricCard label="Today" value={todayInterviews.length} hint="sessions visible in the next queue" icon="clock" tone="violet" />
            <MetricCard label="Needs evaluation" value={counts.pendingInterviewerEvaluations} hint="in progress or completed" icon="alert" tone="amber" />
            <MetricCard label="Completion" value={completionRate + '%'} hint={(interviewStatuses.COMPLETED ?? 0) + ' completed'} icon="target" tone="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
            <Card className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">Next actions</p>
                  <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">My interview desk</h2>
                  <p className="mt-1 text-xs text-slate-400">Your assigned sessions, not the whole platform schedule.</p>
                </div>
                <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon name="calendar" size={17} /></div>
              </div>
              <div className="mt-4 space-y-2.5">
                {upcomingInterviews.length ? upcomingInterviews.map((item) => <ScheduleItem key={item.id} item={item} interviewer />) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">No upcoming assigned interviews.</div>}
              </div>
            </Card>

            <Card className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Evaluation health</p>
              <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Submission status</h2>
              <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-4xl font-black">{counts.submittedEvaluations}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">submitted evaluations</p>
                <div className="mt-4"><ProgressBar value={counts.submittedEvaluations + counts.pendingInterviewerEvaluations ? counts.submittedEvaluations / (counts.submittedEvaluations + counts.pendingInterviewerEvaluations) * 100 : 0} tone="violet" /></div>
                <p className="mt-2 text-[10px] font-semibold text-slate-400">{counts.pendingInterviewerEvaluations} still need attention</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">In progress</p><p className="mt-1 text-xl font-black">{interviewStatuses.IN_PROGRESS ?? 0}</p></div>
                <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">No show</p><p className="mt-1 text-xl font-black">{interviewStatuses.NO_SHOW ?? 0}</p></div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['SCREENING', 'TECHNICAL', 'PRACTICAL', 'FINAL'].map((type) => (
              <div key={type} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{statusLabel(type)}</span>
                  <span className="text-sm font-black text-slate-950">{interviewTypes[type] ?? 0}</span>
                </div>
                <div className="mt-3"><ProgressBar value={counts.interviews ? ((interviewTypes[type] ?? 0) / counts.interviews) * 100 : 0} tone="cyan" /></div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {role === 'ADMIN' && <MetricCard label="Agencies" value={counts.activeAgencies} hint={counts.agencies + ' total workspaces'} icon="users" tone="cyan" />}
            <MetricCard label="Open roles" value={counts.publishedJobs} hint={counts.jobs + ' jobs in scope'} icon="briefcase" tone="violet" />
            <MetricCard label="Candidates" value={counts.candidates} hint={(candidateStatuses.INTERVIEW_COMPLETED ?? 0) + ' awaiting final decision'} icon="users" tone="cyan" />
            <MetricCard label="Interviews" value={counts.interviews} hint={(interviewStatuses.SCHEDULED ?? 0) + ' scheduled'} icon="calendar" tone="amber" />
            <MetricCard label="Hiring fill" value={fillRate + '%'} hint={counts.remainingOpenings + ' openings remaining'} icon="target" tone="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
            <Card className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Capacity</p>
                  <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Hiring progress</h2>
                  <p className="mt-1 text-xs text-slate-400">Filled worker positions against requested capacity.</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{fillRate}% filled</span>
              </div>
              <div className="mt-5">
                <div className="flex items-end justify-between gap-3">
                  <div><p className="text-3xl font-black text-slate-950">{counts.filledWorkers}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">workers filled</p></div>
                  <div className="text-right"><p className="text-2xl font-black text-slate-700">{counts.totalOpenings}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">requested</p></div>
                </div>
                <div className="mt-4"><ProgressBar value={fillRate} tone="emerald" /></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Remaining</p><p className="mt-1 text-xl font-black">{counts.remainingOpenings}</p></div>
                <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Hired</p><p className="mt-1 text-xl font-black">{candidateStatuses.HIRED ?? 0}</p></div>
              </div>
            </Card>

            <Card className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">Pipeline</p>
                  <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Candidate movement</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{decisionRate}% finalised</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <PipelineCard label="Pool" value={candidateStatuses.POOL ?? 0} total={counts.candidates} tone="cyan" />
                <PipelineCard label="Ready" value={candidateStatuses.READY_FOR_INTERVIEW ?? 0} total={counts.candidates} tone="violet" />
                <PipelineCard label="Interview scheduled" value={candidateStatuses.INTERVIEW_SCHEDULED ?? 0} total={counts.candidates} tone="amber" />
                <PipelineCard label="Interview completed" value={candidateStatuses.INTERVIEW_COMPLETED ?? 0} total={counts.candidates} tone="emerald" />
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <Card className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Interview operations</p>
                  <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Schedule health</h2>
                </div>
                <div className="text-right"><p className="text-2xl font-black text-slate-950">{completionRate}%</p><p className="text-[10px] font-semibold text-slate-400">completion</p></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => (
                  <div key={status} className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{statusLabel(status)}</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{interviewStatuses[status] ?? 0}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4"><ProgressBar value={completionRate} tone="amber" /></div>
              <p className="mt-2 text-[10px] font-semibold text-slate-400">{noShowRate}% no-show rate · {counts.draftEvaluations} draft evaluations</p>
            </Card>

            <Card className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">Decision queue</p>
              <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Where attention is needed</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {[
                  ['INTERVIEW_COMPLETED', candidateStatuses.INTERVIEW_COMPLETED ?? 0, 'Awaiting decision'],
                  ['PASSED', candidateStatuses.PASSED ?? 0, 'Passed'],
                  ['REJECTED', candidateStatuses.REJECTED ?? 0, 'Rejected'],
                  ['HIRED', candidateStatuses.HIRED ?? 0, 'Hired'],
                ].map(([status, value, hint]) => (
                  <div key={status as string} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2"><StatusPill value={status as string} /><span className="text-lg font-black text-slate-950">{value as number}</span></div>
                    <p className="mt-2 text-[10px] font-semibold text-slate-400">{hint as string}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <Card className="min-w-0">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Live schedule</p>
                  <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Upcoming interviews</h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{upcomingInterviews.length} shown</span>
              </div>
              <div className="mt-4 space-y-2.5">
                {upcomingInterviews.length ? upcomingInterviews.slice(0, 6).map((item) => <ScheduleItem key={item.id} item={item} />) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">No upcoming interviews.</div>}
              </div>
            </Card>

            <Card className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Latest movement</p>
                  <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Candidate updates</h2>
                </div>
                <Icon name="refresh" size={18} />
              </div>
              <div className="mt-4 space-y-2.5">
                {recentCandidates.length ? recentCandidates.slice(0, 6).map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">{candidate.name}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{candidate.reference}{candidate.requestedProfession ? ' · ' + candidate.requestedProfession : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusPill value={candidate.status} />
                      <p className="mt-1 text-[9px] font-semibold text-slate-400">{new Date(candidate.statusUpdatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">No recent candidate movement.</div>}
              </div>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['SCREENING', 'TECHNICAL', 'PRACTICAL', 'FINAL'].map((type) => (
              <div key={type} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{statusLabel(type)}</span>
                  <span className="text-sm font-black text-slate-950">{interviewTypes[type] ?? 0}</span>
                </div>
                <div className="mt-3"><ProgressBar value={counts.interviews ? ((interviewTypes[type] ?? 0) / counts.interviews) * 100 : 0} tone="cyan" /></div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
