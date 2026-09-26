import { useEffect, useMemo, useState } from 'react';
import type { CandidateStatus, Interview, InterviewStatus, InterviewType, Job, UserRole } from '../../domain/types';
import { apiFetch } from '../../shared/lib/api';
import { Card } from '../../shared/components/Card';
import { Icon } from '../../shared/components/Icon';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StateMessage } from '../../shared/components/StateMessage';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';

interface Props { role: UserRole; }

interface Analytics {
  scope: UserRole;
  selectedJob?: { id: string; title: string; location: string | null; status: string } | null;
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
  recentInterviews: Array<{
    id: string;
    status: InterviewStatus;
    type: InterviewType;
    scheduledAt: string;
    candidate: { name: string; reference: string; passportNumber: string | null };
    job?: { id: string; title: string; location: string | null } | null;
  }>;
}

const candidateLabels = ['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'];
const interviewStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const interviewTypes = ['SCREENING', 'TECHNICAL', 'PRACTICAL', 'FINAL'];

const csvEscape = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const downloadCsv = (rows: string[][]) => {
  const blob = new Blob([rows.map((row) => row.map(csvEscape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'buildhire-report.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

export const ReportsPage = ({ role }: Props) => {
  const { developmentMode } = useAuth();
  const { state } = useRecruitment();
  const [data, setData] = useState<Analytics | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');

  const developmentData = useMemo<Analytics>(() => {
    const selectedJob = selectedJobId ? state.jobs.find((item) => item.id === selectedJobId) : undefined;
    const memberships = selectedJob ? state.jobCandidates.filter((item) => item.jobId === selectedJob.id) : [];
    const memberIds = new Set(memberships.map((item) => item.candidateId));
    const candidates = selectedJob ? state.candidates.filter((item) => memberIds.has(item.id)) : state.candidates;
    const interviews = selectedJob ? state.interviews.filter((item) => item.jobId === selectedJob.id) : state.interviews;
    const jobFor = (item: Interview) => item.job
      ? { id: item.job.id, title: item.job.title, location: item.job.location }
      : selectedJob
        ? { id: selectedJob.id, title: selectedJob.title, location: selectedJob.location }
        : null;

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
      candidateStatuses: Object.fromEntries(candidateLabels.map((status) => [status, candidates.filter((item) => item.status === status).length])),
      interviewStatuses: Object.fromEntries(interviewStatuses.map((status) => [status, interviews.filter((item) => item.status === status).length])),
      interviewTypes: Object.fromEntries(interviewTypes.map((type) => [type, interviews.filter((item) => item.type === type).length])),
      averageScorePoints: null,
      recentCandidates: candidates.slice(0, 10).map((item) => ({ id: item.id, name: item.name, reference: item.reference, profession: item.profession, status: item.status, statusUpdatedAt: item.statusUpdatedAt })),
      recentInterviews: interviews.slice(0, 10).map((item) => ({
        id: item.id,
        status: item.status,
        type: item.type,
        scheduledAt: item.scheduledAt,
        candidate: {
          name: item.candidate?.name ?? item.candidateId,
          reference: item.candidate?.reference ?? item.candidateId,
          passportNumber: item.candidate?.passportNumber ?? state.candidates.find((candidate) => candidate.id === item.candidateId)?.passportNumber ?? null,
        },
        job: jobFor(item),
      })),
    };
  }, [role, selectedJobId, state]);

  useEffect(() => {
    if (developmentMode) {
      setJobs(state.jobs);
      setData(developmentData);
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
      .then(async ([result, interviews]) => {
        if (cancelled) return;
        if (role !== 'INTERVIEWER') {
          const availableJobs = await apiFetch<Job[]>('/jobs');
          if (!cancelled) setJobs(availableJobs);
        } else {
          const fromInterviews = [...new Map(
            interviews
              .filter((item) => item.job)
              .map((item) => [item.job!.id, item.job as NonNullable<Interview['job']>]),
          ).values()].map((job) => ({ id: job.id, title: job.title, location: job.location, status: job.status }));
          setJobs(fromInterviews);
        }
        setData({
          ...result,
          recentInterviews: result.recentInterviews.map((item) => ({
            ...item,
            candidate: {
              ...item.candidate,
              passportNumber: item.candidate.passportNumber ?? interviews.find((interview) => interview.id === item.id)?.candidate?.passportNumber ?? null,
            },
          })),
        });
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load reports.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [developmentData, developmentMode, role, selectedJobId, state.jobs]);

  const rows = useMemo(() => {
    if (!data) return [];
    return [
      ['Metric', 'Value'],
      ['Generated at', new Date().toISOString()],
      ['Role', role],
      ['Job filter', data.selectedJob?.title ?? 'All jobs'],
      ['Agencies', String(data.counts.agencies)],
      ['Active agencies', String(data.counts.activeAgencies)],
      ['Candidates', String(data.counts.candidates)],
      ['Jobs', String(data.counts.jobs)],
      ['Published jobs', String(data.counts.publishedJobs)],
      ['Interviews', String(data.counts.interviews)],
      ['Submitted evaluations', String(data.counts.submittedEvaluations)],
      ['Draft evaluations', String(data.counts.draftEvaluations)],
      ['Pending decisions', String(data.counts.pendingDecisions)],
      ['Average criterion score', data.averageScorePoints?.toFixed(2) ?? ''],
      [],
      ['Recent interviews', 'Job', 'Candidate', 'Reference', 'Passport number', 'Interview type', 'Interview status', 'Scheduled'],
      ...data.recentInterviews.map((item) => [
        item.job?.title ?? 'No job',
        item.job?.title ?? 'No job',
        item.candidate.name,
        item.candidate.reference,
        item.candidate.passportNumber ?? 'Not provided',
        item.type,
        item.status,
        new Date(item.scheduledAt).toISOString(),
      ]),
      [],
      ['Candidate status', 'Count'],
      ...candidateLabels.map((status) => [status, String(data.candidateStatuses[status] ?? 0)]),
      [],
      ['Interview status', 'Count'],
      ...interviewStatuses.map((status) => [status, String(data.interviewStatuses[status] ?? 0)]),
      [],
      ['Interview type', 'Count'],
      ...interviewTypes.map((type) => [type, String(data.interviewTypes[type] ?? 0)]),
    ];
  }, [data, role]);

  if (loading) return <section className="mx-auto max-w-7xl p-4 sm:p-8"><StateMessage kind="loading" title="Loading reports" description="Preparing the latest recruitment statistics." /></section>;
  if (error || !data) return <section className="mx-auto max-w-7xl p-4 sm:p-8"><StateMessage kind="error" title="Reports unavailable" description={error || 'No report data was returned.'} /></section>;

  const completion = data.counts.interviews ? Math.round(((data.interviewStatuses.COMPLETED ?? 0) / data.counts.interviews) * 100) : 0;
  const finalised = (data.candidateStatuses.PASSED ?? 0) + (data.candidateStatuses.REJECTED ?? 0) + (data.candidateStatuses.HIRED ?? 0);
  const selectedJob = selectedJobId ? jobs.find((job) => job.id === selectedJobId) : null;

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Business intelligence"
          title="Reports & exports"
          description={selectedJob ? 'Job-scoped operational reporting for ' + selectedJob.title + '.' : 'Operational statistics for candidate flow, jobs, interviews, evaluations and decisions.'}
        />
        <div className="flex flex-col gap-2 sm:flex-row print:hidden">
          <div className="min-w-56">
            <SelectMenu
              value={selectedJobId}
              onChange={setSelectedJobId}
              options={[{ value: '', label: 'All jobs' }, ...jobs.map((job) => ({ value: job.id, label: job.title }))]}
              ariaLabel="Filter reports by job"
            />
          </div>
          <button onClick={() => downloadCsv(rows)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white"><Icon name="download" size={16} />Download CSV</button>
          <button onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-800"><Icon name="file" size={16} />Print / Save PDF</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[['Candidates', data.counts.candidates], ['Jobs', data.counts.jobs], ['Interviews', data.counts.interviews], ['Completion', completion + '%'], ['Finalised', finalised]].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          </Card>
        ))}
      </div>

      {data.selectedJob && (
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Selected job</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">{data.selectedJob.title}</h2>
              <p className="mt-1 text-xs text-slate-400">{data.selectedJob.location || 'Location not set'} · {data.selectedJob.status}</p>
            </div>
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">Job-scoped report</span>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-black text-slate-950">Candidate lifecycle</h2>
          <p className="mt-1 text-xs text-slate-400">Current candidate distribution{data.selectedJob ? ' for this job.' : '.'}</p>
          <div className="mt-5 divide-y divide-slate-100">
            {candidateLabels.map((status) => (
              <div key={status} className="flex justify-between px-3 py-3">
                <span className="text-xs font-bold text-slate-600">{status.replaceAll('_', ' ')}</span>
                <span className="font-black">{data.candidateStatuses[status] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-black text-slate-950">Interview performance</h2>
          <p className="mt-1 text-xs text-slate-400">Status and type breakdown{data.selectedJob ? ' for this job.' : '.'}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {interviewStatuses.map((status) => (
              <div key={status} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[9px] font-black uppercase text-slate-400">{status.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-2xl font-black">{data.interviewStatuses[status] ?? 0}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {interviewTypes.map((type) => (
              <div key={type} className="flex justify-between rounded-2xl border border-slate-100 px-4 py-3 text-xs font-bold"><span>{type}</span><span>{data.interviewTypes[type] ?? 0}</span></div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="text-base font-black text-slate-950">Recent interviews</h2><p className="mt-1 text-xs text-slate-400">Job context is included so interview activity can be traced back to the hiring request.</p></div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{data.recentInterviews.length} shown</span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead><tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400"><th className="px-3 py-3">Job</th><th className="px-3 py-3">Candidate</th><th className="px-3 py-3">Passport</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Scheduled</th></tr></thead>
            <tbody>
              {data.recentInterviews.map((item) => (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="px-3 py-3 text-xs font-bold text-slate-800">{item.job?.title ?? 'No job'}</td>
                  <td className="px-3 py-3"><p className="text-xs font-bold">{item.candidate.name}</p><p className="text-[10px] text-slate-400">{item.candidate.reference}</p></td>
                  <td className="px-3 py-3 text-xs font-semibold text-slate-700">{item.candidate.passportNumber ?? 'Not provided'}</td>
                  <td className="px-3 py-3 text-xs">{item.type}</td>
                  <td className="px-3 py-3 text-xs">{item.status.replaceAll('_', ' ')}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{new Date(item.scheduledAt).toLocaleString()}</td>
                </tr>
              ))}
              {!data.recentInterviews.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-xs text-slate-400">No interview activity for the selected scope.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[11px] text-slate-400 print:hidden">CSV downloads the selected job scope when a job is chosen. Print / Save PDF uses the browser's native PDF printing.</p>
    </section>
  );
};
