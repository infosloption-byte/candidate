import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Candidate, CandidateAuditEvent, CandidateHistoryInterview, CandidateStatusHistory, UserRole } from '../../domain/types';
import { apiFetch } from '../../shared/lib/api';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { CandidateDocumentsPanel } from './CandidateDocumentsPanel';

export type CandidateProfileData = Pick<Candidate, 'id' | 'agencyId' | 'reference' | 'name' | 'email' | 'phone' | 'alternatePhone' | 'country' | 'passportNumber' | 'passportExpiry' | 'currentLocation' | 'availability' | 'visaStatus' | 'profession' | 'experienceYears' | 'skills' | 'onboardingStatus' | 'source' | 'status' | 'statusUpdatedAt'>;

export interface CandidateProfileHistory {
  statusHistory: CandidateStatusHistory[];
  interviews: CandidateHistoryInterview[];
  auditEvents: CandidateAuditEvent[];
}

interface Props {
  candidate: CandidateProfileData | null;
  role: UserRole;
  apiEnabled: boolean;
  initialHistory?: CandidateProfileHistory;
  minimized: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onRestore: () => void;
  onMaximize: () => void;
  onClose: () => void;
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
  minimized,
  maximized,
  onMinimize,
  onRestore,
  onMaximize,
  onClose,
}: Props) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [history, setHistory] = useState<CandidateProfileHistory>(initialHistory ?? { statusHistory: [], interviews: [], auditEvents: [] });
  const [loading, setLoading] = useState(Boolean(candidate && apiEnabled && !initialHistory));
  const [error, setError] = useState('');

  useEffect(() => {
    setActiveTab('overview');
    setError('');
    setHistory(initialHistory ?? { statusHistory: [], interviews: [], auditEvents: [] });
  }, [candidate?.id, initialHistory]);

  useEffect(() => {
    if (!candidate || !apiEnabled || initialHistory) return;
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
  }, [apiEnabled, candidate?.id, initialHistory]);

  const timeline = useMemo(() => {
    if (!candidate) return [];
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
        detail: label(item.action),
        actor: item.actor?.name ?? 'System',
      })),
      ...history.interviews.flatMap((interview) => {
        const events = [{
          id: 'interview-created-' + interview.id,
          date: interview.createdAt,
          kind: 'interview' as const,
          title: label(interview.type) + ' interview created',
          detail: (interview.job?.title ?? 'General interview') + ' · ' + label(interview.status),
          actor: 'Interview workflow',
        }];
        if (interview.startedAt) {
          events.push({
            id: 'interview-started-' + interview.id,
            date: interview.startedAt,
            kind: 'interview',
            title: 'Interview started',
            detail: label(interview.type) + ' interview',
            actor: 'Interview workflow',
          });
        }
        if (interview.completedAt) {
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

  if (!candidate) return null;

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
              <p className="truncate text-xs font-black text-slate-950">{candidate.name}</p>
              <p className="truncate text-[10px] text-slate-400">{candidate.reference} · Passport: {value(candidate.passportNumber)} · {label(candidate.status)}</p>
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
                <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">{candidate.name}</h2>
                <StatusPill value={candidate.status} />
                <StatusPill value={candidate.onboardingStatus} />
              </div>
              <p className="mt-1 break-words text-xs text-slate-500">{candidate.reference} · Passport: {value(candidate.passportNumber)} · {candidate.profession ?? 'Profession not set'}</p>
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
                <Field label="Passport number"><span className="text-cyan-700">{value(candidate.passportNumber)}</span></Field>
                <Field label="Passport expiry">{candidate.passportExpiry ? new Date(candidate.passportExpiry).toLocaleDateString() : 'Not provided'}</Field>
                <Field label="Reference">{candidate.reference}</Field>
                <Field label="Country / nationality">{value(candidate.country)}</Field>
                <Field label="Current location">{value(candidate.currentLocation)}</Field>
                <Field label="Visa / work status">{value(candidate.visaStatus)}</Field>
                <Field label="Availability">{value(candidate.availability)}</Field>
                <Field label="Profession">{value(candidate.profession)}</Field>
                <Field label="Experience">{candidate.experienceYears === null ? 'Not provided' : candidate.experienceYears + ' years'}</Field>
                <Field label="Email">{value(candidate.email)}</Field>
                <Field label="Contact number">{value(candidate.phone)}</Field>
                <Field label="Alternate contact">{value(candidate.alternatePhone)}</Field>
                <Field label="Onboarding"><StatusPill value={candidate.onboardingStatus} /></Field>
                <Field label="Candidate source"><StatusPill value={candidate.source} /></Field>
                <Field label="Status"><StatusPill value={candidate.status} /></Field>
                <Field label="Status updated">{formatDate(candidate.statusUpdatedAt)}</Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Card><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Interviews</p><p className="mt-1 text-2xl font-black text-slate-950">{totalInterviews}</p><p className="mt-1 text-[10px] text-slate-400">{completedInterviews} completed</p></Card>
                <Card><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Submitted scorecards</p><p className="mt-1 text-2xl font-black text-slate-950">{submittedEvaluations}</p><p className="mt-1 text-[10px] text-slate-400">{history.interviews.length ? 'Across interview history' : 'No interview scores yet'}</p></Card>
                <Card><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latest average</p><p className="mt-1 text-2xl font-black text-cyan-700">{latestScore?.averagePercentage === null || latestScore?.averagePercentage === undefined ? '—' : latestScore.averagePercentage + '%'}</p><p className="mt-1 text-[10px] text-slate-400">{latestInterview ? label(latestInterview.type) + ' interview' : 'No scored interview yet'}</p></Card>
              </div>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Skills</h3>
                    <p className="mt-1 text-[10px] text-slate-400">{candidate.skills.length} skill(s) recorded</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.skills.length
                    ? candidate.skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">{skill}</span>)
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

                    {score.evaluations.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Evaluator scorecards</p>
                        {score.totals.map(({ evaluation, total, max }) => (
                          <div key={evaluation.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-black text-slate-950">{evaluation.interviewer?.name ?? 'Interviewer'}</p>
                                <p className="mt-1 text-[10px] text-slate-400">{evaluation.interviewer?.email ?? evaluation.interviewerId} · Submitted {formatDate(evaluation.submittedAt)}</p>
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
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No submitted scorecard is available for this interview.</div>
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
              candidateId={candidate.id}
              apiEnabled={apiEnabled}
              readOnly={role === 'INTERVIEWER'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
