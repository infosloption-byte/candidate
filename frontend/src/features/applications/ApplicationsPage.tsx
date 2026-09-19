import { useEffect, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { applications as fixtureApplications, candidates as fixtureCandidates, jobs as fixtureJobs } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { ApplicationStatus, JobApplication, UserRole } from '../../domain/types';

interface ApplicationsPageProps { role: UserRole; }

interface ApplicationRecord extends JobApplication {
  notes?: string | null;
  job?: {
    id: string;
    agencyId: string;
    title: string;
    location: string | null;
    openings: number;
    status: string;
  };
  candidate?: {
    id: string;
    agencyId: string;
    reference: string;
    name: string;
    email: string | null;
    profession: string | null;
  };
}

const pipeline: ApplicationStatus[] = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
const nextStage: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  APPLIED: 'SCREENING',
  SCREENING: 'SHORTLISTED',
  SHORTLISTED: 'INTERVIEW',
  INTERVIEW: 'SELECTED',
};

export const ApplicationsPage = ({ role }: ApplicationsPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [applications, setApplications] = useState<ApplicationRecord[]>(
    developmentMode ? fixtureApplications : [],
  );
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setApplications(state.applications.length ? state.applications : fixtureApplications);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    apiFetch<ApplicationRecord[]>('/applications')
      .then((result) => {
        if (!cancelled) setApplications(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load applications.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, state.applications, user?.id]);

  const updateStatus = async (application: ApplicationRecord, status: ApplicationStatus) => {
    setError('');

    try {
      const updated = developmentMode
        ? { ...application, status }
        : await apiFetch<ApplicationRecord>('/applications/' + application.id, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          });

      if (developmentMode) {
        dispatch({ type: 'SET_APPLICATION_STATUS', applicationId: application.id, status });
      } else {
        setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
      }

      setSuccess('Application is now ' + status.toLowerCase().replace('_', ' ') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the application.');
    }
  };

  const candidateData = developmentMode
    ? (state.candidates.length ? state.candidates : fixtureCandidates)
    : [];
  const jobData = developmentMode
    ? (state.jobs.length ? state.jobs : fixtureJobs)
    : [];

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'INTERVIEWEE' ? 'My recruitment' : 'Recruitment workflow'}
        title={role === 'INTERVIEWEE' ? 'My Applications' : 'Applications'}
        description="Each application connects one candidate to one job and owns the job-specific progress."
      />

      {loading && <StateMessage kind="loading" title="Loading applications" description="Fetching the latest application workflow." />}
      {error && <StateMessage kind="error" title="Application action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      {!loading && applications.length === 0 && (
        <StateMessage
          kind="empty"
          title="No applications yet"
          description={role === 'INTERVIEWEE' ? 'Applications you submit to published jobs will appear here.' : 'Applications will appear here once candidates apply.'}
        />
      )}

      {!loading && applications.length > 0 && (
        <div className="grid gap-4">
          {pipeline.map((stage) => {
            const stageApplications = applications.filter((application) => application.status === stage);
            return (
              <Card key={stage}>
                <div className="flex items-center justify-between">
                  <div><h2 className="text-sm font-black text-slate-950">{stage.replace('_', ' ')}</h2><p className="mt-1 text-xs text-slate-400">{stageApplications.length} application(s)</p></div>
                  <StatusPill value={stage} />
                </div>
                <div className="mt-4 space-y-3">
                  {stageApplications.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No applications in this stage.</p>
                  ) : stageApplications.map((application) => {
                    const candidate = application.candidate ?? candidateData.find((item) => item.id === application.candidateId);
                    const job = application.job ?? jobData.find((item) => item.id === application.jobId);
                    const advance = role === 'AGENCY' ? nextStage[application.status] : undefined;
                    const canWithdraw = role === 'INTERVIEWEE' && ['APPLIED', 'SCREENING', 'SHORTLISTED'].includes(application.status);

                    return (
                      <div key={application.id} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{candidate?.name ?? 'Candidate'}</p>
                            <p className="mt-1 text-xs text-slate-500">{job?.title ?? 'Job'}</p>
                            <p className="mt-2 text-[10px] font-semibold text-slate-400">Applied {new Date(application.appliedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {advance && <Button size="sm" onClick={() => void updateStatus(application, advance)}>Advance</Button>}
                            {canWithdraw && <Button size="sm" variant="secondary" onClick={() => void updateStatus(application, 'WITHDRAWN')}>Withdraw</Button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
