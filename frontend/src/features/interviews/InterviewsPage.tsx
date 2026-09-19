import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, CandidateStatus, Interview, InterviewCriterion, InterviewType, Job, User, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

interface InterviewRecord extends Interview {
  panel?: Array<{
    userId: string;
    assignedAt: string;
    user: { id: string; name: string; email: string; active: boolean };
  }>;
  evaluations?: Array<{ id: string }>;
}

const candidateFinalStatuses: CandidateStatus[] = ['PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'];

const defaultForm = {
  scheduledAt: '',
  type: 'TECHNICAL' as InterviewType,
  durationMins: '45',
  location: '',
  notes: '',
};

const toDateTimeLocal = (value: string): string => {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, '0');
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-') + 'T' + [pad(date.getHours()), pad(date.getMinutes())].join(':');
};

const statusLabel = (value: string): string => value.replaceAll('_', ' ');

export const InterviewsPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [interviews, setInterviews] = useState<InterviewRecord[]>(developmentMode ? state.interviews : []);
  const [candidates, setCandidates] = useState<Candidate[]>(developmentMode ? state.candidates : []);
  const [jobs, setJobs] = useState<Job[]>(developmentMode ? state.jobs : []);
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [interviewers, setInterviewers] = useState<User[]>(developmentMode ? state.users.filter((item) => item.role === 'INTERVIEWER' && item.active) : []);
  const [criteria, setCriteria] = useState<InterviewCriterion[]>(developmentMode ? state.interviewCriteria.filter((item) => item.active) : []);
  const [agencyId, setAgencyId] = useState(user?.role === 'ADMIN' ? '' : (user?.agencyId ?? 'agency-1'));
  const [candidateId, setCandidateId] = useState('');
  const [jobId, setJobId] = useState('');
  const [panel, setPanel] = useState<string[]>([]);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [evaluationFor, setEvaluationFor] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [evaluationComments, setEvaluationComments] = useState('');
  const [statusDrafts, setStatusDrafts] = useState<Record<string, CandidateStatus>>({});
  const [statusReasons, setStatusReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setInterviews(state.interviews);
      setCandidates(state.candidates);
      setJobs(state.jobs);
      setAgencies(state.agencies);
      setInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER' && item.active));
      setCriteria(state.interviewCriteria.filter((item) => item.agencyId === agencyId && item.active));
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const requests = [
      apiFetch<InterviewRecord[]>('/interviews'),
      ['ADMIN', 'AGENCY'].includes(role) ? apiFetch<Candidate[]>('/candidates') : Promise.resolve([] as Candidate[]),
      ['ADMIN', 'AGENCY'].includes(role) ? apiFetch<Job[]>('/jobs') : Promise.resolve([] as Job[]),
      role === 'ADMIN' ? apiFetch<Agency[]>('/agencies') : Promise.resolve([] as Agency[]),
      role === 'AGENCY' && user?.agencyId
        ? apiFetch<User[]>('/agencies/' + user.agencyId + '/users')
        : Promise.resolve([] as User[]),
    ];

    Promise.all(requests)
      .then(([interviewResult, candidateResult, jobResult, agencyResult, userResult]) => {
        if (cancelled) return;
        setInterviews(interviewResult);
        if (role !== 'INTERVIEWEE' && role !== 'INTERVIEWER') {
          setCandidates(candidateResult);
          setJobs(jobResult);
        }
        if (role === 'ADMIN') setAgencies(agencyResult);
        if (role === 'AGENCY') setInterviewers(userResult.filter((item) => item.role === 'INTERVIEWER' && item.active));
        if (role === 'ADMIN') {
          const firstAgency = agencyResult.find((item) => item.status === 'ACTIVE');
          setAgencyId((current) => current || firstAgency?.id || '');
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load interviews.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [developmentMode, role, state.interviews, state.candidates, state.jobs, state.agencies, state.users, state.interviewCriteria, user?.agencyId, user?.id, agencyId]);

  useEffect(() => {
    if (!agencyId) return;
    if (developmentMode) {
      setInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER' && item.active && item.agencyId === agencyId));
      setCriteria(state.interviewCriteria.filter((item) => item.agencyId === agencyId && item.active));
      return;
    }
    if (role === 'ADMIN') {
      Promise.all([
        apiFetch<User[]>('/agencies/' + agencyId + '/users'),
        apiFetch<InterviewCriterion[]>('/agencies/' + agencyId + '/interview-criteria'),
      ])
        .then(([users, criterionResult]) => {
          setInterviewers(users.filter((item) => item.role === 'INTERVIEWER' && item.active));
          setCriteria(criterionResult.filter((item) => item.active));
        })
        .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Unable to load agency interview setup.'));
    } else if (role === 'AGENCY') {
      apiFetch<InterviewCriterion[]>('/agencies/' + agencyId + '/interview-criteria')
        .then((result) => setCriteria(result.filter((item) => item.active)))
        .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Unable to load interview criteria.'));
    }
  }, [agencyId, developmentMode, role, state.users, state.interviewCriteria]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = role === 'INTERVIEWER'
      ? interviews
      : role === 'INTERVIEWEE'
        ? interviews
        : interviews;
    if (!query) return base;
    return base.filter((interview) => {
      const candidate = interview.candidate ?? candidates.find((item) => item.id === interview.candidateId);
      const job = interview.job ?? jobs.find((item) => item.id === interview.jobId);
      const panelNames = interview.panel?.map((item) => item.user.name) ?? [];
      return [candidate?.name ?? '', candidate?.reference ?? '', candidate?.profession ?? '', job?.title ?? '', job?.location ?? '', interview.type, interview.status, ...panelNames]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [candidates, interviews, jobs, role, search]);

  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.agencyId === agencyId && !['PASSED', 'REJECTED', 'HIRED', 'INACTIVE'].includes(candidate.status)),
    [agencyId, candidates],
  );

  const availableJobs = useMemo(
    () => jobs.filter((job) => job.agencyId === agencyId && job.status !== 'CLOSED'),
    [agencyId, jobs],
  );

  const closeScheduleForm = () => {
    setShowScheduleForm(false);
    setEditingInterviewId(null);
    setForm(defaultForm);
    setCandidateId('');
    setJobId('');
    setPanel([]);
  };

  const openScheduleForm = () => {
    const firstCandidate = availableCandidates[0];
    const firstInterviewer = interviewers[0];
    setEditingInterviewId(null);
    setForm(defaultForm);
    setCandidateId(firstCandidate?.id ?? '');
    setJobId('');
    setPanel(firstInterviewer ? [firstInterviewer.id] : []);
    setShowScheduleForm(true);
    setEvaluationFor(null);
    setError('');
    setSuccess('');
  };

  const openReschedule = (interview: InterviewRecord) => {
    setEditingInterviewId(interview.id);
    setCandidateId(interview.candidateId);
    setJobId(interview.jobId ?? '');
    setForm({
      scheduledAt: toDateTimeLocal(interview.scheduledAt),
      type: interview.type,
      durationMins: String(interview.durationMins),
      location: interview.location ?? '',
      notes: '',
    });
    setInterviewers((current) => {
      const known = new Set(current.map((item) => item.id));
      const missing = (interview.panel ?? []).map((item) => ({ id: item.userId, agencyId, candidateId: null, name: item.user.name, email: item.user.email, role: 'INTERVIEWER' as const, active: item.user.active })).filter((item) => !known.has(item.id));
      return [...current, ...missing];
    });
    setPanel(interview.panel?.map((item) => item.userId) ?? interview.panelUserIds);
    setShowScheduleForm(true);
    setError('');
    setSuccess('');
  };

  const saveSchedule = async () => {
    if (!candidateId || panel.length === 0) {
      setError('Select a candidate and at least one interviewer.');
      return;
    }
    if (!form.scheduledAt) {
      setError('Interview date and time are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const scheduledAt = new Date(form.scheduledAt).toISOString();
      if (editingInterviewId) {
        const updated = developmentMode
          ? {
              ...interviews.find((item) => item.id === editingInterviewId)!,
              type: form.type,
              scheduledAt,
              durationMins: Math.max(15, Number(form.durationMins) || 30),
              location: form.location.trim() || null,
              panelUserIds: panel,
            }
          : await apiFetch<InterviewRecord>('/interviews/' + editingInterviewId, {
              method: 'PATCH',
              body: JSON.stringify({
                type: form.type,
                scheduledAt,
                durationMins: Math.max(15, Number(form.durationMins) || 30),
                location: form.location.trim() || null,
                notes: form.notes.trim() || null,
                interviewerIds: panel,
              }),
            });

        if (developmentMode) dispatch({ type: 'UPDATE_INTERVIEW', interview: updated });
        setInterviews((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
        closeScheduleForm();
        setSuccess('Interview schedule updated.');
        return;
      }

      const draft: Interview = {
        id: 'interview-' + Date.now(),
        candidateId,
        jobId: jobId || null,
        type: form.type,
        status: 'SCHEDULED',
        scheduledAt,
        durationMins: Math.max(15, Number(form.durationMins) || 30),
        location: form.location.trim() || null,
        panelUserIds: panel,
      };

      const created = developmentMode
        ? draft
        : await apiFetch<InterviewRecord>('/candidates/' + candidateId + '/interviews', {
            method: 'POST',
            body: JSON.stringify({
              jobId: jobId || null,
              type: form.type,
              scheduledAt,
              durationMins: Math.max(15, Number(form.durationMins) || 30),
              location: form.location.trim() || null,
              notes: form.notes.trim() || null,
              interviewerIds: panel,
            }),
          });

      if (developmentMode) dispatch({ type: 'SCHEDULE_INTERVIEW', interview: draft });
      setInterviews((current) => [created, ...current]);
      closeScheduleForm();
      setSuccess('Candidate assigned to the interview successfully.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to schedule the interview.');
    } finally {
      setSaving(false);
    }
  };

  const changeInterviewStatus = async (interview: InterviewRecord, status: 'CANCELLED' | 'NO_SHOW') => {
    setError('');
    try {
      const updated = developmentMode
        ? { ...interview, status }
        : await apiFetch<InterviewRecord>('/interviews/' + interview.id, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (developmentMode) dispatch({ type: 'SET_INTERVIEW_STATUS', interviewId: interview.id, status });
      setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, ...updated } : item));
      setSuccess('Interview marked ' + statusLabel(status).toLowerCase() + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the interview.');
    }
  };

  const startEvaluation = (interview: InterviewRecord) => {
    setEvaluationFor(interview.id);
    const drafts: Record<string, string> = {};
    for (const criterion of criteria) drafts[criterion.id] = '0';
    setScoreDrafts(drafts);
    setEvaluationComments('');
    setError('');
  };

  const submitEvaluation = async (interview: InterviewRecord) => {
    if (!criteria.length) {
      setError('No active interview criteria are configured for this agency. Ask an administrator to add criteria.');
      return;
    }
    const scores = criteria.map((criterion) => ({ criterionId: criterion.id, points: Number(scoreDrafts[criterion.id] ?? 0) }));
    if (scores.some((score) => !Number.isInteger(score.points) || score.points < 0 || score.points > (criteria.find((item) => item.id === score.criterionId)?.maxPoints ?? 0))) {
      setError('Every score must be a whole number within the criterion maximum.');
      return;
    }

    setEvaluating(true);
    setError('');
    try {
      if (developmentMode) {
        dispatch({ type: 'SET_INTERVIEW_STATUS', interviewId: interview.id, status: 'COMPLETED' });
        setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, status: 'COMPLETED' } : item));
      } else {
        const result = await apiFetch<{ interviewCompleted: boolean }>('/interviews/' + interview.id + '/evaluations', {
          method: 'POST',
          body: JSON.stringify({ scores, comments: evaluationComments.trim() || null }),
        });
        if (result.interviewCompleted) {
          setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, status: 'COMPLETED' } : item));
        }
      }
      setEvaluationFor(null);
      setSuccess('Interview criteria scores submitted.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit interview evaluation.');
    } finally {
      setEvaluating(false);
    }
  };

  const updateCandidateStatus = async (candidate: Candidate) => {
    const status = statusDrafts[candidate.id];
    if (!status) return;
    try {
      const updated = developmentMode
        ? { ...candidate, status, statusUpdatedAt: new Date().toISOString() }
        : await apiFetch<Candidate>('/candidates/' + candidate.id, {
            method: 'PATCH',
            body: JSON.stringify({ status, statusReason: statusReasons[candidate.id]?.trim() || null }),
          });
      if (developmentMode) dispatch({ type: 'SET_CANDIDATE_STATUS', candidateId: candidate.id, status });
      setCandidates((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess('Candidate "' + candidate.name + '" is now ' + statusLabel(status) + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update candidate status.');
    }
  };

  const candidateFor = (interview: InterviewRecord) =>
    interview.candidate ?? candidates.find((item) => item.id === interview.candidateId);

  const jobFor = (interview: InterviewRecord) =>
    interview.job ?? jobs.find((item) => item.id === interview.jobId);

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'ADMIN' ? 'All agency operations' : role === 'INTERVIEWER' ? 'Interview desk' : role === 'INTERVIEWEE' ? 'Candidate portal' : 'Recruitment operations'}
        title={role === 'INTERVIEWER' ? 'My Interviews' : role === 'INTERVIEWEE' ? 'My Interviews' : 'Interviews'}
        description={role === 'INTERVIEWER' ? 'Complete the assigned interview criteria and submit your scorecard.' : role === 'INTERVIEWEE' ? 'Review your assigned interview schedule.' : 'Assign candidates directly from the candidate pool, schedule interview panels, score criteria, and complete the final candidate status.'}
        action={role === 'ADMIN' || role === 'AGENCY' ? <Button onClick={openScheduleForm}>Assign candidate</Button> : undefined}
      />

      {role === 'ADMIN' && (
        <Card>
          <FormField label="Agency workspace" hint="Admin can operate the complete recruitment workflow on behalf of any agency.">
            <select className="field-input" value={agencyId} onChange={(event) => { setAgencyId(event.target.value); setPanel([]); }}>
              <option value="">Select an agency</option>
              {agencies.filter((item) => item.status === 'ACTIVE').map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
            </select>
          </FormField>
        </Card>
      )}

      {error && <StateMessage kind="error" title="Interview action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}
      {loading && <StateMessage kind="loading" title="Loading interviews" description="Fetching the latest interview schedule." />}

      {showScheduleForm && role !== 'INTERVIEWER' && role !== 'INTERVIEWEE' && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-950">{editingInterviewId ? 'Reschedule interview' : 'Assign candidate to interview'}</h2>
              <p className="mt-1 text-xs text-slate-400">An interview belongs directly to a candidate. A job is optional context.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={closeScheduleForm}>Close</Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField label="Candidate">
              <select className="field-input" value={candidateId} disabled={Boolean(editingInterviewId)} onChange={(event) => setCandidateId(event.target.value)}>
                <option value="">Select candidate</option>
                {availableCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.reference} — {candidate.name} · {statusLabel(candidate.status)}</option>)}
              </select>
            </FormField>
            <FormField label="Job / position" hint="Optional">
              <select className="field-input" value={jobId} onChange={(event) => setJobId(event.target.value)}>
                <option value="">No specific job</option>
                {availableJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            </FormField>
            <FormField label="Interview type">
              <select className="field-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as InterviewType })}>
                <option value="SCREENING">Screening</option>
                <option value="TECHNICAL">Technical</option>
                <option value="PRACTICAL">Practical</option>
                <option value="FINAL">Final</option>
              </select>
            </FormField>
            <FormField label="Date & time">
              <input type="datetime-local" className="field-input" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} />
            </FormField>
            <FormField label="Duration (minutes)">
              <input type="number" min="15" max="480" className="field-input" value={form.durationMins} onChange={(event) => setForm({ ...form, durationMins: event.target.value })} />
            </FormField>
            <FormField label="Location">
              <input className="field-input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Interview room / online" />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Interviewers" hint="Select one or more active interviewers from the candidate's agency.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {interviewers.map((interviewer) => (
                    <label key={interviewer.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                      <input type="checkbox" checked={panel.includes(interviewer.id)} onChange={(event) => setPanel((current) => event.target.checked ? [...new Set([...current, interviewer.id])] : current.filter((id) => id !== interviewer.id))} />
                      <span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{interviewer.name}</span><span className="block truncate text-[10px] text-slate-400">{interviewer.email}</span></span>
                    </label>
                  ))}
                </div>
                {!interviewers.length && <p className="mt-2 text-xs text-amber-600">No active interviewers are configured for this agency.</p>}
              </FormField>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeScheduleForm}>Cancel</Button>
            <Button disabled={saving || !agencyId} onClick={() => void saveSchedule()}>{saving ? 'Saving…' : editingInterviewId ? 'Save schedule' : 'Assign & schedule'}</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="field-label">Interview search</p>
            <p className="mt-1 text-xs text-slate-400">Search by candidate, job, interviewer, type, or status.</p>
          </div>
          <input className="field-input w-full sm:max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search interviews…" />
        </div>
      </Card>

      {!loading && visible.length === 0 && <StateMessage kind="empty" title="No interviews" description={role === 'INTERVIEWER' ? 'Assigned interviews will appear here.' : role === 'INTERVIEWEE' ? 'Your interview schedule will appear here.' : 'Assign a candidate from the candidate pool to start an interview.'} />}

      {!loading && visible.length > 0 && (
        <div className="grid gap-4">
          {visible.map((interview) => {
            const candidate = candidateFor(interview);
            const job = jobFor(interview);
            const alreadyEvaluated = Boolean(interview.evaluations?.length);
            const isAssignedInterviewer = role === 'INTERVIEWER';
            const currentStatus = candidate?.status;

            return (
              <Card key={interview.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black text-slate-950">{candidate?.name ?? interview.candidateId}</h2>
                      <StatusPill value={interview.status} />
                      {candidate?.status && <StatusPill value={candidate.status} />}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-cyan-700">{candidate?.reference ?? 'Candidate'} {job ? '· ' + job.title : '· General interview'}</p>
                    <p className="mt-2 text-sm text-slate-600">{new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMins} min · {interview.type}</p>
                    <p className="mt-1 text-xs text-slate-400">{interview.location ?? 'Location not specified'}</p>
                  </div>
                  {(role === 'ADMIN' || role === 'AGENCY') && interview.status === 'SCHEDULED' && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openReschedule(interview)}>Reschedule</Button>
                      <Button size="sm" variant="secondary" onClick={() => void changeInterviewStatus(interview, 'NO_SHOW')}>No show</Button>
                      <Button size="sm" variant="danger" onClick={() => void changeInterviewStatus(interview, 'CANCELLED')}>Cancel</Button>
                    </div>
                  )}
                  {isAssignedInterviewer && interview.status === 'SCHEDULED' && !alreadyEvaluated && (
                    <Button size="sm" onClick={() => startEvaluation(interview)}>Evaluate</Button>
                  )}
                </div>

                {interview.panel && interview.panel.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {interview.panel.map((participant) => <span key={participant.userId} className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600">{participant.user.name}{participant.user.active ? '' : ' · inactive'}</span>)}
                  </div>
                )}

                {evaluationFor === interview.id && (
                  <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><h3 className="text-sm font-black text-slate-950">Interview scorecard</h3><p className="mt-1 text-xs text-slate-500">Score every active criterion for this agency.</p></div>
                      <Button size="sm" variant="secondary" onClick={() => setEvaluationFor(null)}>Close</Button>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {criteria.map((criterion) => (
                        <div key={criterion.id} className="rounded-xl border border-white bg-white p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="text-xs font-extrabold text-slate-900">{criterion.name}</p><p className="mt-1 text-[10px] text-slate-400">{criterion.description ?? 'No description.'}</p></div>
                            <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400">/ {criterion.maxPoints}</span><input type="number" min="0" max={criterion.maxPoints} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-bold outline-none focus:border-cyan-500" value={scoreDrafts[criterion.id] ?? '0'} onChange={(event) => setScoreDrafts((current) => ({ ...current, [criterion.id]: event.target.value }))} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormField label="Comments">
                      <textarea className="field-input min-h-24 resize-y" value={evaluationComments} onChange={(event) => setEvaluationComments(event.target.value)} placeholder="Interview observations, strengths, concerns…" />
                    </FormField>
                    <div className="mt-4 flex justify-end"><Button disabled={evaluating} onClick={() => void submitEvaluation(interview)}>{evaluating ? 'Submitting…' : 'Submit scorecard'}</Button></div>
                  </div>
                )}

                {(role === 'ADMIN' || role === 'AGENCY') && interview.status === 'COMPLETED' && candidate && currentStatus && !candidateFinalStatuses.includes(currentStatus) && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">Final candidate status</h3>
                      <p className="mt-1 text-xs text-slate-400">Review the completed scorecard, then update the candidate's lifecycle status.</p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
                      <FormField label="Status">
                        <select className="field-input" value={statusDrafts[candidate.id] ?? ''} onChange={(event) => setStatusDrafts((current) => ({ ...current, [candidate.id]: event.target.value as CandidateStatus }))}>
                          <option value="">Select final status</option>
                          {candidateFinalStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Reason" hint="Optional">
                        <input className="field-input" value={statusReasons[candidate.id] ?? ''} onChange={(event) => setStatusReasons((current) => ({ ...current, [candidate.id]: event.target.value }))} placeholder="Reason or decision note" />
                      </FormField>
                      <Button disabled={!statusDrafts[candidate.id]} onClick={() => void updateCandidateStatus(candidate)}>Update status</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
