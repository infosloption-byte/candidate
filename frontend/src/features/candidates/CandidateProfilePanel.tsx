import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Candidate, CandidateAuditEvent, CandidateHistoryInterview, CandidateStatus, CandidateStatusHistory, OnboardingStatus, UserRole } from '../../domain/types';
import { apiFetch } from '../../shared/lib/api';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { CandidateDocumentsPanel } from './CandidateDocumentsPanel';

export type CandidateProfileData = Pick<Candidate, 'id' | 'agencyId' | 'reference' | 'name' | 'email' | 'phone' | 'alternatePhone' | 'country' | 'passportNumber' | 'passportExpiry' | 'currentLocation' | 'availability' | 'visaStatus' | 'profession' | 'experienceYears' | 'skills' | 'onboardingStatus' | 'source' | 'status' | 'statusUpdatedAt' | 'createdAt' | 'updatedAt'>;

export interface CandidateProfileHistory {
  profile?: {
    agency: { id: string; name: string; slug: string; status: 'ACTIVE' | 'INACTIVE' } | null;
    account: { id: string; name: string; email: string; role: UserRole; active: boolean; createdAt: string; updatedAt: string } | null;
    createdAt: string;
    updatedAt: string;
  };
  statusHistory: CandidateStatusHistory[];
  interviews: CandidateHistoryInterview[];
  auditEvents: CandidateAuditEvent[];
}

interface Props {
  candidate: CandidateProfileData | null;
  role: UserRole;
  apiEnabled: boolean;
  initialHistory?: CandidateProfileHistory;
  initialHistoryLoading?: boolean;
  minimized: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onCandidateUpdated?: (candidate: CandidateProfileData) => void;
}

type ProfileTab = 'overview' | 'interviews' | 'timeline' | 'documents';

const value = (item: string | number | null | undefined, fallback = 'Not provided') =>
  item === null || item === undefined || item === '' ? fallback : String(item);

const label = (item: string) => item.replaceAll('_', ' ');

const formatDate = (item: string | null | undefined) =>
  item ? new Date(item).toLocaleString() : 'Not available';

