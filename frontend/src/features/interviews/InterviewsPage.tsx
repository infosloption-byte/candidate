import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { Pagination } from '../../shared/components/Pagination';
import { StateMessage } from '../../shared/components/StateMessage';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, CandidateStatus, Interview, InterviewCriterion, InterviewType, Job, User, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

type InterviewRecord = Interview;

const candidateFinalStatuses: CandidateStatus[] = ['PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'];
const INTERVIEWS_PAGE_SIZE = 10;

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

interface InterviewDetail extends Omit<Interview, 'evaluations'> {
  notes?: string | null;
  evaluations?: Array<{
    id: string;
    interviewerId: string;
    comments: string | null;
    interviewer: { id: string; name: string; email: string };
    scores: Array<{
      criterionId: string;
      points: number;
      criterion: { id: string; name: string; maxPoints: number } | null;
    }>;
  }>;
}

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
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [jobId, setJobId] = useState('');
  const [panel, setPanel] = useState<string[]>([]);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<InterviewType | ''>('');
  const [sortBy, setSortBy] = useState<'date' | 'candidate' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [listView, setListView] = useState<'cards' | 'table'>('cards');
  const [interviewPage, setInterviewPage] = useState(1);
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
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

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

    const requests: [
      Promise<InterviewRecord[]>,
      Promise<Candidate[]>,
      Promise<Job[]>,
      Promise<Agency[]>,
      Promise<User[]>,
    ] = [
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
    const base = interviews.filter((interview) => {
      const linkedCandidate = candidates.find((item) => item.id === interview.candidateId);
      const candidate = interview.candidate ?? linkedCandidate;
      const job = interview.job ?? jobs.find((item) => item.id === interview.jobId);
      const panelNames = interview.panel?.map((item) => item.user?.name ?? '') ?? [];
      const matchesSearch = !query || [
        candidate?.name ?? '',
        candidate?.reference ?? '',
        candidate?.profession ?? '',
        candidate?.email ?? '',
        linkedCandidate?.phone ?? '',
        job?.title ?? '',
        job?.location ?? '',
        interview.type,
        interview.status,
        ...panelNames,
      ].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = !statusFilter || interview.status === statusFilter;
      const matchesType = !typeFilter || interview.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    return [...base].sort((left, right) => {
      const leftCandidate = left.candidate ?? candidates.find((item) => item.id === left.candidateId);
      const rightCandidate = right.candidate ?? candidates.find((item) => item.id === right.candidateId);
      let result = 0;
      if (sortBy === 'date') result = new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
      if (sortBy === 'candidate') result = (leftCandidate?.name ?? left.candidateId).localeCompare(rightCandidate?.name ?? right.candidateId, undefined, { sensitivity: 'base' });
      if (sortBy === 'status') result = left.status.localeCompare(right.status, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [candidates, interviews, jobs, role, search, sortBy, sortDirection, statusFilter, typeFilter]);

  const interviewTotalPages = Math.max(1, Math.ceil(visible.length / INTERVIEWS_PAGE_SIZE));
  const activeInterviewPage = Math.min(interviewPage, interviewTotalPages);
  const paginatedInterviews = useMemo(
    () => visible.slice((activeInterviewPage - 1) * INTERVIEWS_PAGE_SIZE, activeInterviewPage * INTERVIEWS_PAGE_SIZE),
    [activeInterviewPage, visible],
  );

  useEffect(() => {
    setInterviewPage(1);
  }, [search, sortBy, sortDirection, statusFilter, typeFilter]);

  const availableCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.agencyId === agencyId && !['PASSED', 'REJECTED', 'HIRED', 'INACTIVE'].includes(candidate.status)),
    [agencyId, candidates],
  );

  const availableJobs = useMemo(
    () => jobs.filter((job) => job.agencyId === agencyId && job.status !== 'CLOSED'),
    [agencyId, jobs],
  );

  const selectableCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    return availableCandidates.filter((candidate) => {
      if (editingInterviewId && candidate.id === candidateId) return false;
      if (!query) return true;
      return [candidate.name, candidate.reference, candidate.profession ?? '', candidate.email ?? '', candidate.phone ?? '']
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [availableCandidates, candidateSearch, candidateId, editingInterviewId]);

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds((current) => current.includes(id)
      ? current.filter((candidateId) => candidateId !== id)
      : [...current, id]);
  };

  const selectAllVisibleCandidates = () => {
    setSelectedCandidateIds((current) => [...new Set([...current, ...selectableCandidates.map((candidate) => candidate.id)])]);
  };

  const clearCandidateSelection = () => setSelectedCandidateIds([]);

  const closeScheduleForm = () => {
    setShowScheduleForm(false);
    setScheduleModalOpen(false);
    setEditingInterviewId(null);
    setForm(defaultForm);
    setCandidateId('');
    setSelectedCandidateIds([]);
    setCandidateSearch('');
    setJobId('');
    setPanel([]);
  };

  const openScheduleForm = () => {
    const firstInterviewer = interviewers[0];
    setEditingInterviewId(null);
    setForm(defaultForm);
    setCandidateId('');
    setSelectedCandidateIds([]);
    setCandidateSearch('');
    setJobId('');
    setPanel(firstInterviewer ? [firstInterviewer.id] : []);
    setShowScheduleForm(true);
    setScheduleModalOpen(true);
    setEvaluationFor(null);
    setError('');
    setSuccess('');
  };

  const openReschedule = (interview: InterviewRecord) => {
    setEditingInterviewId(interview.id);
    setCandidateId(interview.candidateId);
    setSelectedCandidateIds([]);
    setCandidateSearch('');
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
      const missing = (interview.panel ?? []).filter((item) => item.user).map((item) => ({ id: item.userId, agencyId, candidateId: null, name: item.user!.name, email: item.user!.email, role: 'INTERVIEWER' as const, active: item.user!.active })).filter((item) => !known.has(item.id));
      return [...current, ...missing];
    });
    setPanel(interview.panel?.map((item) => item.userId) ?? interview.panelUserIds);
    setShowScheduleForm(true);
    setScheduleModalOpen(true);
    setError('');
    setSuccess('');
  };

  const saveSchedule = async () => {
    const createIds = selectedCandidateIds;
    if (panel.length === 0) {
      setError('Select at least one interviewer.');
      return;
    }
    if (!form.scheduledAt) {
      setError('Interview date and time are required.');
      return;
    }
    if (!editingInterviewId && createIds.length === 0) {
      setError('Select at least one candidate.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const scheduledAt = new Date(form.scheduledAt).toISOString();
      const durationMins = Math.max(15, Number(form.durationMins) || 30);

      if (editingInterviewId) {
        const updated = developmentMode
          ? {
              ...interviews.find((item) => item.id === editingInterviewId)!,
              type: form.type,
              scheduledAt,
              durationMins,
              location: form.location.trim() || null,
              panelUserIds: panel,
            }
          : await apiFetch<InterviewRecord>('/interviews/' + editingInterviewId, {
              method: 'PATCH',
              body: JSON.stringify({
                type: form.type,
                scheduledAt,
                durationMins,
                location: form.location.trim() || null,
                notes: form.notes.trim() || null,
                interviewerIds: panel,
              }),
            });

        if (developmentMode) dispatch({ type: 'UPDATE_INTERVIEW', interview: updated });
        setInterviews((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));

        if (createIds.length > 0) {
          const additionalStart = new Date(new Date(scheduledAt).getTime() + durationMins * 60_000).toISOString();
          if (developmentMode) {
            const drafts = createIds.map((id, index) => ({
              id: 'interview-' + Date.now() + '-' + index,
              candidateId: id,
              jobId: jobId || null,
              type: form.type,
              status: 'SCHEDULED' as const,
              scheduledAt: new Date(new Date(additionalStart).getTime() + index * durationMins * 60_000).toISOString(),
              durationMins,
              location: form.location.trim() || null,
              panelUserIds: panel,
            }));
            drafts.forEach((draft) => dispatch({ type: 'SCHEDULE_INTERVIEW', interview: draft }));
            setInterviews((current) => [...drafts, ...current]);
          } else {
            const result = await apiFetch<{ importedCount: number; candidates: InterviewRecord[] }>('/interviews/bulk', {
              method: 'POST',
              body: JSON.stringify({
                candidateIds: createIds,
                jobId: jobId || null,
                type: form.type,
                scheduledAt: additionalStart,
                durationMins,
                location: form.location.trim() || null,
                notes: form.notes.trim() || null,
                interviewerIds: panel,
              }),
            });
            setInterviews((current) => [...result.candidates, ...current]);
          }
        }

        closeScheduleForm();
        setSuccess(createIds.length ? 'Interview updated and copied to ' + createIds.length + ' additional candidate(s).' : 'Interview schedule updated.');
        return;
      }

      if (developmentMode) {
        const drafts = createIds.map((id, index) => ({
          id: 'interview-' + Date.now() + '-' + index,
          candidateId: id,
          jobId: jobId || null,
          type: form.type,
          status: 'SCHEDULED' as const,
          scheduledAt: new Date(new Date(scheduledAt).getTime() + index * durationMins * 60_000).toISOString(),
          durationMins,
          location: form.location.trim() || null,
          panelUserIds: panel,
        }));
        drafts.forEach((draft) => dispatch({ type: 'SCHEDULE_INTERVIEW', interview: draft }));
        setInterviews((current) => [...drafts, ...current]);
        closeScheduleForm();
        setSuccess(drafts.length + ' interview(s) created with consecutive time slots.');
      } else {
        const result = await apiFetch<{ importedCount: number; candidates: InterviewRecord[] }>('/interviews/bulk', {
          method: 'POST',
          body: JSON.stringify({
            candidateIds: createIds,
            jobId: jobId || null,
            type: form.type,
            scheduledAt,
            durationMins,
            location: form.location.trim() || null,
            notes: form.notes.trim() || null,
            interviewerIds: panel,
          }),
        });
        setInterviews((current) => [...result.candidates, ...current]);
        closeScheduleForm();
        setSuccess(result.importedCount + ' interview(s) created with consecutive time slots.');
      }
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

  const updateCandidateStatus = async (candidate: Pick<Candidate, 'id' | 'name' | 'status'>) => {
    const status = statusDrafts[candidate.id];
    if (!status) return;
    try {
      const currentCandidate = candidates.find((item) => item.id === candidate.id);
      if (!currentCandidate && developmentMode) {
        throw new Error('The candidate is not available in the local workspace.');
      }
      const updated: Candidate = developmentMode
        ? { ...(currentCandidate as Candidate), status, statusUpdatedAt: new Date().toISOString() }
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

  const openInterviewDetails = async (interview: InterviewRecord) => {
    setDetailFor(interview.id);
    setDetail(interview as InterviewDetail);
    setDetailLoading(!developmentMode);
    setError('');
    if (developmentMode) return;

    try {
      const result = await apiFetch<InterviewDetail>('/interviews/' + interview.id);
      setDetail(result);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load interview details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeInterviewDetails = () => {
    setDetailFor(null);
    setDetail(null);
    setDetailLoading(false);
  };

  const interviewDetailModalOpen = Boolean(detailFor && detail);
  const interviewDetailModalRef = useFocusTrap<HTMLDivElement>({
    enabled: interviewDetailModalOpen,
    onEscape: closeInterviewDetails,
  });
  const scheduleFormTrapRef = useFocusTrap<HTMLDivElement>({
    enabled: scheduleModalOpen,
    onEscape: closeScheduleForm,
  });

  useEffect(() => {
    if (!interviewDetailModalOpen && !scheduleModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [interviewDetailModalOpen, scheduleModalOpen]);

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
        action={role === 'ADMIN' || role === 'AGENCY' ? <Button onClick={openScheduleForm}>Create interview</Button> : undefined}
      />

      {error && <StateMessage kind="error" title="Interview action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}
      {loading && <StateMessage kind="loading" title="Loading interviews" description="Fetching the latest interview schedule." />}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <label className="field-label">Search interviews</label>
            <input className="field-input mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Candidate, job, interviewer, type or status…" />
          </div>

          <button
            type="button"
            className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm md:hidden"
            aria-expanded={mobileFiltersOpen}
            aria-controls="mobile-interview-filters"
            onClick={() => setMobileFiltersOpen((value) => !value)}
          >
            <span>{mobileFiltersOpen ? 'Hide filters' : 'More filters'}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={mobileFiltersOpen ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
            </svg>
          </button>

          <div id="mobile-interview-filters" className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
            {role === 'ADMIN' && (
              <>
                <label className="field-label">Agency</label>
                <SelectMenu
                  value={agencyId}
                  onChange={(value) => { setAgencyId(value); setPanel([]); }}
                  options={[
                    { value: '', label: 'All agencies' },
                    ...agencies.filter((item) => item.status === 'ACTIVE').map((agency) => ({ value: agency.id, label: agency.name })),
                  ]}
                  ariaLabel="Filter by agency"
                  className="mt-1"
                />
              </>
            )}
          </div>

          <div className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
            <label className="field-label">Status</label>
            <SelectMenu
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All statuses' },
                ...['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => ({ value: status, label: statusLabel(status) })),
              ]}
              ariaLabel="Filter by interview status"
              className="mt-1"
            />
          </div>

          <div className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
            <label className="field-label">Interview type</label>
            <SelectMenu
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as InterviewType | '')}
              options={[
                { value: '', label: 'All interview types' },
                { value: 'SCREENING', label: 'Screening' },
                { value: 'TECHNICAL', label: 'Technical' },
                { value: 'PRACTICAL', label: 'Practical' },
                { value: 'FINAL', label: 'Final' },
              ]}
              ariaLabel="Filter by interview type"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className={mobileFiltersOpen ? 'flex items-center gap-2' : 'hidden items-center gap-2 md:flex'}>
            <span className="field-label shrink-0">Sort</span>
            <div className="min-w-32">
              <SelectMenu
                value={sortBy}
                onChange={(value) => setSortBy(value as typeof sortBy)}
                options={[
                  { value: 'date', label: 'Date' },
                  { value: 'candidate', label: 'Candidate' },
                  { value: 'status', label: 'Status' },
                ]}
                ariaLabel="Sort interviews by"
              />
            </div>
            <button type="button" title={sortDirection === 'asc' ? 'Ascending order' : 'Descending order'} aria-label={sortDirection === 'asc' ? 'Switch to descending sort' : 'Switch to ascending sort'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50" onClick={() => setSortDirection((value) => value === 'asc' ? 'desc' : 'asc')}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                {sortDirection === 'asc'
                  ? <path d="M12 19V5m0 0-5 5m5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  : <path d="M12 5v14m0 0-5-5m5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Interview list view">
              <button
                type="button"
                aria-label="Card view"
                aria-pressed={listView === 'cards'}
                title="Card view"
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${listView === 'cards' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setListView('cards')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="14" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Table view"
                aria-pressed={listView === 'table'}
                title="Table view"
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${listView === 'table' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setListView('table')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="5" width="16" height="14" rx="1" />
                  <path d="M4 10h16M10 5v14" />
                </svg>
              </button>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block"><span className="font-black text-slate-800">{visible.length}</span> interview(s)</p>
          </div>
        </div>
      </div>

      {showScheduleForm && role !== 'INTERVIEWER' && role !== 'INTERVIEWEE' && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden p-0 sm:items-center sm:overflow-y-auto sm:p-4" role="presentation">
          <button type="button" aria-label="Close interview form" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={closeScheduleForm} />
          <div ref={scheduleFormTrapRef} role="dialog" aria-modal="true" aria-labelledby="schedule-interview-title" tabIndex={-1} className="relative z-10 flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:my-auto sm:h-auto sm:max-h-[calc(100dvh-4rem)] sm:rounded-3xl sm:border sm:border-slate-200">
            <header className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Interview scheduling</p>
                  <h2 id="schedule-interview-title" className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{editingInterviewId ? 'Edit interview' : 'Create interview'}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Assign candidates, choose the interview setup, then select the panel.</p>
                </div>
                <Button size="sm" variant="secondary" className="px-2.5" onClick={closeScheduleForm}><span className="text-base leading-none sm:hidden" aria-hidden="true">×</span><span className="hidden sm:inline">Close</span></Button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-8 sm:px-6 sm:py-6">
              <div className="grid gap-4 md:grid-cols-2">
                        {editingInterviewId ? (
              <>
                <FormField label="Current candidate">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-xs font-extrabold text-slate-900">{candidateFor(interviews.find((item) => item.id === editingInterviewId) ?? interviews[0]!)?.name ?? candidateId}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{candidateFor(interviews.find((item) => item.id === editingInterviewId) ?? interviews[0]!)?.reference ?? candidateId}</p>
                  </div>
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Also schedule for other candidates" hint="Optional. Selected candidates receive new interviews in consecutive time slots after this interview.">
                    <div className="rounded-2xl border border-slate-200 bg-white">
                      <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
                        <input className="field-input flex-1" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} placeholder="Search candidates to add…" />
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={selectAllVisibleCandidates}>Select visible</Button>
                          <Button size="sm" variant="ghost" onClick={clearCandidateSelection}>Clear</Button>
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto p-2">
                        {selectableCandidates.map((candidate) => (
                          <label key={candidate.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                            <input type="checkbox" checked={selectedCandidateIds.includes(candidate.id)} onChange={() => toggleCandidateSelection(candidate.id)} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-slate-800">{candidate.reference} — {candidate.name}</span>
                              <span className="block truncate text-[10px] text-slate-400">{candidate.profession ?? 'Profession not set'} · {statusLabel(candidate.status)}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500">{selectedCandidateIds.length} additional candidate(s) selected</div>
                    </div>
                  </FormField>
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <FormField label="Candidates" hint="Select one or more candidates. Each candidate receives an individual interview in consecutive time slots starting at the selected time.">
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row">
                      <input className="field-input flex-1" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} placeholder="Search candidates…" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={selectAllVisibleCandidates}>Select visible</Button>
                        <Button size="sm" variant="ghost" onClick={clearCandidateSelection}>Clear</Button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {selectableCandidates.map((candidate) => (
                        <label key={candidate.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                          <input type="checkbox" checked={selectedCandidateIds.includes(candidate.id)} onChange={() => toggleCandidateSelection(candidate.id)} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-slate-800">{candidate.reference} — {candidate.name}</span>
                            <span className="block truncate text-[10px] text-slate-400">{candidate.profession ?? 'Profession not set'} · {statusLabel(candidate.status)}</span>
                          </span>
                        </label>
                      ))}
                      {!selectableCandidates.length && <p className="p-4 text-center text-xs text-slate-400">No candidates match this search.</p>}
                    </div>
                    <div className="border-t border-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500">{selectedCandidateIds.length} candidate(s) selected</div>
                  </div>
                </FormField>
              </div>
            )}
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
              <FormField label="Notes" hint="Optional">
                <textarea className="field-input min-h-20 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Interview instructions or notes…" />
              </FormField>
            </div>
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
              <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4 sm:px-6">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={closeScheduleForm}>Cancel</Button>
                  <Button disabled={saving || !agencyId} onClick={() => void saveSchedule()}>{saving ? 'Saving…' : editingInterviewId ? 'Save schedule' : 'Assign & schedule'}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && visible.length === 0 && <StateMessage kind="empty" title="No interviews" description={role === 'INTERVIEWER' ? 'Assigned interviews will appear here.' : role === 'INTERVIEWEE' ? 'Your interview schedule will appear here.' : 'Assign a candidate from the candidate pool to start an interview.'} />}

      {!loading && visible.length > 0 && listView === 'cards' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paginatedInterviews.map((interview) => {
            const candidate = candidateFor(interview);
            const job = jobFor(interview);
            const alreadyEvaluated = Boolean(interview.evaluations?.length);
            const isAssignedInterviewer = role === 'INTERVIEWER';
            const currentStatus = candidate?.status;

            return (
              <Card key={interview.id} padded={false} className="p-4">
                <div>
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

                  {interview.panel && interview.panel.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {interview.panel.map((participant) => (
                        <span key={participant.userId} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          {participant.user?.name ?? 'Interviewer unavailable'}{participant.user && !participant.user.active ? ' · inactive' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      className="min-h-10 rounded-lg px-2 py-1 text-[9px]"
                      onClick={() => void openInterviewDetails(interview)}
                    >
                      View
                    </Button>
                    {(role === 'ADMIN' || role === 'AGENCY') && interview.status === 'SCHEDULED' && (
                      <>
                        <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" title="Edit interview" onClick={() => openReschedule(interview)}>Edit</Button>
                        <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" title="Mark as no show" onClick={() => void changeInterviewStatus(interview, 'NO_SHOW')}>No show</Button>
                        <Button size="sm" variant="danger" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" title="Cancel interview" onClick={() => void changeInterviewStatus(interview, 'CANCELLED')}>Cancel</Button>
                      </>
                    )}
                    {isAssignedInterviewer && interview.status === 'SCHEDULED' && !alreadyEvaluated && (
                      <Button size="sm" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => startEvaluation(interview)}>Evaluate</Button>
                    )}
                  </div>
                </div>

                {evaluationFor === interview.id && (
                  <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div><h3 className="text-sm font-black text-slate-950">Interview scorecard</h3><p className="mt-1 text-xs text-slate-500">Score every active criterion for this agency.</p></div>
                      <Button size="sm" variant="secondary" onClick={() => setEvaluationFor(null)}>Close</Button>
                    </div>
                    <div className="mt-3 grid gap-2.5">
                      {criteria.map((criterion) => (
                        <div key={criterion.id} className="rounded-xl border border-white bg-white p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="text-xs font-extrabold text-slate-900">{criterion.name}</p><p className="mt-1 text-[10px] text-slate-400">{criterion.description ?? 'No description.'}</p></div>
                            <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400">/ {criterion.maxPoints}</span><input type="number" min="0" max={criterion.maxPoints} className="field-input !mt-0 w-20 px-2 text-sm font-bold" value={scoreDrafts[criterion.id] ?? '0'} onChange={(event) => setScoreDrafts((current) => ({ ...current, [criterion.id]: event.target.value }))} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormField label="Comments">
                      <textarea className="field-input min-h-24 resize-y" value={evaluationComments} onChange={(event) => setEvaluationComments(event.target.value)} placeholder="Interview observations, strengths, concerns…" />
                    </FormField>
                    <div className="mt-3 flex justify-end"><Button disabled={evaluating} onClick={() => void submitEvaluation(interview)}>{evaluating ? 'Submitting…' : 'Submit scorecard'}</Button></div>
                  </div>
                )}

                {(role === 'ADMIN' || role === 'AGENCY') && interview.status === 'COMPLETED' && candidate && currentStatus && !candidateFinalStatuses.includes(currentStatus) && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">Final candidate status</h3>
                      <p className="mt-1 text-xs text-slate-400">Review the completed scorecard, then update the candidate's lifecycle status.</p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.5fr_auto] md:items-end">
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
      {!loading && visible.length > 0 && listView === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Panel</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInterviews.map((interview) => {
                  const candidate = candidateFor(interview);
                  const job = jobFor(interview);
                  const alreadyEvaluated = Boolean(interview.evaluations?.length);
                  const isAssignedInterviewer = role === 'INTERVIEWER';
                  return (
                    <tr key={interview.id} className="align-top text-xs text-slate-700 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-slate-900">{candidate?.name ?? interview.candidateId}</p>
                        <p className="mt-0.5 font-semibold text-cyan-700">{candidate?.reference ?? 'Candidate'}{job ? ' · ' + job.title : ''}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-semibold text-slate-700">{new Date(interview.scheduledAt).toLocaleDateString()}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{new Date(interview.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {interview.durationMins} min</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{statusLabel(interview.type)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusPill value={interview.status} />
                          {candidate?.status && <StatusPill value={candidate.status} />}
                        </div>
                      </td>
                      <td className="max-w-40 px-4 py-3 text-slate-500">{interview.location ?? 'Not specified'}</td>
                      <td className="max-w-44 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {interview.panel?.length ? interview.panel.map((participant) => (
                            <span key={participant.userId} className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-600">{participant.user?.name ?? 'Unavailable'}</span>
                          )) : <span className="text-[10px] text-slate-400">No panel</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button size="sm" variant="primary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => void openInterviewDetails(interview)}>View</Button>
                          {(role === 'ADMIN' || role === 'AGENCY') && interview.status === 'SCHEDULED' && (
                            <>
                              <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => openReschedule(interview)}>Edit</Button>
                              <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => void changeInterviewStatus(interview, 'NO_SHOW')}>No show</Button>
                              <Button size="sm" variant="danger" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => void changeInterviewStatus(interview, 'CANCELLED')}>Cancel</Button>
                            </>
                          )}
                          {isAssignedInterviewer && interview.status === 'SCHEDULED' && !alreadyEvaluated && (
                            <Button size="sm" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => { setListView('cards'); startEvaluation(interview); }}>Evaluate</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {!loading && (
        <Pagination
          page={activeInterviewPage}
          pageSize={INTERVIEWS_PAGE_SIZE}
          total={visible.length}
          onPageChange={setInterviewPage}
        />
      )}

      {detailFor && detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button type="button" aria-label="Close interview details" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={closeInterviewDetails} />
          <div ref={interviewDetailModalRef} role="dialog" aria-modal="true" aria-labelledby="interview-details-title" tabIndex={-1} className="relative z-10 my-auto w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-5">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Interview details</p>
                <h2 id="interview-details-title" className="mt-1 text-xl font-black text-slate-950">{detail.candidate?.name ?? detail.candidateId}</h2>
                <p className="mt-1 text-xs text-slate-500">{detail.candidate?.reference ?? 'Candidate'} · {detail.type} interview · {statusLabel(detail.status)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2"><StatusPill value={detail.status} /><Button size="sm" variant="secondary" onClick={closeInterviewDetails}>Close</Button></div>
            </div>

            {detailLoading && <div className="mt-5"><StateMessage kind="loading" title="Loading interview details" description="Fetching the complete panel and scorecard." /></div>}

            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & time</p><p className="mt-2 text-sm font-bold text-slate-900">{new Date(detail.scheduledAt).toLocaleString()}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</p><p className="mt-2 text-sm font-bold text-slate-900">{detail.durationMins} minutes</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Job</p><p className="mt-2 text-sm font-bold text-slate-900">{detail.job?.title ?? 'General interview'}</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p><p className="mt-2 text-sm font-bold text-slate-900">{detail.location ?? 'Not specified'}</p></div>
            </div>

            {detail.notes && <div className="mt-4 rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-black text-slate-950">Notes</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{detail.notes}</p></div>}

            <div className="mt-5">
              <h3 className="text-sm font-black text-slate-950">Interview panel</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {detail.panel?.length ? detail.panel.map((participant) => (
                  <div key={participant.userId} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-bold text-slate-900">{participant.user?.name ?? 'Interviewer unavailable'}</p>
                    <p className="mt-1 text-xs text-slate-400">{participant.user?.email ?? 'No email'}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">{participant.user?.active === false ? 'Inactive' : 'Active'}</p>
                  </div>
                )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No panel information available.</p>}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-slate-950">Scorecards</h3>
              <div className="mt-3 space-y-3">
                {detail.evaluations?.length ? detail.evaluations.map((evaluation) => {
                  const total = evaluation.scores.reduce((sum, score) => sum + score.points, 0);
                  const max = evaluation.scores.reduce((sum, score) => sum + (score.criterion?.maxPoints ?? 0), 0);
                  return <div key={evaluation.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{evaluation.interviewer.name}</p><p className="text-xs text-slate-400">{evaluation.interviewer.email}</p></div><p className="text-sm font-black text-cyan-700">{total} / {max} {max ? '(' + Math.round((total / max) * 100) + '%)' : ''}</p></div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">{evaluation.scores.map((score) => <div key={evaluation.id + '-' + score.criterionId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"><span className="text-[11px] font-semibold text-slate-600">{score.criterion?.name ?? 'Criterion'}</span><span className="text-xs font-black text-slate-900">{score.points} / {score.criterion?.maxPoints ?? 0}</span></div>)}</div>
                    {evaluation.comments && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{evaluation.comments}</p>}
                  </div>;
                }) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No scorecards submitted yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
