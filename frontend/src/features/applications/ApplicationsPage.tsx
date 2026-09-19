import { applications, candidates, jobs } from '../../domain/fixtures';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import type { UserRole } from '../../domain/types';

interface ApplicationsPageProps { role: UserRole; }

const pipeline = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'] as const;
const nextStage: Record<string, string> = { APPLIED: 'SCREENING', SCREENING: 'SHORTLISTED', SHORTLISTED: 'INTERVIEW', INTERVIEW: 'SELECTED' };

export const ApplicationsPage = ({ role }: ApplicationsPageProps) => {
  const { state, dispatch } = useRecruitment();
  const all = state.applications.length ? state.applications : applications;
  const visible = role === 'INTERVIEWEE' ? all.filter((application) => application.candidateId === state.users.find((user) => user.role === 'INTERVIEWEE')?.candidateId) : all;
  return <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow={role === 'INTERVIEWEE' ? 'My recruitment' : 'Recruitment workflow'} title={role === 'INTERVIEWEE' ? 'My Applications' : 'Applications'} description="Each application connects one candidate to one job and owns the job-specific progress." />
    <div className="grid gap-4">{pipeline.map((stage) => { const stageApplications = visible.filter((application) => application.status === stage); return <div key={stage} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-950">{stage.replace('_', ' ')}</h2><p className="mt-1 text-xs text-slate-400">{stageApplications.length} application(s)</p></div><StatusPill value={stage} /></div><div className="mt-4 space-y-3">{stageApplications.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No applications in this stage.</p> : stageApplications.map((application) => { const candidate = (state.candidates.length ? state.candidates : candidates).find((item) => item.id === application.candidateId); const job = (state.jobs.length ? state.jobs : jobs).find((item) => item.id === application.jobId); const canAdvance = role === 'AGENCY' && nextStage[application.status]; return <div key={application.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{candidate?.name ?? 'Candidate'}</p><p className="mt-1 text-xs text-slate-500">{job?.title ?? 'Job'}</p><p className="mt-2 text-[10px] font-semibold text-slate-400">Applied {new Date(application.appliedAt).toLocaleDateString()}</p></div>{canAdvance && <button type="button" onClick={() => dispatch({ type: 'SET_APPLICATION_STATUS', applicationId: application.id, status: nextStage[application.status] as typeof application.status })} className="rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-bold text-white">Advance</button>}</div></div>; })}</div></div>; })}</div>
  </section>;
};
