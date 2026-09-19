import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { getApplication, getCandidate, getJob, getUser } from '../../domain/fixtures';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Interview, JobApplication, User, UserRole } from '../../domain/types';

interface InterviewsPageProps { role: UserRole; }

interface ApplicationRecord extends JobApplication {
  job?: { id: string; agencyId: string; title: string; location: string | null };
  candidate?: { id: string; agencyId: string; name: string; reference: string; email: string | null; profession: string | null };
}

interface InterviewRecord extends Interview {
  application?: {
    id: string;
    status: string;
    job: { id: string; agencyId: string; title: string; location: string | null };
    candidate: { id: string; name: string; reference: string; email: string | null; profession: string | null };
  };
  panel?: Array<{
    userId: string;
    assignedAt: string;
    user: { id: string; name: string; email: string; role: UserRole; active: boolean };
  }>;
  evaluations?: Array<{ id: string }>;
}

type Recommendation = 'RECOMMENDED' | 'MAYBE' | 'NOT_RECOMMENDED';

interface EvaluationDraft {
  rating: string;
  recommendation: Recommendation;
  comments: string;
}

const defaultForm = {
  scheduledAt: '',
  type: 'TECHNICAL' as Interview['type'],
  durationMins: '45',
  location: '',
};

const defaultEvaluation: EvaluationDraft = {
  rating: '4',
  recommendation: 'RECOMMENDED',
  comments: '',
};

