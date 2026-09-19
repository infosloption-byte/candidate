import { useState } from 'react';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { DataTable } from '../../shared/components/DataTable';
import { StateMessage } from '../../shared/components/StateMessage';
import type { Candidate, UserRole } from '../../domain/types';

interface CandidatesPageProps { role: UserRole; }

export const CandidatesPage = ({ role }: CandidatesPageProps) => {
  const { state, dispatch } = useRecruitment();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', profession: '', experienceYears: '0', skills: '' });
  const candidate = state.candidates.find((item) => item.id === state.users.find((user) => user.role === 'INTERVIEWEE')?.candidateId) ?? state.candidates[0];

  const createCandidate = () => {
    if (!form.name.trim()) {
      setError('Full name is required.');
      setSuccess('');
      return;
    }

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
    setError('');
    setSuccess(`Candidate "${newCandidate.name}" was added.`);
  };

  const columns = [
    { key: 'candidate', header: 'Candidate', render: (item: Candidate) => <><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">{item.reference} · {item.phone ?? 'No phone'}</p></> },
    { key: 'profession', header: 'Profession', render: (item: Candidate) => <span className="text-slate-600">{item.profession ?? '—'}</span> },
    { key: 'experience', header: 'Experience', render: (item: Candidate) => <span className="text-slate-600">{item.experienceYears ?? 0} years</span> },
    { key: 'source', header: 'Source', render: (item: Candidate) => <StatusPill value={item.source} /> },
    { key: 'onboarding', header: 'Onboarding', render: (item: Candidate) => <button type="button" onClick={() => dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: item.id, status: item.onboardingStatus === 'SUBMITTED' ? 'COMPLETED' : 'SUBMITTED' })}><StatusPill value={item.onboardingStatus} /></button> },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'INTERVIEWEE' ? 'My profile' : 'Candidate onboarding'}
        title={role === 'INTERVIEWEE' ? 'My Profile' : 'Candidates'}
        description={role === 'INTERVIEWEE' ? 'The same candidate profile is used for applications.' : 'Start with one candidate model for agency, self, and bulk onboarding.'}
        action={role === 'INTERVIEWEE' ? undefined : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setShowForm((value) => !value); setError(''); }}>
              <Icon name="plus" size={16} /> Add candidate
            </Button>
            <Button variant="secondary">Bulk onboarding</Button>
          </div>
        )}
      />

      {success && <StateMessage kind="success" title="Saved" description={success} />}

      {showForm && (
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Full name" error={error}><input className="field-input" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }} /></FormField>
            <FormField label="Profession"><input className="field-input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></FormField>
            <FormField label="Email"><input type="email" className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
            <FormField label="Phone"><input className="field-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
            <FormField label="Experience years"><input type="number" min="0" className="field-input" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} /></FormField>
            <FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Masonry, Tile, Plaster" /></FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={createCandidate}>Create candidate</Button></div>
        </Card>
      )}

      {role === 'INTERVIEWEE' ? (
        candidate ? (
          <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
            <Card>
              <div className="grid size-16 place-items-center rounded-2xl bg-cyan-50 text-lg font-black text-cyan-700">{candidate.name.slice(0, 2).toUpperCase()}</div>
              <h2 className="mt-4 text-xl font-black text-slate-950">{candidate.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{candidate.profession ?? 'Profession not set'}</p>
              <div className="mt-5"><StatusPill value={candidate.onboardingStatus} /></div>
            </Card>
            <Card>
              <h2 className="text-sm font-black text-slate-950">Profile details</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><p className="field-label">Email</p><p className="mt-1 text-sm text-slate-700">{candidate.email ?? '—'}</p></div>
                <div><p className="field-label">Phone</p><p className="mt-1 text-sm text-slate-700">{candidate.phone ?? '—'}</p></div>
                <div><p className="field-label">Experience</p><p className="mt-1 text-sm text-slate-700">{candidate.experienceYears ?? 0} years</p></div>
                <div><p className="field-label">Skills</p><p className="mt-1 text-sm text-slate-700">{candidate.skills.join(', ') || '—'}</p></div>
              </div>
              <Button className="mt-6" onClick={() => dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: candidate.id, status: 'SUBMITTED' })}>Submit profile</Button>
            </Card>
          </div>
        ) : (
          <StateMessage kind="empty" title="Profile not linked" description="This development session does not have an interviewee candidate linked yet." />
        )
      ) : (
        <DataTable columns={columns} rows={state.candidates} getRowKey={(item) => item.id} emptyMessage="No candidates have been onboarded yet." />
      )}
    </section>
  );
};