const Field = ({ label: fieldLabel, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{fieldLabel}</p>
    <div className="mt-2 break-words text-sm font-semibold text-slate-900">{children}</div>
  </div>
);

const interviewScore = (interview: CandidateHistoryInterview) => {
  const submitted = interview.evaluations.filter((evaluation) => evaluation.status === 'SUBMITTED');
  const totals = submitted.map((evaluation) => ({
    evaluation,
    total: evaluation.scores.reduce((sum, score) => sum + score.points, 0),
    max: evaluation.scores.reduce((sum, score) => sum + (score.criterion?.maxPoints ?? 0), 0),
  }));
  const max = totals.length ? Math.max(...totals.map((item) => item.max)) : 0;
  const averagePercentage = totals.length
    ? Math.round((totals.reduce((sum, item) => sum + (item.max ? (item.total / item.max) * 100 : 0), 0) / totals.length) * 100) / 100
    : null;
  return { submitted, totals, max, averagePercentage };
};

export const CandidateProfilePanel = ({
  candidate,
  role,
  apiEnabled,
  initialHistory,
  initialHistoryLoading = false,
  minimized,
  maximized,
  onMinimize,
  onRestore,
  onMaximize,
  onClose,
  onCandidateUpdated,
}: Props) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [history, setHistory] = useState<CandidateProfileHistory>(initialHistory ?? { statusHistory: [], interviews: [], auditEvents: [] });
  const [loading, setLoading] = useState(Boolean(candidate && apiEnabled && (!initialHistory || initialHistoryLoading)));
  const [error, setError] = useState('');
  const [candidateOverride, setCandidateOverride] = useState<CandidateProfileData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    country: '',
    passportNumber: '',
    passportExpiry: '',
    currentLocation: '',
    availability: '',
    visaStatus: '',
    profession: '',
    experienceYears: '0',
    skills: '',
  });
  const [statusDraft, setStatusDraft] = useState<CandidateStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    setActiveTab('overview');
    setError('');
    setHistory(initialHistory ?? { statusHistory: [], interviews: [], auditEvents: [] });
    setCandidateOverride(null);
    setEditingProfile(false);
    setStatusReason('');
    setLoading(Boolean(candidate && apiEnabled && (!initialHistory || initialHistoryLoading)));
  }, [apiEnabled, candidate?.id, initialHistory, initialHistoryLoading]);

  useEffect(() => {
    if (!candidate) return;
    setProfileForm({
      name: candidate.name,
      email: candidate.email ?? '',
      phone: candidate.phone ?? '',
      alternatePhone: candidate.alternatePhone ?? '',
      country: candidate.country ?? '',
      passportNumber: candidate.passportNumber ?? '',
      passportExpiry: candidate.passportExpiry ? candidate.passportExpiry.slice(0, 10) : '',
      currentLocation: candidate.currentLocation ?? '',
      availability: candidate.availability ?? '',
      visaStatus: candidate.visaStatus ?? '',
      profession: candidate.profession ?? '',
      experienceYears: String(candidate.experienceYears ?? 0),
      skills: candidate.skills.join(', '),
    });
    setStatusDraft(candidate.status);
  }, [candidate?.id]);

  useEffect(() => {
    if (!candidate || !apiEnabled || initialHistoryLoading || initialHistory) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch<CandidateProfileHistory>('/candidates/' + candidate.id + '/history')
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load candidate history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiEnabled, candidate?.id, initialHistory, initialHistoryLoading]);

  const currentCandidate = candidateOverride ?? candidate;

  const refreshHistory = async () => {
    if (!currentCandidate || !apiEnabled) return;
    try {
      const result = await apiFetch<CandidateProfileHistory>('/candidates/' + currentCandidate.id + '/history');
      setHistory(result);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to refresh candidate history.');
    }
  };

  const saveProfile = async () => {
    if (!currentCandidate || (role !== 'ADMIN' && role !== 'AGENCY')) return;
    const experienceYears = Number(profileForm.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      setError('Experience years must be a whole number between 0 and 60.');
      return;
    }
    if (profileForm.name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    setSavingProfile(true);
    setError('');
    try {
      const updated = apiEnabled
        ? await apiFetch<CandidateProfileData>('/candidates/' + currentCandidate.id, {
            method: 'PATCH',
            body: JSON.stringify({
              name: profileForm.name.trim(),
              email: profileForm.email.trim() || null,
              phone: profileForm.phone.trim() || null,
              alternatePhone: profileForm.alternatePhone.trim() || null,
              country: profileForm.country.trim() || null,
              passportNumber: profileForm.passportNumber.trim() || null,
              passportExpiry: profileForm.passportExpiry.trim() || null,
              currentLocation: profileForm.currentLocation.trim() || null,
              availability: profileForm.availability.trim() || null,
              visaStatus: profileForm.visaStatus.trim() || null,
              profession: profileForm.profession.trim() || null,
              experienceYears,
              skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
            }),
          })
        : {
            ...currentCandidate,
            name: profileForm.name.trim(),
            email: profileForm.email.trim() || null,
            phone: profileForm.phone.trim() || null,
            alternatePhone: profileForm.alternatePhone.trim() || null,
            country: profileForm.country.trim() || null,
            passportNumber: profileForm.passportNumber.trim() || null,
            passportExpiry: profileForm.passportExpiry.trim() || null,
            currentLocation: profileForm.currentLocation.trim() || null,
            availability: profileForm.availability.trim() || null,
            visaStatus: profileForm.visaStatus.trim() || null,
            profession: profileForm.profession.trim() || null,
            experienceYears,
            skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
          };
      setCandidateOverride(updated);
      setEditingProfile(false);
      onCandidateUpdated?.(updated);
      await refreshHistory();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the candidate profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const updateOnboarding = async () => {
    if (!currentCandidate || (role !== 'ADMIN' && role !== 'AGENCY') || currentCandidate.onboardingStatus === 'COMPLETED') return;
    setSavingOnboarding(true);
    setError('');
    try {
      const updated = apiEnabled
        ? await apiFetch<CandidateProfileData>('/candidates/' + currentCandidate.id, {
            method: 'PATCH',
            body: JSON.stringify({ onboardingStatus: 'COMPLETED' as OnboardingStatus }),
          })
        : { ...currentCandidate, onboardingStatus: 'COMPLETED' as const };
      setCandidateOverride(updated);
      onCandidateUpdated?.(updated);
      await refreshHistory();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update onboarding status.');
    } finally {
      setSavingOnboarding(false);
    }
  };

  const updateStatus = async () => {
    if (!currentCandidate || !statusDraft || statusDraft === currentCandidate.status) return;
    const canManageAllStatuses = role === 'ADMIN' || role === 'AGENCY';
    const allowedForInterviewer: CandidateStatus[] = ['PASSED', 'REJECTED', 'HIRED'];
    if (!canManageAllStatuses && role !== 'INTERVIEWER') return;
    if (!canManageAllStatuses && !allowedForInterviewer.includes(statusDraft)) {
      setError('Interviewers may only record a final candidate decision.');
      return;
    }

    setSavingProfile(true);
    setError('');
    try {
      const updated = apiEnabled
        ? await apiFetch<CandidateProfileData>('/candidates/' + currentCandidate.id, {
            method: 'PATCH',
            body: JSON.stringify({ status: statusDraft, statusReason: statusReason.trim() || null }),
          })
        : { ...currentCandidate, status: statusDraft, statusUpdatedAt: new Date().toISOString() };
      setCandidateOverride(updated);
      setStatusDraft(updated.status);
      setStatusReason('');
      onCandidateUpdated?.(updated);
      await refreshHistory();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update candidate status.');
    } finally {
      setSavingProfile(false);
    }
  };

  const timeline = useMemo(() => {
    if (!candidate) return [];
    const auditFor = (entityType: string, entityId: string, action: string) =>
      history.auditEvents.some((event) => event.entityType === entityType && event.entityId === entityId && event.action === action);

    const items = [
      ...history.statusHistory.map((item) => ({
        id: 'status-' + item.id,
        date: item.createdAt,
        kind: 'status' as const,
        title: 'Candidate status changed to ' + label(item.toStatus),
        detail: item.reason ?? 'Status updated.',
        actor: item.changedBy?.name ?? 'System',
      })),
      ...history.auditEvents.map((item) => ({
        id: 'audit-' + item.id,
        date: item.createdAt,
        kind: 'activity' as const,
        title: item.summary,
        detail: label(item.action) + ' · ' + item.entityType,
        actor: item.actor?.name ?? 'System',
      })),
      ...history.interviews.flatMap((interview) => {
        const events: Array<{
          id: string;
          date: string;
          kind: 'interview';
          title: string;
          detail: string;
          actor: string;
        }> = [{
          id: 'interview-created-' + interview.id,
          date: interview.createdAt ?? interview.scheduledAt,
          kind: 'interview',
          title: label(interview.type) + ' interview created',
          detail: (interview.job?.title ?? 'General interview') + ' · ' + label(interview.status),
          actor: 'Interview workflow',
        }];

        if (interview.startedAt && !auditFor('Interview', interview.id, 'INTERVIEW_STARTED')) {
          events.push({
            id: 'interview-started-' + interview.id,
            date: interview.startedAt,
            kind: 'interview',
            title: 'Interview started',
            detail: label(interview.type) + ' interview',
            actor: 'Interview workflow',
          });
        }
        if (interview.completedAt && !auditFor('Interview', interview.id, 'INTERVIEW_COMPLETED')) {
          events.push({
            id: 'interview-completed-' + interview.id,
            date: interview.completedAt,
            kind: 'interview',
            title: 'Interview completed',
            detail: label(interview.type) + ' interview',
            actor: 'Interview workflow',
          });
        }
        return events;
      }),
    ];
    return items.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [candidate, history]);

  const latestInterview = history.interviews[0];
  const latestScore = latestInterview ? interviewScore(latestInterview) : null;
  const totalInterviews = history.interviews.length;
  const completedInterviews = history.interviews.filter((item) => item.status === 'COMPLETED').length;
  const submittedEvaluations = history.interviews.reduce((sum, item) => sum + item.evaluations.filter((evaluation) => evaluation.status === 'SUBMITTED').length, 0);

  const displayCandidate = candidateOverride ?? candidate;
  if (!displayCandidate) return null;

  const canEditProfile = role === 'ADMIN' || role === 'AGENCY';
  const hasCompletedInterview = history.interviews.some((item) => item.status === 'COMPLETED');
  const hasScheduledInterview = history.interviews.some((item) => item.status === 'SCHEDULED');
  const candidateStatusOptions: CandidateStatus[] = ['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'];
  const finalStatusOptions: CandidateStatus[] = ['PASSED', 'REJECTED', 'HIRED'];
  const visibleStatusOptions = role === 'INTERVIEWER'
    ? Array.from(new Set([displayCandidate.status, ...finalStatusOptions]))
    : candidateStatusOptions.filter((status) => !finalStatusOptions.includes(status) || hasCompletedInterview || status === displayCandidate.status);
  const profileMeta = history.profile;

  const frameClass = maximized
    ? 'fixed inset-3 sm:inset-5'
    : minimized
      ? 'fixed bottom-4 right-4 w-[min(390px,calc(100vw-2rem))]'
      : 'fixed bottom-4 right-4 w-[min(980px,calc(100vw-2rem))]';

  if (minimized) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[70]">
        <div className={frameClass + ' pointer-events-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-slate-950">{displayCandidate.name}</p>
              <p className="truncate text-[10px] text-slate-400">{displayCandidate.reference} · Passport: {value(displayCandidate.passportNumber)} · {label(displayCandidate.status)}</p>
            </div>
            <button type="button" className="rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-100" onClick={onRestore}>Open</button>
            <button type="button" aria-label="Close candidate profile" className="rounded-lg px-2 py-1 text-lg font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>×</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div className={frameClass + ' pointer-events-auto flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-4rem)]'}>
        <header className="shrink-0 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-700">Candidate full profile</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">{displayCandidate.name}</h2>
                <StatusPill value={displayCandidate.status} />
                <StatusPill value={displayCandidate.onboardingStatus} />
              </div>
              <p className="mt-1 break-words text-xs text-slate-500">{displayCandidate.reference} · Passport: {value(displayCandidate.passportNumber)} · {displayCandidate.profession ?? 'Profession not set'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Minimize candidate profile" title="Minimize" className="rounded-lg px-2 py-1.5 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onMinimize}>−</button>
              <button type="button" aria-label={maximized ? 'Restore candidate profile' : 'Maximize candidate profile'} title={maximized ? 'Restore' : 'Maximize'} className="rounded-lg px-2 py-1.5 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onMaximize}>{maximized ? '❐' : '□'}</button>
              <button type="button" aria-label="Close candidate profile" title="Close" className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>×</button>
            </div>
          </div>
        </header>

        <nav className="shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 sm:px-5" aria-label="Candidate profile sections">
          <div className="flex min-w-max gap-1">
            {([
              ['overview', 'Overview'],
              ['interviews', 'Interviews & Scores'],
              ['timeline', 'Timeline'],
              ['documents', 'Documents'],
            ] as Array<[ProfileTab, string]>).map(([tab, tabLabel]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 ${activeTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
              >
                {tabLabel}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {loading && <StateMessage kind="loading" title="Loading candidate history" description="Fetching interviews, scorecards and timeline activity." />}
          {error && <StateMessage kind="error" title="Candidate history unavailable" description={error} />}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Passport number"><span className="text-cyan-700">{value(displayCandidate.passportNumber)}</span></Field>
                <Field label="Passport expiry">{displayCandidate.passportExpiry ? new Date(displayCandidate.passportExpiry).toLocaleDateString() : 'Not provided'}</Field>
                <Field label="Reference">{displayCandidate.reference}</Field>
                <Field label="Country / nationality">{value(displayCandidate.country)}</Field>
                <Field label="Current location">{value(displayCandidate.currentLocation)}</Field>
                <Field label="Visa / work status">{value(displayCandidate.visaStatus)}</Field>
                <Field label="Availability">{value(displayCandidate.availability)}</Field>
                <Field label="Profession">{value(displayCandidate.profession)}</Field>
                <Field label="Experience">{displayCandidate.experienceYears === null ? 'Not provided' : displayCandidate.experienceYears + ' years'}</Field>
                <Field label="Email">{value(displayCandidate.email)}</Field>
                <Field label="Contact number">{value(displayCandidate.phone)}</Field>
                <Field label="Alternate contact">{value(displayCandidate.alternatePhone)}</Field>
                <Field label="Onboarding"><StatusPill value={displayCandidate.onboardingStatus} /></Field>
                <Field label="Candidate source"><StatusPill value={displayCandidate.source} /></Field>
                <Field label="Status"><StatusPill value={displayCandidate.status} /></Field>
                <Field label="Status updated">{formatDate(displayCandidate.statusUpdatedAt)}</Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Interviews</p><p className="mt-1 text-2xl font-black text-slate-950">{totalInterviews}</p><p className="mt-1 text-[10px] text-slate-400">{completedInterviews} completed</p></Card>
                <Card><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submitted scorecards</p><p className="mt-1 text-2xl font-black text-slate-950">{submittedEvaluations}</p><p className="mt-1 text-[10px] text-slate-400">{history.interviews.length ? 'Across interview history' : 'No interview scores yet'}</p></Card>
                <Card><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latest average</p><p className="mt-1 text-2xl font-black text-cyan-700">{latestScore?.averagePercentage === null || latestScore?.averagePercentage === undefined ? '—' : latestScore.averagePercentage + '%'}</p><p className="mt-1 text-[10px] text-slate-400">{latestInterview ? label(latestInterview.type) + ' interview' : 'No scored interview yet'}</p></Card>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">Agency</h3>
                      <p className="mt-1 text-[10px] text-slate-400">Workspace that owns this candidate record.</p>
                    </div>
                    <StatusPill value={profileMeta?.agency?.status ?? 'UNKNOWN'} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Field label="Agency name">{profileMeta?.agency?.name ?? 'Not available'}</Field>
                    <Field label="Agency slug">{profileMeta?.agency?.slug ?? 'Not available'}</Field>
                    <Field label="Agency ID">{profileMeta?.agency?.id ?? displayCandidate.agencyId}</Field>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">Linked account</h3>
                      <p className="mt-1 text-[10px] text-slate-400">Interviewee login connected to this candidate, when available.</p>
                    </div>
                    {profileMeta?.account && <StatusPill value={profileMeta.account.active ? 'ACTIVE' : 'INACTIVE'} />}
                  </div>
                  {profileMeta?.account ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Field label="Account name">{profileMeta.account.name}</Field>
                      <Field label="Account email">{profileMeta.account.email}</Field>
                      <Field label="Account role">{label(profileMeta.account.role)}</Field>
                      <Field label="Account ID">{profileMeta.account.id}</Field>
                      <Field label="Account created">{formatDate(profileMeta.account.createdAt)}</Field>
                      <Field label="Account updated">{formatDate(profileMeta.account.updatedAt)}</Field>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-400">No linked login account.</p>
                  )}
                </Card>
              </div>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Record management</h3>
                    <p className="mt-1 text-xs text-slate-500">The actions available in the original candidate details popup are available here too.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEditProfile && <button type="button" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800" onClick={() => { setEditingProfile((value) => !value); setError(''); }}>
                      {editingProfile ? 'Close edit' : 'Edit profile'}
                    </button>}
                    {canEditProfile && displayCandidate.onboardingStatus !== 'COMPLETED' && (
                      <button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" disabled={savingOnboarding} onClick={() => void updateOnboarding()}>
                        {savingOnboarding ? 'Updating…' : 'Mark onboarding complete'}
                      </button>
                    )}
                  </div>
                </div>

                {editingProfile && canEditProfile && (
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                    {[
                      ['name', 'Full name'],
                      ['country', 'Country / nationality'],
                      ['email', 'Email'],
                      ['phone', 'Contact number'],
                      ['alternatePhone', 'Alternate contact'],
                      ['passportNumber', 'Passport number'],
                      ['currentLocation', 'Current location'],
                      ['availability', 'Availability'],
                      ['visaStatus', 'Visa / work status'],
                      ['profession', 'Profession'],
                    ].map(([key, fieldLabel]) => (
                      <label key={key} className="block">
                        <span className="field-label">{fieldLabel}</span>
                        <input
                          className="field-input mt-1 w-full"
                          type={key === 'email' ? 'email' : 'text'}
                          value={profileForm[key as keyof typeof profileForm]}
                          onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))}
                        />
                      </label>
                    ))}
                    <label className="block">
                      <span className="field-label">Passport expiry</span>
                      <input type="date" className="field-input mt-1 w-full" value={profileForm.passportExpiry} onChange={(event) => setProfileForm((current) => ({ ...current, passportExpiry: event.target.value }))} />
                    </label>
                    <label className="block">
                      <span className="field-label">Experience years</span>
                      <input type="number" min="0" max="60" className="field-input mt-1 w-full" value={profileForm.experienceYears} onChange={(event) => setProfileForm((current) => ({ ...current, experienceYears: event.target.value }))} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="field-label">Skills</span>
                      <input className="field-input mt-1 w-full" value={profileForm.skills} onChange={(event) => setProfileForm((current) => ({ ...current, skills: event.target.value }))} />
                    </label>
                    <div className="flex justify-end gap-2 sm:col-span-2">
                      <button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50" onClick={() => setEditingProfile(false)}>Cancel</button>
                      <button type="button" className="rounded-xl bg-cyan-700 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-800" disabled={savingProfile} onClick={() => void saveProfile()}>
                        {savingProfile ? 'Saving…' : 'Save profile'}
                      </button>
                    </div>
                  </div>
                )}

                {(canEditProfile || role === 'INTERVIEWER') && (
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_1fr_auto]">
                    <label className="block">
                      <span className="field-label">Lifecycle status</span>
                      <select className="field-input mt-1 w-full" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as CandidateStatus)}>
                        {visibleStatusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="field-label">Reason / decision note</span>
                      <input className="field-input mt-1 w-full" value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Optional note" />
                    </label>
                    <button
                      type="button"
                      className="self-end rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      disabled={savingProfile || !statusDraft || statusDraft === displayCandidate.status || (role === 'INTERVIEWER' && (!hasCompletedInterview || hasScheduledInterview))}
                      onClick={() => void updateStatus()}
                    >
                      {role === 'INTERVIEWER' ? 'Record decision' : 'Update status'}
                    </button>
                  </div>
                )}
                {role === 'INTERVIEWER' && (!hasCompletedInterview || hasScheduledInterview) && (
                  <p className="mt-3 text-[10px] text-amber-700">
                    A final decision can be recorded only after a completed interview and when no other interview is still scheduled.
                  </p>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Record metadata</h3>
                    <p className="mt-1 text-[10px] text-slate-400">System timestamps for the candidate record.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Field label="Candidate ID">{displayCandidate.id}</Field>
                  <Field label="Created">{formatDate(profileMeta?.createdAt ?? displayCandidate.createdAt)}</Field>
                  <Field label="Last updated">{formatDate(profileMeta?.updatedAt ?? displayCandidate.updatedAt)}</Field>
                  <Field label="Source">{label(displayCandidate.source)}</Field>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Skills</h3>
                    <p className="mt-1 text-[10px] text-slate-400">{displayCandidate.skills.length} skill(s) recorded</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {displayCandidate.skills.length
                    ? displayCandidate.skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">{skill}</span>)
                    : <span className="text-xs text-slate-400">No skills recorded.</span>}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Interview history & scorecards</h3>
                  <p className="mt-1 text-xs text-slate-500">Every interview, panel assignment and available evaluation for this candidate.</p>
                </div>
                <div className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">{totalInterviews} interview(s)</div>
              </div>

              {!history.interviews.length && !loading && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No interview history yet.</div>
              )}

              {history.interviews.map((interview) => {
                const score = interviewScore(interview);
                return (
                  <Card key={interview.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-950">{label(interview.type)} interview</h4>
                          <StatusPill value={interview.status} />
                        </div>
                        <p className="mt-1 text-xs font-semibold text-cyan-700">{interview.job?.title ?? 'General interview'} · {formatDate(interview.scheduledAt)}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{interview.durationMins} min · {interview.location ?? 'Location not specified'}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Panel average</p>
                        <p className="mt-1 text-sm font-black text-cyan-700">{score.averagePercentage === null ? '—' : score.averagePercentage + '%'}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Started">{formatDate(interview.startedAt)}</Field>
                      <Field label="Completed">{formatDate(interview.completedAt)}</Field>
                      <Field label="Interview ID">{interview.id}</Field>
                    </div>
                    {interview.notes && (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Interview notes</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{interview.notes}</p>
                      </div>
                    )}

                    {interview.panel.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Interview panel</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {interview.panel.map((participant) => (
                            <span key={participant.userId} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600">
                              {participant.user.name}{participant.user.active ? '' : ' · inactive'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {score.submitted.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Evaluator scorecards</p>
                        {interview.evaluations.map((evaluation) => {
                          const total = evaluation.scores.reduce((sum, item) => sum + item.points, 0);
                          const max = evaluation.scores.reduce((sum, item) => sum + (item.criterion?.maxPoints ?? 0), 0);
                          return (
                          <div key={evaluation.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="flex items-center gap-2"><p className="text-xs font-black text-slate-950">{evaluation.interviewer?.name ?? 'Interviewer'}</p><StatusPill value={evaluation.status} /></div>
                                <p className="mt-1 text-[10px] text-slate-400">{evaluation.interviewer?.email ?? evaluation.interviewerId} · {evaluation.status === 'SUBMITTED' ? 'Submitted ' + formatDate(evaluation.submittedAt) : 'Last updated ' + formatDate(evaluation.updatedAt)}</p>
                              </div>
                              <p className="text-sm font-black text-cyan-700">{total} / {max} {max ? '(' + Math.round((total / max) * 100) + '%)' : ''}</p>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {evaluation.scores.map((scoreItem) => (
                                <div key={evaluation.id + '-' + scoreItem.criterionId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                                  <span className="text-[11px] font-semibold text-slate-600">{scoreItem.criterion?.name ?? 'Criterion'}</span>
                                  <span className="text-xs font-black text-slate-900">{scoreItem.points} / {scoreItem.criterion?.maxPoints ?? 0}</span>
                                </div>
                              ))}
                            </div>

                            {evaluation.comments && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{evaluation.comments}</p>}
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No evaluator scorecard is available for this interview.</div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Candidate timeline</h3>
                  <p className="mt-1 text-xs text-slate-500">Status changes, interview lifecycle events and recorded candidate activity.</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{timeline.length} events</span>
              </div>

              {!timeline.length && !loading && (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No timeline activity yet.</div>
              )}

              <div className="relative mt-6">
                <div className="absolute bottom-0 left-3 top-0 w-px bg-slate-200" />
                <div className="space-y-5">
                  {timeline.map((item) => (
                    <div key={item.id} className="relative flex gap-4">
                      <div className="relative z-10 mt-1 size-6 shrink-0 rounded-full border-4 border-white bg-slate-950 shadow-sm" />
                      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-black text-slate-900">{item.title}</p>
                            <p className="mt-1 text-[10px] text-slate-400">{item.detail} · By {item.actor}</p>
                          </div>
                          <p className="shrink-0 text-[10px] font-semibold text-slate-400">{formatDate(item.date)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <CandidateDocumentsPanel
              candidateId={displayCandidate.id}
              apiEnabled={apiEnabled}
              readOnly={role === 'INTERVIEWER'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
