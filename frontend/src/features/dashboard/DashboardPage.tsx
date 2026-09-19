import { useMemo } from 'react';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { useRecruitment } from '../../domain/recruitmentContext';
import type { UserRole } from '../../domain/types';

interface DashboardPageProps { role: UserRole; }

export const DashboardPage = ({ role }: DashboardPageProps) => {
  const { state } = useRecruitment();
  const myCandidateId = state.users.find((user) => user.role === 'INTERVIEWEE')?.candidateId;

  const stats = useMemo(() => {
    if (role === 'ADMIN') return [
      ['Agencies', state.agencies.length, 'Recruitment workspaces'],
      ['Active agencies', state.agencies.filter((agency) => agency.status === 'ACTIVE').length, 'Currently active'],
      ['Agency users', state.users.filter((user) => user.role === 'AGENCY').length, 'Agency accounts'],
    ];
    if (role === 'INTERVIEWER') return [
      ['Assigned interviews', state.interviews.filter((interview) => interview.panelUserIds.includes('user-interviewer-1')).length, 'Interviews in your panel'],
      ['Upcoming', state.interviews.filter((interview) => interview.status === 'SCHEDULED').length, 'Scheduled sessions'],
    ];
    if (role === 'INTERVIEWEE') return [
      ['Published jobs', state.jobs.filter((job) => job.status === 'PUBLISHED').length, 'Available positions'],
      ['My applications', state.applications.filter((application) => application.candidateId === myCandidateId).length, 'Current applications'],
      ['My interviews', state.interviews.filter((interview) => state.applications.find((application) => application.id === interview.applicationId)?.candidateId === myCandidateId).length, 'Interview sessions'],
    ];
    return [
      ['Published jobs', state.jobs.filter((job) => job.status === 'PUBLISHED').length, 'Jobs visible to candidates'],
      ['Candidates', state.candidates.length, 'Candidate records'],
      ['Applications', state.applications.length, 'Current applications'],
      ['Upcoming interviews', state.interviews.filter((interview) => interview.status === 'SCHEDULED').length, 'Sessions to prepare'],
    ];
  }, [myCandidateId, role, state]);

  return <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow="Role-aware workspace" title="Recruitment at a glance" description={role === 'ADMIN' ? 'System administration across agency workspaces.' : role === 'AGENCY' ? 'Jobs, candidates, applications, and interviews in one place.' : role === 'INTERVIEWER' ? 'Your assigned interview workload and upcoming sessions.' : 'Find jobs, manage applications, and view interviews.'} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, note]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs leading-5 text-slate-400">{note}</p></div>)}</div>
    {role === 'AGENCY' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-950">Current application flow</h2><div className="mt-5 grid gap-3 sm:grid-cols-4">{['APPLIED','SCREENING','SHORTLISTED','INTERVIEW'].map((status) => <div key={status} className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-black text-slate-900">{state.applications.filter((application) => application.status === status).length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{status}</p></div>)}</div></div>}
    {role === 'INTERVIEWEE' && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-950">My recruitment status</h2><div className="mt-4 space-y-3">{state.applications.filter((application) => application.candidateId === myCandidateId).map((application) => <div key={application.id} className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{state.jobs.find((job) => job.id === application.jobId)?.title}</p><p className="mt-1 text-xs text-slate-400">Applied {new Date(application.appliedAt).toLocaleDateString()}</p></div><StatusPill value={application.status} /></div>)}</div></div>}
  </section>;
};
