import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon } from '../../shared/components/Icon';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { DataTable } from '../../shared/components/DataTable';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Candidate, UserRole } from '../../domain/types';

interface CandidatesPageProps { role: UserRole; }

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  profession: '',
  experienceYears: '0',
  skills: '',
};

export const CandidatesPage = ({ role }: CandidatesPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [candidates, setCandidates] = useState<Candidate[]>(developmentMode ? state.candidates : []);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (developmentMode) {
      setCandidates(state.candidates);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    apiFetch<Candidate[]>('/candidates')
      .then((result) => {
        if (!cancelled) setCandidates(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load candidates.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, state.candidates, user?.id]);

  const candidate = useMemo(
    () => candidates.find((item) => item.id === user?.candidateId) ?? (role === 'INTERVIEWEE' ? candidates[0] : undefined),
    [candidates, role, user?.candidateId],
  );

  const createCandidate = async () => {
    if (!form.name.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!developmentMode && !user?.agencyId) {
      setError('Your account is not linked to an agency.');
      return;
    }

    setSaving(true);
    setError('');

    const draft: Candidate = {
      id: 'candidate-' + Date.now(),
      agencyId: user?.agencyId ?? 'agency-1',
      reference: 'CA-' + String(candidates.length + 1).padStart(4, '0'),
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      profession: form.profession.trim() || null,
      experienceYears: Math.max(0, Number(form.experienceYears) || 0),
      skills: form.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      onboardingStatus: 'NOT_STARTED',
      source: 'AGENCY_ADDED',
    };

    try {
      const created = developmentMode
        ? draft
        : await apiFetch<Candidate>('/agencies/' + user!.agencyId + '/candidates', {
            method: 'POST',
            body: JSON.stringify({
              name: draft.name,
              email: draft.email,
              phone: draft.phone,
              profession: draft.profession,
              experienceYears: draft.experienceYears,
              skills: draft.skills,
            }),
          });

      if (developmentMode) {
        dispatch({ type: 'CREATE_CANDIDATE', candidate: draft });
      } else {
        setCandidates((current) => [created, ...current]);
      }

      setForm(emptyForm);
      setShowForm(false);
      setSuccess('Candidate "' + created.name + '" was added.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the candidate.');
    } finally {
      setSaving(false);
    }
  };

  const updateOnboarding = async (candidateToUpdate: Candidate) => {
    const nextStatus = candidateToUpdate.onboardingStatus === 'SUBMITTED' ? 'COMPLETED' : 'SUBMITTED';

    try {
      setError('');

      const updated = developmentMode
        ? { ...candidateToUpdate, onboardingStatus: nextStatus }
        : await apiFetch<Candidate>('/candidates/' + candidateToUpdate.id, {
            method: 'PATCH',
            body: JSON.stringify({ onboardingStatus: nextStatus }),
          });

      if (developmentMode) {
        dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: candidateToUpdate.id, status: nextStatus });
      } else {
        setCandidates((current) => current.map((item) => item.id === updated.id ? updated : item));
      }

      setSuccess('Candidate "' + candidateToUpdate.name + '" is now ' + nextStatus.toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update onboarding status.');
    }
  };

  const submitOwnProfile = async () => {
    if (!candidate) return;

    try {
      setError('');

      const updated = developmentMode
        ? { ...candidate, onboardingStatus: 'SUBMITTED' as const }
        : await apiFetch<Candidate>('/candidates/' + candidate.id, {
            method: 'PATCH',
            body: JSON.stringify({
              onboardingStatus: 'SUBMITTED',
              name: candidate.name,
              email: candidate.email,
              phone: candidate.phone,
              profession: candidate.profession,
              experienceYears: candidate.experienceYears,
              skills: candidate.skills,
            }),
          });

      if (developmentMode) {
        dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: candidate.id, status: 'SUBMITTED' });
      } else {
        setCandidates((current) => current.map((item) => item.id === updated.id ? updated : item));
      }

      setSuccess('Your profile has been submitted.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit your profile.');
    }
  };

  const columns = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (item: Candidate) => (
        <>
          <p className="font-bold text-slate-900">{item.name}</p>
          <p className="mt-1 text-[11px] text-slate-400">{item.reference} · {item.phone ?? 'No phone'}</p>
        </>
      ),
    },
    {
      key: 'profession',
      header: 'Profession',
      render: (item: Candidate) => <span className="text-slate-600">{item.profession ?? '—'}</span>,
    },
    {
      key: 'experience',
      header: 'Experience',
      render: (item: Candidate) => <span className="text-slate-600">{item.experienceYears ?? 0} years</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (item: Candidate) => <StatusPill value={item.source} />,
    },
    {
      key: 'onboarding',
      header: 'Onboarding',
      render: (item: Candidate) => (
        <button type="button" onClick={() => void updateOnboarding(item)}>
          <StatusPill value={item.onboardingStatus} />
        </button>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'INTERVIEWEE' ? 'My profile' : 'Candidate onboarding'}
        title={role === 'INTERVIEWEE' ? 'My Profile' : 'Candidates'}
        description={role === 'INTERVIEWEE' ? 'The same candidate profile is used for your applications.' : 'Start with one candidate model for agency, self, and bulk onboarding.'}
        action={role === 'INTERVIEWEE' ? undefined : (
          <Button onClick={() => { setShowForm((value) => !value); setError(''); }}>
            <Icon name="plus" size={16} /> Add candidate
          </Button>
        )}
      />

      {loading && <StateMessage kind="loading" title="Loading candidates" description="Fetching the latest candidate records." />}
      {error && <StateMessage kind="error" title="Candidate action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      {showForm && (
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Full name">
              <input className="field-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </FormField>
            <FormField label="Profession">
              <input className="field-input" value={form.profession} onChange={(event) => setForm({ ...form, profession: event.target.value })} />
            </FormField>
            <FormField label="Email">
              <input type="email" className="field-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </FormField>
            <FormField label="Phone">
              <input className="field-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </FormField>
            <FormField label="Experience years">
              <input type="number" min="0" className="field-input" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} />
            </FormField>
            <FormField label="Skills" hint="Separate skills with commas.">
              <input className="field-input" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Masonry, Tile, Plaster" />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => void createCandidate()}>{saving ? 'Saving…' : 'Create candidate'}</Button>
          </div>
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
              <Button className="mt-6" onClick={() => void submitOwnProfile()}>Submit profile</Button>
            </Card>
          </div>
        ) : (
          <StateMessage kind="empty" title="Profile not linked" description="This account is not linked to a candidate record yet. Complete account linkage from the agency onboarding flow." />
        )
      ) : (
        !loading && (
          <DataTable
            columns={columns}
            rows={candidates}
            getRowKey={(item) => item.id}
            emptyMessage="No candidates have been onboarded yet."
          />
        )
      )}
    </section>
  );
};