export const InterviewsPage = ({ role }: InterviewsPageProps) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [interviews, setInterviews] = useState<InterviewRecord[]>(developmentMode ? state.interviews : []);
  const [applications, setApplications] = useState<ApplicationRecord[]>(developmentMode ? state.applications : []);
  const [interviewers, setInterviewers] = useState<User[]>(developmentMode ? state.users.filter((item) => item.role === 'INTERVIEWER') : []);
  const [showForm, setShowForm] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [panel, setPanel] = useState<string[]>(developmentMode ? ['user-interviewer-1'] : []);
  const [form, setForm] = useState(defaultForm);
  const [evaluationDrafts, setEvaluationDrafts] = useState<Record<string, EvaluationDraft>>({});
  const [submittedEvaluationIds, setSubmittedEvaluationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (developmentMode) {
      const shortlisted = state.applications.filter((item) => ['SHORTLISTED', 'INTERVIEW'].includes(item.status));
      setInterviews(state.interviews);
      setApplications(state.applications);
      setInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER'));
      setSelectedApplicationId((current) => current || shortlisted[0]?.id || '');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const interviewRequest = apiFetch<InterviewRecord[]>('/interviews');
    const applicationsRequest = role === 'AGENCY'
      ? apiFetch<ApplicationRecord[]>('/applications')
      : Promise.resolve([] as ApplicationRecord[]);
    const interviewerRequest = role === 'AGENCY' && user?.agencyId
      ? apiFetch<User[]>('/agencies/' + user.agencyId + '/users')
      : Promise.resolve([] as User[]);

    Promise.all([interviewRequest, applicationsRequest, interviewerRequest])
      .then(([interviewResult, applicationResult, users]) => {
        if (cancelled) return;
        setInterviews(interviewResult);
        setApplications(applicationResult);
        setInterviewers(users.filter((item) => item.role === 'INTERVIEWER' && item.active));

        if (role === 'AGENCY') {
          const shortlisted = applicationResult.filter((item) => ['SHORTLISTED', 'INTERVIEW'].includes(item.status));
          setSelectedApplicationId((current) => current || shortlisted[0]?.id || '');
          const firstActiveInterviewer = users.find((item) => item.role === 'INTERVIEWER' && item.active);
          if (firstActiveInterviewer) {
            setPanel((current) => current.length ? current : [firstActiveInterviewer.id]);
          }
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load interviews.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, role, state.applications, state.interviews, state.users, user?.agencyId, user?.id]);

  const localApplication = (interview: InterviewRecord) => state.applications.find((item) => item.id === interview.applicationId) ?? getApplication(interview.applicationId);

  const localCandidate = (interview: InterviewRecord) => {
    const application = localApplication(interview);
    return application ? (state.candidates.find((item) => item.id === application.candidateId) ?? getCandidate(application.candidateId)) : undefined;
  };

  const localJob = (interview: InterviewRecord) => {
    const application = localApplication(interview);
    return application ? (state.jobs.find((item) => item.id === application.jobId) ?? getJob(application.jobId)) : undefined;
  };

  const visible = useMemo(() => {
    const base = role === 'INTERVIEWER'
      ? developmentMode
        ? state.interviews.filter((item) => item.panelUserIds.includes('user-interviewer-1'))
        : interviews
      : role === 'INTERVIEWEE'
        ? developmentMode
          ? state.interviews.filter((item) => state.applications.find((application) => application.id === item.applicationId)?.candidateId === (user?.candidateId ?? 'candidate-1'))
          : interviews
        : interviews;
    const query = search.trim().toLowerCase();
    if (!query) return base;
    return base.filter((interview) => {
      const application = interview.application;
      const candidate = application?.candidate ?? localCandidate(interview);
      const job = application?.job ?? localJob(interview);
      const panelNames = interview.panel?.map((item) => item.user.name) ?? [];
      return [candidate?.name ?? '', candidate?.reference ?? '', job?.title ?? '', job?.location ?? '', interview.type, interview.status, ...panelNames]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [developmentMode, interviews, role, search, state.applications, state.interviews, user?.candidateId]);

  const applicationCandidates = applications.filter((item) => ['SHORTLISTED', 'INTERVIEW'].includes(item.status));

  const toDateTimeLocal = (value: string): string => {
    const date = new Date(value);
    const pad = (input: number) => String(input).padStart(2, '0');
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
      + 'T' + [pad(date.getHours()), pad(date.getMinutes())].join(':');
  };

  const openScheduleForm = () => {
    const firstApplication = applicationCandidates[0];
    const firstInterviewer = interviewers[0];
    setEditingInterviewId(null);
    setForm(defaultForm);
    setSelectedApplicationId(firstApplication?.id ?? '');
    setPanel(firstInterviewer ? [firstInterviewer.id] : []);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openRescheduleForm = (interview: InterviewRecord) => {
    setEditingInterviewId(interview.id);
    setSelectedApplicationId(interview.applicationId);
    setForm({
      scheduledAt: toDateTimeLocal(interview.scheduledAt),
      type: interview.type,
      durationMins: String(interview.durationMins),
      location: interview.location ?? '',
    });
    const existingPanel = interview.panel ?? [];
    setInterviewers((current) => {
      const known = new Set(current.map((item) => item.id));
      const missing = existingPanel.map((item) => item.user).filter((item) => !known.has(item.id));
      return [...current, ...missing];
    });
    setPanel(interview.panel?.map((item) => item.userId) ?? interview.panelUserIds);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingInterviewId(null);
    setForm(defaultForm);
    setSelectedApplicationId('');
    setPanel(developmentMode ? ['user-interviewer-1'] : []);
  };

  const schedule = async () => {
    if (!editingInterviewId && (!selectedApplicationId || panel.length === 0)) {
      setError('Select an application and at least one interviewer.');
      return;
    }
    if (editingInterviewId && panel.length === 0) {
      setError('Select at least one interviewer.');
      return;
    }

    const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : '';
    if (!scheduledAt) {
      setError('Interview date and time are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingInterviewId) {
        if (developmentMode) {
          const currentInterview = interviews.find((item) => item.id === editingInterviewId);
          if (!currentInterview) throw new Error('The selected interview could not be found.');
          const updated: Interview = {
            ...currentInterview,
            type: form.type,
            scheduledAt,
            durationMins: Math.max(15, Number(form.durationMins) || 30),
            location: form.location.trim() || null,
            panelUserIds: panel,
          };
          dispatch({ type: 'UPDATE_INTERVIEW', interview: updated });
          setInterviews((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
        } else {
          const updated = await apiFetch<InterviewRecord>('/interviews/' + editingInterviewId, {
            method: 'PATCH',
            body: JSON.stringify({
              type: form.type,
              scheduledAt,
              durationMins: Math.max(15, Number(form.durationMins) || 30),
              location: form.location.trim() || null,
              interviewerIds: panel,
            }),
          });
          setInterviews((current) => current.map((item) => item.id === updated.id ? updated : item));
        }
        closeForm();
        setSuccess('Interview rescheduled successfully.');
        return;
      }

      if (developmentMode) {
        const interview: Interview = {
          id: 'interview-' + Date.now(),
          applicationId: selectedApplicationId,
          type: form.type,
          status: 'SCHEDULED',
          scheduledAt,
          durationMins: Math.max(15, Number(form.durationMins) || 30),
          location: form.location.trim() || null,
          panelUserIds: panel,
        };
        dispatch({ type: 'SCHEDULE_INTERVIEW', interview });
        setInterviews((current) => [interview, ...current]);
      } else {
        const created = await apiFetch<InterviewRecord>('/applications/' + selectedApplicationId + '/interviews', {
          method: 'POST',
          body: JSON.stringify({
            type: form.type,
            scheduledAt,
            durationMins: Math.max(15, Number(form.durationMins) || 30),
            location: form.location.trim() || null,
            interviewerIds: panel,
          }),
        });
        setInterviews((current) => [...current, created].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
        setApplications((current) => current.map((item) => item.id === selectedApplicationId ? { ...item, status: 'INTERVIEW' } : item));
      }

      closeForm();
      setSuccess('Interview scheduled successfully.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to schedule the interview.');
    } finally {
      setSaving(false);
    }
  };

  const cancelInterview = async (interview: InterviewRecord) => {
    setError('');

    try {
      if (developmentMode) {
        dispatch({ type: 'SET_INTERVIEW_STATUS', interviewId: interview.id, status: 'CANCELLED' });
        setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, status: 'CANCELLED' } : item));
      } else {
        const updated = await apiFetch<InterviewRecord>('/interviews/' + interview.id, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
        setInterviews((current) => current.map((item) => item.id === updated.id ? updated : item));
      }

      setSuccess('Interview cancelled.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to cancel the interview.');
    }
  };

  const submitEvaluation = async (interview: InterviewRecord) => {
    const draft = evaluationDrafts[interview.id] ?? defaultEvaluation;

    setEvaluating(interview.id);
    setError('');

    try {
      if (developmentMode) {
        dispatch({ type: 'SET_INTERVIEW_STATUS', interviewId: interview.id, status: 'COMPLETED' });
        dispatch({
          type: 'SAVE_EVALUATION',
          evaluation: {
            id: 'evaluation-' + Date.now(),
            interviewId: interview.id,
            interviewerId: 'user-interviewer-1',
            rating: Number(draft.rating),
            recommendation: draft.recommendation,
            comments: draft.comments.trim() || null,
          },
        });
        setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, status: 'COMPLETED' } : item));
      } else {
        const result = await apiFetch<{
          evaluation: unknown;
          interviewCompleted: boolean;
          applicationStatus: string;
        }>('/interviews/' + interview.id + '/evaluations', {
          method: 'POST',
          body: JSON.stringify({
            rating: Number(draft.rating),
            recommendation: draft.recommendation,
            comments: draft.comments.trim() || null,
          }),
        });

        setSubmittedEvaluationIds((current) => new Set(current).add(interview.id));

        if (result.interviewCompleted) {
          setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, status: 'COMPLETED' } : item));
        }
      }

      setSuccess('Evaluation submitted.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit the evaluation.');
    } finally {
      setEvaluating(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="Interview desk"
        title={role === 'INTERVIEWER' ? 'My Interviews' : role === 'INTERVIEWEE' ? 'My Interviews' : 'Interviews'}
        description="Every interview belongs to a job application. One interviewer or multiple interviewers can be assigned as a panel."
        action={role === 'AGENCY' ? (
          <Button onClick={showForm && !editingInterviewId ? closeForm : openScheduleForm}>
            {showForm && !editingInterviewId ? 'Close scheduler' : 'Schedule interview'}
          </Button>
        ) : undefined}
      />

      {loading && <StateMessage kind="loading" title="Loading interviews" description="Fetching schedules and panel assignments." />}
      {error && <StateMessage kind="error" title="Interview action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="field-label">Interview search</p>
            <p className="mt-1 text-xs text-slate-400">Search candidate, job, panel member, interview type, or status.</p>
          </div>
          <input className="field-input w-full sm:max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search interviews…" aria-label="Search interviews" />
        </div>
      </Card>

      {showForm && role === 'AGENCY' && (
        <Card>
          <div className="mb-4 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">{editingInterviewId ? 'Reschedule interview' : 'Schedule interview'}</p>
            <p className="mt-1 text-xs text-slate-500">{editingInterviewId ? 'Update the time, panel, or meeting details for this scheduled interview.' : 'Choose an application, time, and one or more interviewers.'}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Application">
              <select className="field-input" value={selectedApplicationId} onChange={(event) => setSelectedApplicationId(event.target.value)} disabled={Boolean(editingInterviewId)}>
                <option value="">Select application</option>
                {applicationCandidates.map((application) => {
                  const candidateName = application.candidate?.name ?? state.candidates.find((item) => item.id === application.candidateId)?.name ?? 'Candidate';
                  const jobTitle = application.job?.title ?? state.jobs.find((item) => item.id === application.jobId)?.title ?? 'Job';
                  return <option key={application.id} value={application.id}>{candidateName} — {jobTitle}</option>;
                })}
              </select>
            </FormField>
            <FormField label="Interview type">
              <select className="field-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Interview['type'] })}>
                <option value="SCREENING">Screening</option>
                <option value="TECHNICAL">Technical</option>
                <option value="PRACTICAL">Practical</option>
                <option value="FINAL">Final</option>
              </select>
            </FormField>
            <FormField label="Date & time">
              <input type="datetime-local" className="field-input" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
            </FormField>
            <FormField label="Duration">
              <input type="number" min="15" max="480" className="field-input" value={form.durationMins} onChange={(event) => setForm({ ...form, durationMins: event.target.value })} />
            </FormField>
            <FormField label="Location">
              <input className="field-input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Interview room / video link" />
            </FormField>
            <FormField label="Interviewer panel" hint="Select one or more active interviewers.">
              <div className="mt-1 space-y-2">
                {interviewers.map((interviewer) => (
                  <label key={interviewer.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      disabled={!editingInterviewId && !interviewer.active}
                      checked={panel.includes(interviewer.id)}
                      onChange={(event) => setPanel((current) => event.target.checked
                        ? [...new Set([...current, interviewer.id])]
                        : current.filter((id) => id !== interviewer.id))}
                    />
                    <span className="min-w-0 flex-1">{interviewer.name}</span>
                    {!interviewer.active && <span className="text-[10px] font-bold text-amber-600">inactive</span>}
                  </label>
                ))}
              </div>
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button disabled={saving} onClick={() => void schedule()}>{saving ? (editingInterviewId ? 'Rescheduling…' : 'Scheduling…') : editingInterviewId ? 'Reschedule' : 'Schedule'}</Button>
          </div>
        </Card>
      )}

      {!loading && visible.length === 0 && (
        <StateMessage kind="empty" title="No interviews yet" description="Scheduled interviews for this role will appear here." />
      )}

      {!loading && visible.length > 0 && (
        <div className="grid gap-4">
          {visible.map((interview) => {
            const application = interview.application;
            const candidate = application?.candidate ?? localCandidate(interview);
            const job = application?.job ?? localJob(interview);
            const panelNames = interview.panel?.map((item) => item.user.name)
              ?? (interview.panelUserIds.map((id) => state.users.find((item) => item.id === id)?.name ?? getUser(id)?.name).filter(Boolean) as string[]);
            const evaluationDraft = evaluationDrafts[interview.id] ?? defaultEvaluation;
            const alreadySubmitted = submittedEvaluationIds.has(interview.id) || Boolean(interview.evaluations?.some((evaluation) => evaluation.id));

            return (
              <article key={interview.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">{candidate?.name ?? 'Candidate'}</h2>
                      <StatusPill value={interview.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{job?.title ?? 'Job'}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-sm font-bold text-slate-900">{new Date(interview.scheduledAt).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-400">{interview.durationMins} minutes · {interview.location ?? 'No location'}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</p><p className="mt-1 text-sm font-bold text-slate-800">{interview.type}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Panel</p><p className="mt-1 text-sm font-bold text-slate-800">{panelNames.join(', ') || 'No panel'}</p></div>
                  <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Application</p><p className="mt-1 text-sm font-bold text-slate-800">{application?.status ?? localApplication(interview)?.status ?? '—'}</p></div>
                </div>

                {role === 'AGENCY' && interview.status === 'SCHEDULED' && (
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openRescheduleForm(interview)}>Reschedule</Button>
                    <Button variant="danger" size="sm" onClick={() => void cancelInterview(interview)}>Cancel interview</Button>
                  </div>
                )}

                {role === 'INTERVIEWER' && interview.status === 'SCHEDULED' && (
                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-900">Evaluation</p>
                    {alreadySubmitted ? (
                      <StateMessage kind="success" title="Evaluation submitted" description="Your panel evaluation has already been recorded." />
                    ) : developmentMode ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <FormField label="Rating (1–5)">
                          <select
                            className="field-input"
                            value={evaluationDraft.rating}
                            onChange={(event) => setEvaluationDrafts((current) => ({
                              ...current,
                              [interview.id]: { ...evaluationDraft, rating: event.target.value },
                            }))}
                          >
                            <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
                          </select>
                        </FormField>
                        <FormField label="Recommendation">
                          <select
                            className="field-input"
                            value={evaluationDraft.recommendation}
                            onChange={(event) => setEvaluationDrafts((current) => ({
                              ...current,
                              [interview.id]: { ...evaluationDraft, recommendation: event.target.value as Recommendation },
                            }))}
                          >
                            <option value="RECOMMENDED">Recommended</option>
                            <option value="MAYBE">Maybe</option>
                            <option value="NOT_RECOMMENDED">Not recommended</option>
                          </select>
                        </FormField>
                        <FormField label="Comments">
                          <input
                            className="field-input"
                            value={evaluationDraft.comments}
                            onChange={(event) => setEvaluationDrafts((current) => ({
                              ...current,
                              [interview.id]: { ...evaluationDraft, comments: event.target.value },
                            }))}
                            placeholder="Interview notes"
                          />
                        </FormField>
                        <div className="md:col-span-3">
                          <Button disabled={evaluating === interview.id} onClick={() => void submitEvaluation(interview)}>
                            {evaluating === interview.id ? 'Submitting…' : 'Submit evaluation'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <FormField label="Rating (1–5)">
                          <select
                            className="field-input"
                            value={evaluationDraft.rating}
                            onChange={(event) => setEvaluationDrafts((current) => ({
                              ...current,
                              [interview.id]: { ...evaluationDraft, rating: event.target.value },
                            }))}
                          >
                            <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
                          </select>
                        </FormField>
                        <FormField label="Recommendation">
                          <select
                            className="field-input"
                            value={evaluationDraft.recommendation}
                            onChange={(event) => setEvaluationDrafts((current) => ({
                              ...current,
                              [interview.id]: { ...evaluationDraft, recommendation: event.target.value as Recommendation },
                            }))}
                          >
                            <option value="RECOMMENDED">Recommended</option>
                            <option value="MAYBE">Maybe</option>
                            <option value="NOT_RECOMMENDED">Not recommended</option>
                          </select>
                        </FormField>
                        <FormField label="Comments">
                          <textarea
                            className="field-input min-h-20 resize-y"
                            value={evaluationDraft.comments}
                            onChange={(event) => setEvaluationDrafts((current) => ({
                              ...current,
                              [interview.id]: { ...evaluationDraft, comments: event.target.value },
                            }))}
                            placeholder="Interview notes"
                          />
                        </FormField>
                        <div className="md:col-span-3">
                          <Button disabled={evaluating === interview.id} onClick={() => void submitEvaluation(interview)}>
                            {evaluating === interview.id ? 'Submitting…' : 'Submit evaluation'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
