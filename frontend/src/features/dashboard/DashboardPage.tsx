import { agencies, applications, candidates, interviews, jobs } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import type { UserRole } from '../../domain/types';

interface DashboardPageProps { role: UserRole; }

const agencyStats = [
  { label: 'Published jobs', getValue: () => jobs.filter((job) => job.status === 'PUBLISHED').length, note: 'Jobs visible to candidates' },
  { label: 'Candidates', getValue: () => candidates.length, note: 'Candidate records in this agency' },
  { label: 'Applications', getValue: () => applications.length, note: 'Current job applications' },
  { label: 'Upcoming interviews', getValue: () => interviews.filter((item) => item.status === 'SCHEDULED').length, note: 'Interviews that need preparation' },
];

const DashboardContent = ({ role }: DashboardPageProps) => {
  if (role === 'ADMIN') return <div className="grid gap-4 sm:grid-cols-3">{[
    ['Agencies', agencies.length, 'Recruitment workspaces'],
    ['Active agencies', agencies.filter((agency) => agency.status === 'ACTIVE').length, 'Currently active'],
    ['Agency users', agencies.reduce((total, agency) => total + agency.userCount, 0), 'Users across agencies'],
  ].map(([label, value, note]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div>)}</div>;

  if (role === 'INTERVIEWER') return <div className="grid gap-4 sm:grid-cols-2">{[
    ['My interviews', interviews.filter((item) => item.panelUserIds.includes('user-interviewer-1')).length, 'Assigned interviews'],
    ['Upcoming', interviews.filter((item) => item.status === 'SCHEDULED').length, 'Scheduled sessions'],
  ].map(([label, value, note]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div>)}</div>;

  if (role === 'INTERVIEWEE') return <div className="grid gap-4 sm:grid-cols-3">{[
    ['Published jobs', jobs.filter((job) => job.status === 'PUBLISHED').length, 'Available to apply'],
    ['My applications', applications.filter((item) => item.candidateId === 'candidate-1').length, 'Current applications'],
    ['My interviews', interviews.filter((item) => item.applicationId === 'app-1').length, 'Scheduled or completed'],
  ].map(([label, value, note]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div>)}</div>;

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{agencyStats.map((card) => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">{card.label}</p><p className="mt-3 text-3xl font-black text-slate-950">{card.getValue()}</p><p className="mt-2 text-xs leading-5 text-slate-400">{card.note}</p></div>)}</div>;
};

export const DashboardPage = ({ role }: DashboardPageProps) => (
  <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow="Role-aware workspace" title="Recruitment at a glance" description={role === 'ADMIN' ? 'System administration across agency workspaces.' : role === 'AGENCY' ? 'Jobs, candidates, applications, and interviews in one place.' : role === 'INTERVIEWER' ? 'Your assigned interview workload and upcoming sessions.' : 'Find jobs, manage applications, and view interviews.'} />
    <DashboardContent role={role} />
    {role === 'AGENCY' && <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-950">Recent applications</h2><div className="mt-5 divide-y divide-slate-100">{applications.map((application) => { const candidate = candidates.find((item) => item.id === application.candidateId); const job = jobs.find((item) => item.id === application.jobId); return <div key={application.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{candidate?.name ?? 'Candidate'}</p><p className="mt-1 text-xs text-slate-400">{job?.title ?? 'Job'}</p></div><StatusPill value={application.status} /></div>; })}</div></div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black text-slate-950">Published jobs</h2><div className="mt-5 space-y-3">{jobs.filter((job) => job.status === 'PUBLISHED').map((job) => <div key={job.id} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-900">{job.title}</p><p className="mt-1 text-xs text-slate-400">{job.location} · {job.openings} openings</p></div>)}</div></div>
    </div>}
  </section>
);
