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
  const [search, setSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');

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

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return candidates;

    return candidates.filter((item) => [
      item.name,
      item.reference,
      item.email ?? '',
      item.phone ?? '',
      item.profession ?? '',
      item.skills.join(' '),
      item.onboardingStatus,
      item.source,
    ].some((value) => value.toLowerCase().includes(query)));
  }, [candidates, search]);

  const selectedCandidate = selectedCandidateId
    ? candidates.find((item) => item.id === selectedCandidateId)
    : undefined;

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
      render: (item: Candidate) => <StatusPill value={item.onboardingStatus} />,
    },
    {
      key: 'actions',
      header: 'Review',
      render: (item: Candidate) => (
        <Button
          variant="secondary"
          className="px-3 py-1.5"
          onClick={() => setSelectedCandidateId(item.id)}
        >
          Review
        </Button>
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

      {role !== 'INTERVIEWEE' && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="field-label">Candidate search</p>
              <p className="mt-1 text-xs text-slate-400">Search name, reference, contact, profession, skills, source, or onboarding status.</p>
            </div>
            <input
              className="field-input w-full sm:max-w-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidates…"
              aria-label="Search candidates"
            />
          </div>
          {search && (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Showing {filteredCandidates.length} of {candidates.length} candidates.
            </p>
          )}
        </Card>
      )}

      {selectedCandidate && role !== 'INTERVIEWEE' && (
        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Candidate review</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">{selectedCandidate.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedCandidate.reference} · {selectedCandidate.profession ?? 'Profession not set'}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill value={selectedCandidate.onboardingStatus} />
              <Button variant="secondary" onClick={() => setSelectedCandidateId('')}>Close</Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="field-label">Email</p><p className="mt-1 text-sm text-slate-700">{selectedCandidate.email ?? '—'}</p></div>
            <div><p className="field-label">Phone</p><p className="mt-1 text-sm text-slate-700">{selectedCandidate.phone ?? '—'}</p></div>
            <div><p className="field-label">Experience</p><p className="mt-1 text-sm text-slate-700">{selectedCandidate.experienceYears ?? 0} years</p></div>
            <div><p className="field-label">Source</p><p className="mt-1 text-sm text-slate-700">{selectedCandidate.source.replace('_', ' ').toLowerCase()}</p></div>
          </div>

          <div className="mt-5">
            <p className="field-label">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedCandidate.skills.length === 0
                ? <span className="text-sm text-slate-400">No skills listed.</span>
                : selectedCandidate.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{skill}</span>
                ))}
            </div>
          </div>

          {selectedCandidate.onboardingStatus === 'SUBMITTED' && (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4">
              <div>
                <p className="text-sm font-bold text-amber-950">Profile submitted for review</p>
                <p className="mt-1 text-xs text-amber-800">Review the candidate details above, then mark the onboarding as completed.</p>
              </div>
              <Button onClick={() => void updateOnboarding(selectedCandidate)}>Mark completed</Button>
            </div>
          )}

          {selectedCandidate.onboardingStatus === 'COMPLETED' && (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4">
              <div>
                <p className="text-sm font-bold text-emerald-950">Profile review completed</p>
                <p className="mt-1 text-xs text-emerald-800">The candidate profile is ready for the recruitment workflow.</p>
              </div>
              <Button variant="secondary" onClick={() => void updateOnboarding(selectedCandidate)}>Reopen review</Button>
            </div>
          )}
        </Card>
      )}

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
            rows={filteredCandidates}
            getRowKey={(item) => item.id}
            emptyMessage="No candidates have been onboarded yet."
          />
        )
      )}
    </section>
  );
};
