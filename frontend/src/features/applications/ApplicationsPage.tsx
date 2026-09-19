import { applications, candidates, jobs } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import type { UserRole } from '../../domain/types';

interface ApplicationsPageProps { role: UserRole; }

const pipeline = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];

export const ApplicationsPage = ({ role }: ApplicationsPageProps) => {
  const visible = role === 'INTERVIEWEE' ? applications.filter((application) => application.candidateId === 'candidate-1') : applications;
  return <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow={role === 'INTERVIEWEE' ? 'My recruitment' : 'Recruitment workflow'} title={role === 'INTERVIEWEE' ? 'My Applications' : 'Applications'} description="Each application connects one candidate to one job and owns the job-specific progress." />
    <div className="grid gap-4 lg:grid-cols-2">{pipeline.map((stage) => { const stageApplications = visible.filter((application) => application.status === stage); return <div key={stage} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-950">{stage.replace('_', ' ')}</h2><p className="mt-1 text-xs text-slate-400">{stageApplications.length} application(s)</p></div><StatusPill value={stage} /></div><div className="mt-4 space-y-3">{stageApplications.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No applications in this stage.</p> : stageApplications.map((application) => { const candidate = candidates.find((item) => item.id === application.candidateId); const job = jobs.find((item) => item.id === application.jobId); return <div key={application.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-900">{candidate?.name ?? 'Candidate'}</p><p className="mt-1 text-xs text-slate-500">{job?.title ?? 'Job'}</p><p className="mt-2 text-[10px] font-semibold text-slate-400">Applied {new Date(application.appliedAt).toLocaleDateString()}</p></div>; })}</div></div>; })}</div>
  </section>;
};
