import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, CandidateStatus, Interview, Job, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

interface AuditEventRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: UserRole } | null;
}

const statusLabel = (value: CandidateStatus): string => value.replaceAll('_', ' ');

export const DashboardPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state } = useRecruitment();
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [jobs, setJobs] = useState<Job[]>(developmentMode ? state.jobs : []);
  const [candidates, setCandidates] = useState<Candidate[]>(developmentMode ? state.candidates : []);
  const [interviews, setInterviews] = useState<Interview[]>(developmentMode ? state.interviews : []);
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setAgencies(state.agencies);
      setJobs(state.jobs);
      setCandidates(state.candidates);
      setInterviews(state.interviews);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const workspaceRole = ['ADMIN', 'AGENCY'].includes(role);
    const requests = Promise.all([
      role === 'ADMIN' ? apiFetch<Agency[]>('/agencies') : Promise.resolve([] as Agency[]),
      workspaceRole ? apiFetch<Job[]>('/jobs') : Promise.resolve([] as Job[]),
      workspaceRole ? apiFetch<Candidate[]>('/candidates') : Promise.resolve([] as Candidate[]),
      apiFetch<Interview[]>('/interviews'),
    ]);

    requests
      .then(([agencyResult, jobResult, candidateResult, interviewResult]) => {
        if (cancelled) return;
        setAgencies(agencyResult);
        setJobs(jobResult);
        setCandidates(candidateResult);
        setInterviews(interviewResult);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard data.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [developmentMode, role, state.agencies, state.jobs, state.candidates, state.interviews, user?.id]);

  useEffect(() => {
    if (developmentMode || !['ADMIN', 'AGENCY'].includes(role)) {
      setAuditEvents([]);
      return;
    }
    let cancelled = false;
    apiFetch<AuditEventRecord[]>('/audit-events')
      .then((result) => { if (!cancelled) setAuditEvents(result.slice(0, 8)); })
      .catch(() => { if (!cancelled) setAuditEvents([]); });
    return () => { cancelled = true; };
  }, [developmentMode, role, user?.id]);

  const upcoming = useMemo(
    () => interviews.filter((item) => item.status === 'SCHEDULED' && new Date(item.scheduledAt).getTime() >= Date.now()).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5),
    [interviews],
  );

  const candidateStatusCounts = useMemo(() => {
    const counts = new Map<CandidateStatus, number>();
    candidates.forEach((candidate) => counts.set(candidate.status, (counts.get(candidate.status) ?? 0) + 1));
    return counts;
  }, [candidates]);

  const stats = role === 'ADMIN'
    ? [
        { label: 'Active agencies', value: agencies.filter((agency) => agency.status === 'ACTIVE').length },
        { label: 'Open positions', value: jobs.filter((job) => job.status === 'PUBLISHED').length },
        { label: 'Candidate pool', value: candidates.length },
        { label: 'Scheduled interviews', value: interviews.filter((item) => item.status === 'SCHEDULED').length },
      ]
    : role === 'AGENCY'
      ? [
          { label: 'Open positions', value: jobs.filter((job) => job.status === 'PUBLISHED').length },
          { label: 'Candidate pool', value: candidates.length },
          { label: 'Ready for interview', value: (candidateStatusCounts.get('READY_FOR_INTERVIEW') ?? 0) + (candidateStatusCounts.get('POOL') ?? 0) },
          { label: 'Scheduled interviews', value: interviews.filter((item) => item.status === 'SCHEDULED').length },
        ]
      : role === 'INTERVIEWER'
        ? [
            { label: 'My interviews', value: interviews.length },
            { label: 'Scheduled', value: interviews.filter((item) => item.status === 'SCHEDULED').length },
            { label: 'Completed', value: interviews.filter((item) => item.status === 'COMPLETED').length },
            { label: 'Pending evaluations', value: interviews.filter((item) => item.status === 'SCHEDULED').length },
          ]
        : [
            { label: 'My interviews', value: interviews.length },
            { label: 'Scheduled', value: interviews.filter((item) => item.status === 'SCHEDULED').length },
            { label: 'Completed', value: interviews.filter((item) => item.status === 'COMPLETED').length },
            { label: 'Current status', value: candidates[0] ? statusLabel(candidates[0].status) : 'Not set' },
          ];

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="Workspace overview"
        title={'Welcome, ' + (user?.name ?? 'there')}
        description={
          role === 'ADMIN'
            ? 'Operate across all agency workspaces, monitor the candidate pool, and manage interviews and scoring setup.'
            : role === 'AGENCY'
              ? 'Run the candidate pool, job positions, interviewer assignments, and candidate decisions from one workspace.'
              : role === 'INTERVIEWER'
                ? 'Review assigned interviews and complete the interview scorecards.'
                : 'Review your profile and assigned interview schedule.'
        }
      />

      {loading && <StateMessage kind="loading" title="Loading dashboard" description="Fetching the latest recruitment data." />}
      {error && <StateMessage kind="error" title="Dashboard data unavailable" description={error} />}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                <p className="mt-2 truncate text-3xl font-black tracking-tight text-slate-950">{stat.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-sm font-black text-slate-950">Upcoming interviews</h2>
              <p className="mt-1 text-xs text-slate-400">Next scheduled interviews visible to this role.</p>
              <div className="mt-5 divide-y divide-slate-100">
                {upcoming.length ? upcoming.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{interview.candidate?.name ?? interview.candidateId}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(interview.scheduledAt).toLocaleString()} · {interview.type}</p>
                    </div>
                    <StatusPill value={interview.status} />
                  </div>
                )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No upcoming interviews.</p>}
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-black text-slate-950">Candidate pipeline</h2>
              <p className="mt-1 text-xs text-slate-400">Current lifecycle distribution in the candidate pool.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED'] as CandidateStatus[]).map((status) => (
                  <div key={status} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{statusLabel(status)}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{candidateStatusCounts.get(status) ?? 0}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {['ADMIN', 'AGENCY'].includes(role) && (
            <Card>
              <h2 className="text-sm font-black text-slate-950">Recent activity</h2>
              <p className="mt-1 text-xs text-slate-400">Important recruitment and administration changes.</p>
              <div className="mt-4 divide-y divide-slate-100">
                {auditEvents.length ? auditEvents.map((event) => (
                  <div key={event.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div><p className="text-xs font-bold text-slate-800">{event.summary}</p><p className="mt-1 text-[10px] text-slate-400">{event.actor?.name ?? 'System'} · {event.action.replaceAll('_', ' ').toLowerCase()}</p></div>
                    <p className="shrink-0 text-[10px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No activity recorded yet.</p>}
              </div>
            </Card>
          )}
        </>
      )}
    </section>
  );
};
