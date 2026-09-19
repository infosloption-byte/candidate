import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { DataTable } from '../../shared/components/DataTable';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, CandidateAuditEvent, CandidateHistoryInterview, CandidateStatus, CandidateStatusHistory, OnboardingStatus, UserRole } from '../../domain/types';
import { CandidateDocumentsPanel } from './CandidateDocumentsPanel';

interface Props { role: UserRole; }

const emptyForm = { name: '', email: '', phone: '', profession: '', experienceYears: '0', skills: '' };
const statusOptions: CandidateStatus[] = ['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'];

const label = (value: string): string => value.replaceAll('_', ' ');
const finalStatusOptions: CandidateStatus[] = ['PASSED', 'REJECTED', 'HIRED'];

export const CandidatesPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [candidates, setCandidates] = useState<Candidate[]>(developmentMode ? state.candidates : []);
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [agencyId, setAgencyId] = useState(user?.role === 'ADMIN' ? '' : (user?.agencyId ?? 'agency-1'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [profileForm, setProfileForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [statusDraft, setStatusDraft] = useState<CandidateStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [history, setHistory] = useState<{ statusHistory: CandidateStatusHistory[]; interviews: CandidateHistoryInterview[]; auditEvents: CandidateAuditEvent[] }>({ statusHistory: [], interviews: [], auditEvents: [] });
  const [loading, setLoading] = useState(!developmentMode);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [editingCandidateProfile, setEditingCandidateProfile] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const bulkFileRef = useRef<HTMLInputElement | null>(null);
  const candidateDetailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (developmentMode) {
      setCandidates(state.candidates);
      setAgencies(state.agencies);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<Candidate[]>('/candidates'),
      role === 'ADMIN' ? apiFetch<Agency[]>('/agencies') : Promise.resolve([] as Agency[]),
    ])
      .then(([candidateResult, agencyResult]) => {
        if (cancelled) return;
        setCandidates(candidateResult);
        if (role === 'ADMIN') {
          setAgencies(agencyResult);
        }
      })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load candidates.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [developmentMode, role, state.candidates, state.agencies, user?.id]);

  const candidate = useMemo(
    () => candidates.find((item) => item.id === (selectedCandidateId || user?.candidateId)),
    [candidates, selectedCandidateId, user?.candidateId],
  );

  useEffect(() => {
    if (!selectedCandidateId) return;
    window.requestAnimationFrame(() => {
      candidateDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [selectedCandidateId]);

  useEffect(() => {
    if (!candidate || role === 'INTERVIEWEE') return;
    setStatusDraft(candidate.status);
    setStatusReason('');
    if (developmentMode) {
      setHistory({ statusHistory: [{ id: 'history-' + candidate.id, candidateId: candidate.id, fromStatus: null, toStatus: 'POOL', reason: 'Candidate added to the candidate pool.', changedBy: null, createdAt: candidate.statusUpdatedAt }], interviews: state.interviews.filter((item) => item.candidateId === candidate.id).map((item) => ({ id: item.id, type: item.type, status: item.status, scheduledAt: item.scheduledAt, durationMins: item.durationMins, location: item.location, job: item.job ? { id: item.job.id, title: item.job.title, location: item.job.location } : null, panel: [], evaluations: item.evaluations ?? [] })), auditEvents: [] });
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    apiFetch<{ statusHistory: CandidateStatusHistory[]; interviews: CandidateHistoryInterview[]; auditEvents: CandidateAuditEvent[] }>('/candidates/' + candidate.id + '/history')
      .then((result) => { if (!cancelled) setHistory(result); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load candidate history.'); })
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [candidate?.id, developmentMode, role, state.interviews]);

  useEffect(() => {
    if (!candidate) return;
    setProfileForm({
      name: candidate.name,
      email: candidate.email ?? '',
      phone: candidate.phone ?? '',
      profession: candidate.profession ?? '',
      experienceYears: String(candidate.experienceYears ?? 0),
      skills: candidate.skills.join(', '),
    });
  }, [candidate?.id, candidate?.name, candidate?.email, candidate?.phone, candidate?.profession, candidate?.experienceYears, candidate?.skills]);

  const saveOwnProfile = async () => {
    if (!candidate) return;
    const experienceYears = Number(profileForm.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      setError('Experience years must be a whole number between 0 and 60.');
      return;
    }
    if (profileForm.name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = developmentMode
        ? { ...candidate, name: profileForm.name.trim(), email: profileForm.email.trim() || null, phone: profileForm.phone.trim() || null, profession: profileForm.profession.trim() || null, experienceYears, skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean), onboardingStatus: 'SUBMITTED' as const }
        : await apiFetch<Candidate>('/candidates/' + candidate.id, {
            method: 'PATCH',
            body: JSON.stringify({
              name: profileForm.name.trim(),
              email: profileForm.email.trim() || null,
              phone: profileForm.phone.trim() || null,
              profession: profileForm.profession.trim() || null,
              experienceYears,
              skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
              onboardingStatus: 'SUBMITTED',
            }),
          });

      if (developmentMode) dispatch({ type: 'UPDATE_CANDIDATE', candidate: updated });
      setCandidates((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSuccessTitle('Profile saved');
      setSuccess('Your candidate profile has been updated.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your candidate profile.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return candidates.filter((item) => {
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesAgency = role !== 'ADMIN' || item.agencyId === agencyId || !agencyId;
      const matchesQuery = !query || [item.name, item.reference, item.email ?? '', item.phone ?? '', item.profession ?? '', item.skills.join(' '), item.status, item.onboardingStatus].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesAgency && matchesQuery;
    });
  }, [agencyId, candidates, role, search, statusFilter]);

  const createCandidate = async () => {
    if (form.name.trim().length < 2) { setError('Candidate name must be at least 2 characters.'); return; }
    if (!developmentMode && !agencyId) { setError('Select an agency workspace.'); return; }
    setSaving(true);
    setError('');
    try {
      const draft: Candidate = {
        id: 'candidate-' + Date.now(), agencyId: agencyId || 'agency-1', reference: 'CA-' + String(candidates.length + 1).padStart(4, '0'),
        name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, profession: form.profession.trim() || null,
        experienceYears: Math.max(0, Number(form.experienceYears) || 0), skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
        onboardingStatus: 'NOT_STARTED', source: 'AGENCY_ADDED', status: 'POOL', statusUpdatedAt: new Date().toISOString(),
      };
      const created = developmentMode ? draft : await apiFetch<Candidate>('/agencies/' + agencyId + '/candidates', { method: 'POST', body: JSON.stringify({ name: draft.name, email: draft.email, phone: draft.phone, profession: draft.profession, experienceYears: draft.experienceYears, skills: draft.skills }) });
      if (developmentMode) dispatch({ type: 'CREATE_CANDIDATE', candidate: created });
      setCandidates((current) => [created, ...current]);
      setForm(emptyForm);
      setShowForm(false);
      setSuccessTitle('Candidate added');
      setSuccess('"' + created.name + '" is now in the candidate pool.');
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to create the candidate.'); }
    finally { setSaving(false); }
  };

  const downloadCsvTemplate = () => {
    const csv = 'name,email,phone,profession,experienceYears,skills\nExample Candidate,example@example.com,+94 77 000 0000,Mason,5,"Masonry,Tile,Plaster"\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'buildhire-candidate-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importCandidates = async (file: File) => {
    if (!agencyId) {
      setError('Select an agency workspace before importing candidates.');
      return;
    }
    if (file.size > 2_000_000) {
      setError('CSV must be 2 MB or smaller.');
      return;
    }

    setBulkImporting(true);
    setError('');
    setSuccess('');
    try {
      const csv = await file.text();
      if (developmentMode) {
        const lines = csv.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) throw new Error('CSV must contain a header row and at least one candidate row.');
        const header = lines[0].split(',').map((item) => item.trim().toLowerCase());
        const nameIndex = header.indexOf('name');
        if (nameIndex < 0) throw new Error('CSV must contain a name column.');
        const created: Candidate[] = lines.slice(1).map((line, index) => {
          const values = line.split(',');
          const name = values[nameIndex]?.trim() || 'Imported Candidate ' + (index + 1);
          return {
            id: 'candidate-import-' + Date.now() + '-' + index,
            agencyId,
            reference: 'CA-' + String(candidates.length + index + 1).padStart(4, '0'),
            name,
            email: null,
            phone: null,
            profession: null,
            experienceYears: 0,
            skills: [],
            onboardingStatus: 'NOT_STARTED',
            source: 'BULK_IMPORTED',
            status: 'POOL',
            statusUpdatedAt: new Date().toISOString(),
          };
        });
        created.forEach((candidate) => dispatch({ type: 'CREATE_CANDIDATE', candidate }));
        setCandidates((current) => [...created, ...current]);
        setSuccessTitle('Candidates imported');
        setSuccess(created.length + ' candidate(s) were added to the candidate pool.');
      } else {
        const result = await apiFetch<{ importedCount: number; candidates: Candidate[] }>('/agencies/' + agencyId + '/candidates/bulk', {
          method: 'POST',
          headers: { 'content-type': 'text/csv' },
          body: csv,
        });
        setCandidates((current) => [...result.candidates, ...current]);
        setSuccessTitle('Candidates imported');
        setSuccess(result.importedCount + ' candidate(s) were added to the candidate pool.');
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to import the CSV.');
    } finally {
      setBulkImporting(false);
      if (bulkFileRef.current) bulkFileRef.current.value = '';
    }
  };

  const saveManagedProfile = async () => {
    if (!candidate) return;
    const experienceYears = Number(profileForm.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      setError('Experience years must be a whole number between 0 and 60.');
      return;
    }
    if (profileForm.name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = developmentMode
        ? {
            ...candidate,
            name: profileForm.name.trim(),
            email: profileForm.email.trim() || null,
            phone: profileForm.phone.trim() || null,
            profession: profileForm.profession.trim() || null,
            experienceYears,
            skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
          }
        : await apiFetch<Candidate>('/candidates/' + candidate.id, {
            method: 'PATCH',
            body: JSON.stringify({
              name: profileForm.name.trim(),
              email: profileForm.email.trim() || null,
              phone: profileForm.phone.trim() || null,
              profession: profileForm.profession.trim() || null,
              experienceYears,
              skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
            }),
          });

      if (developmentMode) dispatch({ type: 'UPDATE_CANDIDATE', candidate: updated });
      setCandidates((items) => items.map((item) => item.id === updated.id ? updated : item));
      setEditingCandidateProfile(false);
      setSuccessTitle('Candidate profile updated');
      setSuccess('"' + updated.name + '" profile details were saved.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the candidate profile.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async () => {
    if (!candidate || !statusDraft || statusDraft === candidate.status) return;
    setSaving(true);
    setError('');
    try {
      const updated = developmentMode ? { ...candidate, status: statusDraft, statusUpdatedAt: new Date().toISOString() } : await apiFetch<Candidate>('/candidates/' + candidate.id, { method: 'PATCH', body: JSON.stringify({ status: statusDraft, statusReason: statusReason.trim() || null }) });
      if (developmentMode) dispatch({ type: 'SET_CANDIDATE_STATUS', candidateId: candidate.id, status: statusDraft });
      setCandidates((current) => current.map((item) => item.id === updated.id ? updated : item));
      setStatusDraft(updated.status);
      setStatusReason('');
      setSuccessTitle('Candidate status updated');
      setSuccess('"' + updated.name + '" is now ' + label(updated.status) + '.');
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to update candidate status.'); }
    finally { setSaving(false); }
  };

  const updateOnboarding = async (item: Candidate, next: OnboardingStatus = 'COMPLETED') => {
    try {
      const updated = developmentMode ? { ...item, onboardingStatus: next } : await apiFetch<Candidate>('/candidates/' + item.id, { method: 'PATCH', body: JSON.stringify({ onboardingStatus: next }) });
      if (developmentMode) dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: item.id, status: next });
      setCandidates((current) => current.map((candidateItem) => candidateItem.id === updated.id ? updated : candidateItem));
      setSuccessTitle('Onboarding updated');
      setSuccess('"' + item.name + '" is now ' + label(next) + '.');
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to update onboarding status.'); }
  };

  const columns = [
    { key: 'candidate', header: 'Candidate', render: (item: Candidate) => <div><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">{item.reference} · {item.profession ?? 'Profession not set'}</p></div> },
    { key: 'experience', header: 'Experience', render: (item: Candidate) => <span className="text-slate-600">{item.experienceYears ?? 0} years</span> },
    { key: 'status', header: 'Status', render: (item: Candidate) => <StatusPill value={item.status} /> },
    { key: 'onboarding', header: 'Onboarding', render: (item: Candidate) => <StatusPill value={item.onboardingStatus} /> },
    { key: 'actions', header: 'Actions', render: (item: Candidate) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => { setSelectedCandidateId(item.id); setEditingCandidateProfile(false); }}>View details</Button>{role !== 'INTERVIEWEE' && <Button size="sm" variant="secondary" onClick={() => { setSelectedCandidateId(item.id); setEditingCandidateProfile(false); }}>Review onboarding</Button>}</div> },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'ADMIN' ? 'All agency workspaces' : role === 'INTERVIEWEE' ? 'Candidate profile' : 'Candidate pool'}
        title={role === 'INTERVIEWEE' ? 'My Profile' : 'Candidates'}
        description={role === 'INTERVIEWEE' ? 'Maintain your candidate profile and documents.' : 'Candidates enter the system once and remain in the pool throughout their recruitment history. Interviews are assigned directly to candidates.'}
        action={role !== 'INTERVIEWEE' ? <Button onClick={() => { setForm(emptyForm); setShowForm((value) => !value); setError(''); }}>New candidate</Button> : undefined}
      />

      {role === 'ADMIN' && (
        <Card><FormField label="Agency workspace" hint="Admin can manage candidates on behalf of any agency."><select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}><option value="">All agencies</option>{agencies.filter((item) => item.status === 'ACTIVE').map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></FormField></Card>
      )}

      {error && <StateMessage kind="error" title="Candidate action failed" description={error} />}
      {success && <StateMessage kind="success" title={successTitle} description={success} />}
      {loading && <StateMessage kind="loading" title="Loading candidates" description="Fetching the candidate pool." />}

      {showForm && role !== 'INTERVIEWEE' && (
        <Card>
          <h2 className="text-sm font-black text-slate-950">Add candidate to pool</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField label="Full name"><input className="field-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
            <FormField label="Profession"><input className="field-input" value={form.profession} onChange={(event) => setForm({ ...form, profession: event.target.value })} /></FormField>
            <FormField label="Email"><input type="email" className="field-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></FormField>
            <FormField label="Phone"><input className="field-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></FormField>
            <FormField label="Experience years"><input type="number" min="0" className="field-input" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} /></FormField>
            {role === 'ADMIN' && <FormField label="Agency workspace"><select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}><option value="">Select an agency</option>{agencies.filter((item) => item.status === 'ACTIVE').map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></FormField>}
            <FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Masonry, Tile, Plaster" /></FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button disabled={saving || !agencyId} onClick={() => void createCandidate()}>{saving ? 'Saving…' : 'Add to pool'}</Button></div>
        </Card>
      )}

      {role === 'INTERVIEWEE' ? (
        candidate ? (
          <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
            <Card>
              <div className="grid size-16 place-items-center rounded-2xl bg-cyan-50 text-lg font-black text-cyan-700">{candidate.name.slice(0, 2).toUpperCase()}</div>
              <h2 className="mt-4 text-xl font-black text-slate-950">{candidate.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{candidate.profession ?? 'Profession not set'}</p>
              <div className="mt-5 flex flex-wrap gap-2"><StatusPill value={candidate.status} /><StatusPill value={candidate.onboardingStatus} /></div>
              <p className="mt-4 text-xs text-slate-500">Reference <span className="font-bold text-slate-800">{candidate.reference}</span></p>
            </Card>
            <Card>
              <h2 className="text-sm font-black text-slate-950">Profile details</h2>
              <p className="mt-1 text-xs text-slate-400">Keep your contact, profession, experience, and skills up to date.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField label="Full name"><input className="field-input" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} autoComplete="name" /></FormField>
                <FormField label="Email"><input type="email" className="field-input" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} autoComplete="email" /></FormField>
                <FormField label="Phone"><input className="field-input" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} autoComplete="tel" /></FormField>
                <FormField label="Profession"><input className="field-input" value={profileForm.profession} onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })} placeholder="Mason, Welder…" /></FormField>
                <FormField label="Experience years"><input type="number" min="0" max="60" className="field-input" value={profileForm.experienceYears} onChange={(event) => setProfileForm({ ...profileForm, experienceYears: event.target.value })} /></FormField>
                <FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={profileForm.skills} onChange={(event) => setProfileForm({ ...profileForm, skills: event.target.value })} /></FormField>
              </div>
              <div className="mt-5 flex justify-end"><Button disabled={saving} onClick={() => void saveOwnProfile()}>{saving ? 'Saving…' : 'Save profile'}</Button></div>
              <div className="mt-6 border-t border-slate-100 pt-6"><CandidateDocumentsPanel candidateId={candidate.id} apiEnabled={!developmentMode} /></div>
            </Card>
          </div>
        ) : <StateMessage kind="empty" title="Profile not linked" description="This account is not linked to a candidate profile yet." />
      ) : (
        <>
          <Card>
            <div className="grid gap-3 md:grid-cols-[1.5fr_.7fr]">
              <FormField label="Candidate search"><input className="field-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, reference, profession, phone…" /></FormField>
              <FormField label="Status"><select className="field-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></FormField>
            </div>
            <p className="mt-3 text-xs text-slate-400">{filteredCandidates.length} candidate(s) in this view.</p>
          </Card>
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-950">Bulk candidate onboarding</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">Import up to 500 candidates at once. Every imported candidate starts in the candidate pool and can later be assigned directly to an interview.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={downloadCsvTemplate}>CSV template</Button>
                <input
                  ref={bulkFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importCandidates(file);
                  }}
                />
                <Button size="sm" disabled={bulkImporting || !agencyId} onClick={() => bulkFileRef.current?.click()}>
                  {bulkImporting ? 'Importing…' : 'Import CSV'}
                </Button>
              </div>
            </div>
            {role === 'ADMIN' && !agencyId && <p className="mt-3 text-xs font-semibold text-amber-600">Select an agency workspace above before importing.</p>}
          </Card>

          {!loading && <DataTable columns={columns} rows={filteredCandidates} getRowKey={(item) => item.id} emptyMessage="No candidates match the current filters." />}

          {candidate && selectedCandidateId && (
            <div ref={candidateDetailsRef}>
            <Card>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Candidate profile</p><h2 className="mt-1 text-xl font-black text-slate-950">{candidate.name}</h2><p className="mt-1 text-xs text-slate-500">{candidate.reference} · {candidate.profession ?? 'Profession not set'} · {candidate.experienceYears ?? 0} years</p></div>
                <div className="flex flex-wrap items-center gap-2"><StatusPill value={candidate.status} /><Button size="sm" variant="secondary" onClick={() => { setEditingCandidateProfile((value) => !value); setError(''); }}>{editingCandidateProfile ? 'Close edit' : 'Edit profile'}</Button><Button size="sm" variant="secondary" onClick={() => { setSelectedCandidateId(''); setEditingCandidateProfile(false); }}>Close</Button></div>
              </div>

              {editingCandidateProfile ? (
                <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4">
                  <h3 className="text-sm font-black text-slate-950">Edit candidate profile</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormField label="Full name"><input className="field-input" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></FormField>
                    <FormField label="Email"><input type="email" className="field-input" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></FormField>
                    <FormField label="Phone"><input className="field-input" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></FormField>
                    <FormField label="Profession"><input className="field-input" value={profileForm.profession} onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })} /></FormField>
                    <FormField label="Experience years"><input type="number" min="0" max="60" className="field-input" value={profileForm.experienceYears} onChange={(event) => setProfileForm({ ...profileForm, experienceYears: event.target.value })} /></FormField>
                    <FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={profileForm.skills} onChange={(event) => setProfileForm({ ...profileForm, skills: event.target.value })} /></FormField>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setEditingCandidateProfile(false)}>Cancel</Button>
                    <Button disabled={saving} onClick={() => void saveManagedProfile()}>{saving ? 'Saving…' : 'Save profile'}</Button>
                  </div>
                </div>
              ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact</p><p className="mt-2 text-sm font-bold text-slate-800">{candidate.email ?? 'No email'}</p><p className="mt-1 text-xs text-slate-500">{candidate.phone ?? 'No phone'}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skills</p><p className="mt-2 text-xs leading-5 text-slate-600">{candidate.skills.length ? candidate.skills.join(' · ') : 'No skills recorded'}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Onboarding</p><div className="mt-2 flex flex-wrap items-center gap-2"><StatusPill value={candidate.onboardingStatus} />{candidate.onboardingStatus !== 'COMPLETED' && <Button size="sm" variant="secondary" disabled={saving} onClick={() => void updateOnboarding(candidate, 'COMPLETED')}>Mark complete</Button>}</div></div>
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-black text-slate-900">Onboarding review</p><p className="mt-1 text-[11px] text-slate-500">Review the candidate profile before completing onboarding.</p></div>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500"><span className="rounded-full bg-white px-3 py-1.5">Profile {candidate.name && candidate.profession ? 'complete' : 'needs review'}</span><span className="rounded-full bg-white px-3 py-1.5">Contact {candidate.email || candidate.phone ? 'available' : 'missing'}</span><span className="rounded-full bg-white px-3 py-1.5">Skills {candidate.skills.length ? candidate.skills.length + ' recorded' : 'missing'}</span></div>
                </div>
              </div>
              )}

              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div><h3 className="text-sm font-black text-slate-950">Lifecycle status</h3><p className="mt-1 text-xs text-slate-400">Every status change is recorded in the candidate history.</p></div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div><p className="field-label">Status</p><select className="field-input sm:min-w-48" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as CandidateStatus)}>{statusOptions.filter((status) => {
                      const hasCompletedInterview = history.interviews.some((interview) => interview.status === 'COMPLETED');
                      return !finalStatusOptions.includes(status) || hasCompletedInterview || status === candidate.status;
                    }).map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>
                    <div><p className="field-label">Reason</p><input className="field-input sm:min-w-64" value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Optional decision note" /></div>
                    <Button disabled={saving || !statusDraft || statusDraft === candidate.status} onClick={() => void updateStatus()}>Save status</Button>
                  </div>
                </div>
              </div>

              {loadingHistory ? <div className="mt-5"><StateMessage kind="loading" title="Loading candidate history" /></div> : (
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Status history</h3>
                    <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                      {history.statusHistory.length ? history.statusHistory.map((item) => (
                        <div key={item.id} className="p-4">
                          <div className="flex items-center justify-between gap-3"><StatusPill value={item.toStatus} /><span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span></div>
                          <p className="mt-2 text-xs text-slate-500">{item.reason ?? 'Status updated.'}</p>
                          {item.changedBy && <p className="mt-1 text-[10px] text-slate-400">By {item.changedBy.name}</p>}
                        </div>
                      )) : <p className="p-5 text-xs text-slate-400">No status history recorded.</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Interview history</h3>
                    <div className="mt-3 space-y-3">
                      {history.interviews.length ? history.interviews.map((item) => {
                        const total = item.evaluations.reduce((sum, evaluation) => sum + evaluation.scores.reduce((scoreTotal, score) => scoreTotal + score.points, 0), 0);
                        const max = item.evaluations.reduce((sum, evaluation) => sum + evaluation.scores.reduce((scoreTotal, score) => scoreTotal + (score.criterion?.maxPoints ?? 0), 0), 0);
                        return <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-900">{label(item.type)} interview</p><StatusPill value={item.status} /></div>
                          <p className="mt-1 text-xs text-slate-500">{new Date(item.scheduledAt).toLocaleString()} · {item.durationMins} min</p>
                          <p className="mt-1 text-xs text-slate-400">{item.job?.title ?? 'General interview'} · {item.location ?? 'Location not specified'}</p>
                          {item.evaluations.length > 0 && (
                            <>
                              <p className="mt-3 text-xs font-bold text-cyan-700">Panel score: {total} / {max} ({max ? Math.round((total / max) * 100) : 0}%)</p>
                              <div className="mt-3 space-y-2">
                                {item.evaluations.map((evaluation) => evaluation.scores.map((score) => (
                                  <div key={evaluation.id + '-' + score.criterionId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                    <span className="text-[11px] font-semibold text-slate-600">{score.criterion?.name ?? 'Criterion'}</span>
                                    <span className="text-xs font-black text-slate-900">{score.points} / {score.criterion?.maxPoints ?? 0}</span>
                                  </div>
                                )))}
                              </div>
                            </>
                          )}
                        </div>;
                      }) : <p className="rounded-2xl border border-dashed border-slate-200 p-5 text-xs text-slate-400">No interview history yet.</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <h3 className="text-sm font-black text-slate-950">Activity history</h3>
                <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  {history.auditEvents.length ? history.auditEvents.map((event) => (
                    <div key={event.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{event.summary}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{event.actor?.name ?? 'System'} · {label(event.action)}</p>
                      </div>
                      <p className="shrink-0 text-[10px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  )) : <p className="p-5 text-xs text-slate-400">No candidate activity recorded yet.</p>}
                </div>
              </div>

              <div className="mt-5"><CandidateDocumentsPanel candidateId={candidate.id} apiEnabled={!developmentMode} /></div>
            </Card>
            </div>
          )}
        </>
      )}
    </section>
  );
};
