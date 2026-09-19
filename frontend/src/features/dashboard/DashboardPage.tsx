import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { agencies as fixtureAgencies } from '../../domain/fixtures';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, Interview, Job, JobApplication, UserRole } from '../../domain/types';

interface DashboardPageProps {
  role: UserRole;
}

interface AgencyRecord extends Agency {
  counts?: {
    users: number;
    jobs: number;
    candidates: number;
  };
}

interface ApplicationRecord extends JobApplication {
  job?: {
    id: string;
    title: string;
    location: string | null;
  };
  candidate?: {
    id: string;
    name: string;
    profession: string | null;
  };
}

interface AuditEventRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: UserRole } | null;
}

interface DashboardData {
  agencies: AgencyRecord[];
  jobs: Job[];
  candidates: Candidate[];
  applications: ApplicationRecord[];
  interviews: Interview[];
}

const emptyData: DashboardData = {
  agencies: [],
  jobs: [],
  candidates: [],
  applications: [],
  interviews: [],
};

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export const DashboardPage = ({ role }: DashboardPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state } = useRecruitment();
  const [data, setData] = useState<DashboardData>(() => developmentMode
    ? {
        agencies: fixtureAgencies,
        jobs: state.jobs,
        candidates: state.candidates,
        applications: state.applications,
        interviews: state.interviews,
      }
    : emptyData);
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);

  useEffect(() => {
    if (developmentMode) {
      setData({
        agencies: fixtureAgencies,
        jobs: state.jobs,
        candidates: state.candidates,
        applications: state.applications,
        interviews: state.interviews,
      });
      setLoading(false);
      setError('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const requests: Array<Promise<unknown>> = [
      apiFetch<Job[]>('/jobs'),
      apiFetch<Candidate[]>('/candidates'),
      apiFetch<ApplicationRecord[]>('/applications'),
      apiFetch<Interview[]>('/interviews'),
    ];

    if (role === 'ADMIN') {
      requests.push(apiFetch<AgencyRecord[]>('/agencies'));
    }

    Promise.all(requests)
      .then((results) => {
        if (cancelled) return;

        const [jobs, candidates, applications, interviews, agencies = []] = results as [
          Job[],
          Candidate[],
          ApplicationRecord[],
          Interview[],
          AgencyRecord[]?,
        ];

        setData({ jobs, candidates, applications, interviews, agencies });
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, role, state.applications, state.candidates, state.interviews, state.jobs, user?.id]);

  useEffect(() => {
    if (developmentMode || !['ADMIN', 'AGENCY'].includes(role)) {
      setAuditEvents([]);
      return;
    }

    let cancelled = false;
    apiFetch<AuditEventRecord[]>('/audit-events')
      .then((result) => {
        if (!cancelled) setAuditEvents(result.slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setAuditEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, role, user?.id]);

  const upcomingInterviews = useMemo(
    () => data.interviews
      .filter((interview) => interview.status === 'SCHEDULED' && new Date(interview.scheduledAt).getTime() >= Date.now())
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 5),
    [data.interviews],
  );

  const recentApplications = useMemo(
    () => data.applications
      .slice()
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))
      .slice(0, 5),
    [data.applications],
  );

  const stats = useMemo(() => {
    if (role === 'ADMIN') {
      return [
        { label: 'Active agencies', value: data.agencies.filter((agency) => agency.status === 'ACTIVE').length },
        { label: 'Open jobs', value: data.jobs.filter((job) => job.status === 'PUBLISHED').length },
        { label: 'Candidates', value: data.candidates.length },
        { label: 'Applications', value: data.applications.length },
      ];
    }

    if (role === 'AGENCY') {
      return [
        { label: 'Published jobs', value: data.jobs.filter((job) => job.status === 'PUBLISHED').length },
        { label: 'Candidates', value: data.candidates.length },
        { label: 'Applications', value: data.applications.length },
        { label: 'Upcoming interviews', value: upcomingInterviews.length },
      ];
    }

    if (role === 'INTERVIEWER') {
      return [
        { label: 'My interviews', value: data.interviews.length },
        { label: 'Scheduled', value: data.interviews.filter((interview) => interview.status === 'SCHEDULED').length },
        { label: 'Completed', value: data.interviews.filter((interview) => interview.status === 'COMPLETED').length },
        { label: 'Next', value: upcomingInterviews.length ? 1 : 0 },
      ];
    }

    return [
      { label: 'Open jobs', value: data.jobs.filter((job) => job.status === 'PUBLISHED').length },
      { label: 'My applications', value: data.applications.length },
      { label: 'Upcoming interviews', value: upcomingInterviews.length },
      { label: 'Completed interviews', value: data.interviews.filter((interview) => interview.status === 'COMPLETED').length },
    ];
  }, [data, role, upcomingInterviews.length]);

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="Workspace overview"
        title={'Welcome, ' + (user?.name ?? 'there')}
        description={
          role === 'ADMIN'
            ? 'Monitor agencies and the overall recruitment workflow.'
            : role === 'AGENCY'
              ? 'Manage jobs, candidates, applications, and interviews from one workspace.'
              : role === 'INTERVIEWER'
                ? 'Review your assigned interviews and upcoming evaluation work.'
                : 'Follow your applications and upcoming interview schedule.'
        }
      />

      {loading && <StateMessage kind="loading" title="Loading dashboard" description="Fetching the latest workflow data." />}
      {error && <StateMessage kind="error" title="Dashboard data unavailable" description={error} />}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{stat.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-950">Upcoming interviews</h2>
                  <p className="mt-1 text-xs text-slate-400">Next scheduled interviews visible to this role.</p>
                </div>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                {upcomingInterviews.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No upcoming interviews.</p>
                ) : (
                  upcomingInterviews.map((interview) => (
                    <div key={interview.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{formatDateTime(interview.scheduledAt)}</p>
                        <p className="mt-1 text-xs text-slate-400">{interview.type} · {interview.durationMins} min</p>
                      </div>
                      <StatusPill value={interview.status} />
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <div>
                <h2 className="text-sm font-black text-slate-950">Recent applications</h2>
                <p className="mt-1 text-xs text-slate-400">The latest candidates moving through the application workflow.</p>
              </div>

              <div className="mt-5 divide-y divide-slate-100">
                {recentApplications.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No applications yet.</p>
                ) : (
                  recentApplications.map((application) => (
                    <div key={application.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {application.candidate?.name ?? application.candidateId}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {application.job?.title ?? application.jobId}
                        </p>
                      </div>
                      <StatusPill value={application.status} />
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {['ADMIN', 'AGENCY'].includes(role) && (
            <Card>
              <div>
                <h2 className="text-sm font-black text-slate-950">Recent activity</h2>
                <p className="mt-1 text-xs text-slate-400">A small operational history of important workflow changes.</p>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {auditEvents.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No activity recorded yet.</p>
                ) : auditEvents.map((event) => (
                  <div key={event.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{event.summary}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{event.actor?.name ?? 'System'} · {event.action.replaceAll('_', ' ').toLowerCase()}</p>
                    </div>
                    <p className="shrink-0 text-[10px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </section>
  );
};
