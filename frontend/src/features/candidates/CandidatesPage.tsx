import { candidates } from '../../domain/fixtures';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import type { UserRole } from '../../domain/types';

interface CandidatesPageProps { role: UserRole; }

export const CandidatesPage = ({ role }: CandidatesPageProps) => {
  const candidate = candidates[0];
  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading eyebrow={role === 'INTERVIEWEE' ? 'My profile' : 'Candidate onboarding'} title={role === 'INTERVIEWEE' ? 'My Profile' : 'Candidates'} description={role === 'INTERVIEWEE' ? 'Keep the profile used for your applications up to date.' : 'Candidates can enter through self-onboarding, agency onboarding, or bulk onboarding.'} action={role === 'INTERVIEWEE' ? undefined : <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="plus" size={16} /> Add candidate</button>} />
      {role === 'INTERVIEWEE' ? <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid size-16 place-items-center rounded-2xl bg-cyan-50 text-lg font-black text-cyan-700">{candidate.name.slice(0,2).toUpperCase()}</div><h2 className="mt-4 text-xl font-black text-slate-950">{candidate.name}</h2><p className="mt-1 text-sm text-slate-500">{candidate.profession}</p><div className="mt-5"><StatusPill value={candidate.onboardingStatus} /></div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-black text-slate-950">Profile details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="field-label">Email</p><p className="mt-1 text-sm text-slate-700">{candidate.email}</p></div><div><p className="field-label">Phone</p><p className="mt-1 text-sm text-slate-700">{candidate.phone}</p></div><div><p className="field-label">Experience</p><p className="mt-1 text-sm text-slate-700">{candidate.experienceYears} years</p></div><div><p className="field-label">Skills</p><p className="mt-1 text-sm text-slate-700">{candidate.skills.join(', ')}</p></div></div><button type="button" className="mt-6 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit profile</button></div>
      </div> : <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="bg-slate-50"><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">Profession</th><th className="px-5 py-3">Experience</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Onboarding</th></tr></thead><tbody className="divide-y divide-slate-100">{candidates.map((item) => <tr key={item.id} className="text-sm"><td className="px-5 py-4"><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">{item.reference} · {item.phone ?? 'No phone'}</p></td><td className="px-5 py-4 text-slate-600">{item.profession ?? '—'}</td><td className="px-5 py-4 text-slate-600">{item.experienceYears ?? 0} years</td><td className="px-5 py-4"><StatusPill value={item.source} /></td><td className="px-5 py-4"><StatusPill value={item.onboardingStatus} /></td></tr>)}</tbody></table></div></div>}
    </section>
  );
};
