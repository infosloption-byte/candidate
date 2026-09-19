import { useState } from 'react';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import type { Candidate, UserRole } from '../../domain/types';

interface CandidatesPageProps { role: UserRole; }

export const CandidatesPage = ({ role }: CandidatesPageProps) => {
  const { state, dispatch } = useRecruitment();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', profession: '', experienceYears: '0', skills: '' });
  const candidate = state.candidates.find((item) => item.id === state.users.find((user) => user.role === 'INTERVIEWEE')?.candidateId) ?? state.candidates[0];

  const createCandidate = () => {
    if (!form.name.trim()) return;
    const newCandidate: Candidate = {
      id: `candidate-${Date.now()}`,
      agencyId: 'agency-1',
      reference: `CA-${String(state.candidates.length + 1).padStart(4, '0')}`,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      profession: form.profession.trim() || null,
      experienceYears: Math.max(0, Number(form.experienceYears) || 0),
      skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      onboardingStatus: 'NOT_STARTED',
      source: 'AGENCY_ADDED',
    };
    dispatch({ type: 'CREATE_CANDIDATE', candidate: newCandidate });
    setForm({ name: '', email: '', phone: '', profession: '', experienceYears: '0', skills: '' });
    setShowForm(false);
  };

  return <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow={role === 'INTERVIEWEE' ? 'My profile' : 'Candidate onboarding'} title={role === 'INTERVIEWEE' ? 'My Profile' : 'Candidates'} description={role === 'INTERVIEWEE' ? 'The same candidate profile is used for applications.' : 'Start with a simple candidate record. Self, agency, and bulk onboarding will use this same domain model.'} action={role === 'INTERVIEWEE' ? undefined : <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white"><Icon name="plus" size={16} /> Add candidate</button><button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700">Bulk onboarding</button></div>} />
    {showForm && <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><div><label className="field-label">Full name</label><input className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><label className="field-label">Profession</label><input className="field-input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></div><div><label className="field-label">Email</label><input className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div><label className="field-label">Phone</label><input className="field-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div><label className="field-label">Experience years</label><input type="number" min="0" className="field-input" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} /></div><div><label className="field-label">Skills</label><input className="field-input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Masonry, Tile, Plaster" /></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="button" onClick={createCandidate} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Create candidate</button></div></div>}
    {role === 'INTERVIEWEE' ? <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid size-16 place-items-center rounded-2xl bg-cyan-50 text-lg font-black text-cyan-700">{candidate?.name.slice(0,2).toUpperCase()}</div><h2 className="mt-4 text-xl font-black text-slate-950">{candidate?.name}</h2><p className="mt-1 text-sm text-slate-500">{candidate?.profession ?? 'Profession not set'}</p><div className="mt-5"><StatusPill value={candidate?.onboardingStatus ?? 'NOT_STARTED'} /></div></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-sm font-black text-slate-950">Profile details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="field-label">Email</p><p className="mt-1 text-sm text-slate-700">{candidate?.email ?? '—'}</p></div><div><p className="field-label">Phone</p><p className="mt-1 text-sm text-slate-700">{candidate?.phone ?? '—'}</p></div><div><p className="field-label">Experience</p><p className="mt-1 text-sm text-slate-700">{candidate?.experienceYears ?? 0} years</p></div><div><p className="field-label">Skills</p><p className="mt-1 text-sm text-slate-700">{candidate?.skills.join(', ') || '—'}</p></div></div><button type="button" onClick={() => candidate && dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: candidate.id, status: 'SUBMITTED' })} className="mt-6 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Submit profile</button></div></div> : <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="bg-slate-50"><tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Candidate</th><th className="px-5 py-3">Profession</th><th className="px-5 py-3">Experience</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Onboarding</th></tr></thead><tbody className="divide-y divide-slate-100">{state.candidates.map((item) => <tr key={item.id} className="text-sm"><td className="px-5 py-4"><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">{item.reference} · {item.phone ?? 'No phone'}</p></td><td className="px-5 py-4 text-slate-600">{item.profession ?? '—'}</td><td className="px-5 py-4 text-slate-600">{item.experienceYears ?? 0} years</td><td className="px-5 py-4"><StatusPill value={item.source} /></td><td className="px-5 py-4"><button type="button" onClick={() => dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: item.id, status: item.onboardingStatus === 'SUBMITTED' ? 'COMPLETED' : 'SUBMITTED' })}><StatusPill value={item.onboardingStatus} /></button></td></tr>)}</tbody></table></div></div>}
  </section>;
};
