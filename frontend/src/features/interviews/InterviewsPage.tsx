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
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { CandidateProfilePanel } from '../candidates/CandidateProfilePanel';
import { InterviewDetailsModal, type InterviewDetail } from './InterviewDetailsModal';
import { CriterionResponseField } from './CriterionResponseField';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, CandidateStatus, Interview, InterviewCriterionAssignment, InterviewCriterionGroup, InterviewType, Job, User, UserRole } from '../../domain/types';

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

const calculateAge = (birthdate: string, referenceDate = new Date()): number | null => {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(birthdate)
    ? new Date(birthdate + 'T00:00:00Z')
    : new Date(birthdate);
  if (Number.isNaN(normalized.getTime())) return null;
  let age = referenceDate.getUTCFullYear() - normalized.getUTCFullYear();
  const monthDelta = referenceDate.getUTCMonth() - normalized.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && referenceDate.getUTCDate() < normalized.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
};

const isAgeCriterion = (name: string): boolean => {
  const normalized = name.trim().toLowerCase().split(/\s+/).join(' ');
  return normalized === 'age' || normalized === 'age criteria';
};

const buildCriterionSections = (
  assignments: InterviewCriterionAssignment[],
  groups: Array<{ id: string; name: string }>,
  fallbackGroup?: { id: string; name: string } | null,
): Array<{ id: string; name: string; assignments: InterviewCriterionAssignment[] }> => {
  const names = new Map(groups.map((group) => [group.id, group.name]));
  if (fallbackGroup) names.set(fallbackGroup.id, fallbackGroup.name);

  const sections: Array<{ id: string; name: string; assignments: InterviewCriterionAssignment[] }> = [];
  const byId = new Map<string, { id: string; name: string; assignments: InterviewCriterionAssignment[] }>();

  for (const assignment of assignments) {
    const id = assignment.groupId ?? 'ungrouped';
    let section = byId.get(id);
    if (!section) {
      section = { id, name: id === 'ungrouped' ? 'Interview criteria' : (names.get(id) ?? 'Criteria group'), assignments: [] };
      byId.set(id, section);
      sections.push(section);
    }
    section.assignments.push(assignment);
  }
  return sections;
};

const buildCriterionAssignments = (
  groups: InterviewCriterionGroup[],
  groupIds: string[],
  interviewId = 'draft',
): InterviewCriterionAssignment[] => {
  const selected = groupIds.map((id) => groups.find((group) => group.id === id)).filter((group): group is InterviewCriterionGroup => Boolean(group));
  const seen = new Set<string>();
  const assignments: InterviewCriterionAssignment[] = [];
  let sortOrder = 0;
  for (const group of selected) {
    for (const item of group.criteria) {
      if (seen.has(item.criterionId)) continue;
      seen.add(item.criterionId);
      assignments.push({
        id: 'assignment-' + Date.now() + '-' + sortOrder,
        interviewId,
        criterionId: item.criterionId,
        groupId: group.id,
        name: item.criterion.name,
        description: item.criterion.description,
        maxPoints: item.criterion.maxPoints,
        responseType: item.criterion.responseType,
        required: item.criterion.required,
        options: item.criterion.options,
        sortOrder: sortOrder++,
      });
    }
  }
  return assignments;
};


export const InterviewsPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [interviews, setInterviews] = useState<InterviewRecord[]>(developmentMode ? state.interviews : []);
  const [candidates, setCandidates] = useState<Candidate[]>(developmentMode ? state.candidates : []);
  const [jobs, setJobs] = useState<Job[]>(developmentMode ? state.jobs : []);
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [interviewers, setInterviewers] = useState<User[]>(developmentMode ? state.users.filter((item) => item.role === 'INTERVIEWER' && item.active) : []);
  const [criteriaGroups, setCriteriaGroups] = useState<InterviewCriterionGroup[]>(developmentMode ? state.interviewCriterionGroups.filter((item) => item.active) : []);
  const [agencyId, setAgencyId] = useState(user?.role === 'ADMIN' ? '' : (user?.agencyId ?? 'agency-1'));
  const [candidateId, setCandidateId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [jobId, setJobId] = useState('');
  const [criterionGroupIds, setCriterionGroupIds] = useState<string[]>([]);
  const [panel, setPanel] = useState<string[]>([]);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<InterviewType | ''>('');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'upcoming' | 'current' | 'past'>('all');
  const [now, setNow] = useState(() => Date.now());
  const [sortBy, setSortBy] = useState<'date' | 'candidate' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [listView, setListView] = useState<'cards' | 'table'>('cards');
  const [interviewPage, setInterviewPage] = useState(1);
  const [evaluationFor, setEvaluationFor] = useState<string | null>(null);
  const [evaluationMinimized, setEvaluationMinimized] = useState(false);
  const [evaluationMaximized, setEvaluationMaximized] = useState(false);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [selectedOptionsDrafts, setSelectedOptionsDrafts] = useState<Record<string, string[]>>({});
  const [customTagDrafts, setCustomTagDrafts] = useState<Record<string, string>>({});
  const [evaluationComments, setEvaluationComments] = useState('');
  const [evaluationAssignments, setEvaluationAssignments] = useState<InterviewCriterionAssignment[]>([]);
  const [evaluationDetail, setEvaluationDetail] = useState<InterviewDetail | null>(null);
  const [evaluationSummary, setEvaluationSummary] = useState<{ submitted: number; drafts: number; required: number; totalPoints: number; maxPoints: number; averagePercentage: number | null; allSubmitted: boolean } | null>(null);
  const [evaluationStatus, setEvaluationStatus] = useState<'DRAFT' | 'SUBMITTED' | null>(null);
  const [birthdateDraft, setBirthdateDraft] = useState('');
  const [savingBirthdate, setSavingBirthdate] = useState(false);
  const [evaluationLastSaved, setEvaluationLastSaved] = useState<number | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, CandidateStatus>>({});
  const [statusReasons, setStatusReasons] = useState<Record<string, string>>({});
  const [evaluationDecisionMessage, setEvaluationDecisionMessage] = useState('');
  const [evaluationSaving, setEvaluationSaving] = useState(false);
  const [interviewStatusUpdating, setInterviewStatusUpdating] = useState<string | null>(null);
  const [pendingInterviewStatus, setPendingInterviewStatus] = useState<{ interview: InterviewRecord; status: 'CANCELLED' | 'NO_SHOW' } | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [detail, setDetail] = useState<InterviewDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [profileCandidate, setProfileCandidate] = useState<Candidate | null>(null);
  const [profileMinimized, setProfileMinimized] = useState(false);
  const [profileMaximized, setProfileMaximized] = useState(false);

  useEffect(() => {
    if (developmentMode) {
      setInterviews(state.interviews);
      setCandidates(state.candidates);
      setJobs(state.jobs);
      setAgencies(state.agencies);
      setInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER' && item.active));
      setCriteriaGroups([...new Map(state.interviewCriterionGroups.filter((item) => item.active).map((item) => [item.id, item])).values()]);
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
      Promise.resolve([] as User[]),
    ];

    Promise.allSettled(requests)
      .then(([interviewResult, candidateResult, jobResult, agencyResult]) => {
        if (cancelled) return;

        const failures: string[] = [];

        if (interviewResult.status === 'fulfilled') {
          setInterviews(interviewResult.value);
        } else {
          failures.push('Unable to load the interview schedule.');
        }

        if (candidateResult.status === 'fulfilled') {
          setCandidates(candidateResult.value);
        } else if (role !== 'INTERVIEWEE' && role !== 'INTERVIEWER') {
          failures.push('Unable to load candidates.');
        }

        if (jobResult.status === 'fulfilled') {
          setJobs(jobResult.value);
        } else if (role !== 'INTERVIEWEE' && role !== 'INTERVIEWER') {
          failures.push('Unable to load jobs.');
        }

        if (agencyResult.status === 'fulfilled') {
          if (role === 'ADMIN') setAgencies(agencyResult.value);
          if (role === 'ADMIN') {
            const firstAgency = agencyResult.value.find((item) => item.status === 'ACTIVE');
            setAgencyId((current) => current || firstAgency?.id || '');
          }
        } else if (role === 'ADMIN') {
          failures.push('Unable to load agencies.');
        }

        if (failures.length) setError(failures.join(' '));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [developmentMode, role, state.interviews, state.candidates, state.jobs, state.agencies, state.users, state.interviewCriterionGroups, user?.agencyId, user?.id]);

  useEffect(() => {
    if (!agencyId) return;

    if (developmentMode) {
      setInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER' && item.active && (item.agencyId === agencyId || item.agencyId === null)));
      setCriteriaGroups([...new Map(state.interviewCriterionGroups.filter((item) => item.active).map((item) => [item.id, item])).values()]);
      return;
    }

    if (role === 'ADMIN' || role === 'AGENCY') {
      Promise.all([
        apiFetch<User[]>('/interviewers?agencyId=' + encodeURIComponent(agencyId)),
        apiFetch<InterviewCriterionGroup[]>('/interview-criteria-groups'),
      ])
        .then(([users, groupResult]) => {
          setInterviewers(users.filter((item) => item.role === 'INTERVIEWER' && item.active));
          setCriteriaGroups([...new Map(groupResult.filter((item) => item.active).map((item) => [item.id, item])).values()]);
        })
        .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Unable to load interview scoring setup.'));
    }
  }, [agencyId, developmentMode, role, state.users, state.interviewCriterionGroups]);

  const isInterviewStartable = (interview: Interview): boolean => {
    if (interview.status !== 'SCHEDULED') return false;
    const start = new Date(interview.scheduledAt).getTime();
    const end = start + interview.durationMins * 60_000;
    return now >= start - 15 * 60_000 && now <= end;
  };

  const scheduleBucket = (interview: Interview): 'upcoming' | 'current' | 'past' => {
    const start = new Date(interview.scheduledAt).getTime();
    const end = start + interview.durationMins * 60_000;
    if ((interview.status === 'SCHEDULED' || interview.status === 'IN_PROGRESS') && now >= start && now <= end) return 'current';
    return now < start ? 'upcoming' : 'past';
  };

  useEffect(() => {
    if (role !== 'INTERVIEWER') return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [role]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = interviews.filter((interview) => {
      const linkedCandidate = candidates.find((item) => item.id === interview.candidateId);
      const candidate = interview.candidate ?? linkedCandidate;
      const job = interview.job ?? jobs.find((item) => item.id === interview.jobId);
      const searchableRecord = {
        interview,
        candidate,
        linkedCandidate,
        job,
        panel: interview.panel?.map((item) => item.user ?? item),
        evaluations: interview.evaluations,
        criterionGroup: interview.criterionGroup,
        criterionAssignments: interview.criterionAssignments,
      };
      const matchesSearch = !query || JSON.stringify(searchableRecord).toLowerCase().includes(query);
      const matchesStatus = !statusFilter || interview.status === statusFilter;
      const matchesType = !typeFilter || interview.type === typeFilter;
      const matchesSchedule = scheduleFilter === 'all' || role !== 'INTERVIEWER' || scheduleBucket(interview) === scheduleFilter;
      return matchesSearch && matchesStatus && matchesType && matchesSchedule;
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
  }, [candidates, interviews, jobs, now, role, scheduleFilter, search, sortBy, sortDirection, statusFilter, typeFilter]);

  const interviewTotalPages = Math.max(1, Math.ceil(visible.length / INTERVIEWS_PAGE_SIZE));
  const activeInterviewPage = Math.min(interviewPage, interviewTotalPages);
  const paginatedInterviews = useMemo(
    () => visible.slice((activeInterviewPage - 1) * INTERVIEWS_PAGE_SIZE, activeInterviewPage * INTERVIEWS_PAGE_SIZE),
    [activeInterviewPage, visible],
  );

  useEffect(() => {
    setInterviewPage(1);
  }, [search, scheduleFilter, sortBy, sortDirection, statusFilter, typeFilter]);

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
      return [candidate.name, candidate.reference, candidate.passportNumber ?? '', candidate.profession ?? '', candidate.email ?? '', candidate.phone ?? '']
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [availableCandidates, candidateSearch, candidateId, editingInterviewId]);

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds((current) => current.includes(id)
      ? current.filter((candidateId) => candidateId !== id)
      : [...current, id]);
  };

  const moveCriterionGroup = (groupId: string, direction: -1 | 1) => {
    setCriterionGroupIds((current) => {
      const index = current.indexOf(groupId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return next;
    });
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
    setCriterionGroupIds([]);
    setPanel([]);
    setResponseDrafts({});
    setSelectedOptionsDrafts({});
    setCustomTagDrafts({});
  };

  const openScheduleForm = () => {
    const firstInterviewer = interviewers[0];
    const defaultAgencyId = agencyId
      || (role === 'ADMIN' ? agencies.find((item) => item.status === 'ACTIVE')?.id ?? '' : user?.agencyId ?? '');
    setEditingInterviewId(null);
    setAgencyId(defaultAgencyId);
    setForm(defaultForm);
    setCandidateId('');
    setSelectedCandidateIds([]);
    setCandidateSearch('');
    setJobId('');
    setCriterionGroupIds([]);
    setPanel(firstInterviewer ? [firstInterviewer.id] : []);
    setShowScheduleForm(true);
    setScheduleModalOpen(true);
    setEvaluationFor(null);
    setError('');
    setSuccess('');
  };

  const openReschedule = (interview: InterviewRecord) => {
    const interviewAgencyId = interview.candidate?.agencyId
      ?? candidates.find((item) => item.id === interview.candidateId)?.agencyId
      ?? '';
    setEditingInterviewId(interview.id);
    if (interviewAgencyId) setAgencyId(interviewAgencyId);
    setCandidateId(interview.candidateId);
    setSelectedCandidateIds([]);
    setCandidateSearch('');
    setJobId(interview.jobId ?? '');
    const persistedGroupIds = interview.criterionGroupIds?.length
      ? interview.criterionGroupIds
      : interview.criterionGroups?.slice().sort((left, right) => left.sortOrder - right.sortOrder).map((item) => item.id)
        ?? (interview.criterionGroupId ? [interview.criterionGroupId] : []);
    setCriterionGroupIds([...new Set(persistedGroupIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]);
    setForm({
      scheduledAt: toDateTimeLocal(interview.scheduledAt),
      type: interview.type,
      durationMins: String(interview.durationMins),
      location: interview.location ?? '',
      notes: '',
    });
    setInterviewers((current) => {
      const known = new Set(current.map((item) => item.id));
      const missing = (interview.panel ?? []).filter((item) => item.user).map((item) => ({ id: item.userId, agencyId: item.user!.agencyId, candidateId: null, name: item.user!.name, email: item.user!.email, role: 'INTERVIEWER' as const, active: item.user!.active })).filter((item) => !known.has(item.id));
      return [...current, ...missing];
    });
    setPanel(interview.panel?.map((item) => item.userId) ?? interview.panelUserIds);
    setShowScheduleForm(true);
    setScheduleModalOpen(true);
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    if (!evaluationFor) {
      setBirthdateDraft('');
      return;
    }
    const activeInterview = interviews.find((item) => item.id === evaluationFor);
    const candidate = activeInterview ? candidates.find((item) => item.id === activeInterview.candidateId) : undefined;
    setBirthdateDraft(candidate?.birthdate ? candidate.birthdate.slice(0, 10) : '');
  }, [evaluationFor, interviews, candidates]);

  useEffect(() => {
    if (!scheduleModalOpen || !criteriaGroups.length) return;

    const availableIds = new Set(criteriaGroups.map((group) => group.id));
    setCriterionGroupIds((current) => {
      const valid = [...new Set(current.filter((id) => availableIds.has(id)))];
      if (!editingInterviewId && valid.length === 0) {
        return criteriaGroups.map((group) => group.id);
      }
      return valid;
    });
  }, [criteriaGroups, editingInterviewId, scheduleModalOpen]);

  const saveSchedule = async () => {
    const createIds = selectedCandidateIds;
    if (!criterionGroupIds.length) {
      setError('Select at least one interview criteria group before scheduling the interview.');
      return;
    }
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
      const availableGroupIds = new Set(criteriaGroups.map((group) => group.id));
      const normalizedGroupIds = [...new Set(criterionGroupIds.filter((id) => availableGroupIds.has(id)))];
      if (!normalizedGroupIds.length) {
        setCriterionGroupIds([]);
        setError('No selected interview criteria groups are currently available. Select at least one group.');
        return;
      }
      if (normalizedGroupIds.length !== criterionGroupIds.length) {
        setCriterionGroupIds(normalizedGroupIds);
      }
      const selectedGroups = normalizedGroupIds
        .map((id) => criteriaGroups.find((group) => group.id === id))
        .filter((group): group is InterviewCriterionGroup => Boolean(group));
      const selectedGroupViews = selectedGroups.map((group, index) => ({ ...group, sortOrder: index }));

      if (editingInterviewId) {
        const updated = developmentMode
          ? {
              ...interviews.find((item) => item.id === editingInterviewId)!,
              type: form.type,
              scheduledAt,
              durationMins,
              location: form.location.trim() || null,
              panelUserIds: panel,
              criterionGroupId: normalizedGroupIds[0] ?? null,
              criterionGroupIds: normalizedGroupIds,
              criterionGroups: selectedGroupViews,
              criterionAssignments: buildCriterionAssignments(criteriaGroups, normalizedGroupIds, editingInterviewId),
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
                criterionGroupIds: normalizedGroupIds,
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
              criterionGroupId: normalizedGroupIds[0] ?? null,
              criterionGroupIds: normalizedGroupIds,
              criterionGroups: selectedGroupViews,
              criterionAssignments: buildCriterionAssignments(criteriaGroups, normalizedGroupIds, 'draft'),
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
                criterionGroupIds: normalizedGroupIds,
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
          criterionGroupId: normalizedGroupIds[0] ?? null,
          criterionGroupIds: normalizedGroupIds,
          criterionGroups: selectedGroupViews,
          criterionAssignments: buildCriterionAssignments(criteriaGroups, normalizedGroupIds, 'draft'),
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
            criterionGroupIds: normalizedGroupIds,
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

  const requestInterviewStatusChange = (interview: InterviewRecord, status: 'CANCELLED' | 'NO_SHOW') => {
    setError('');
    setPendingInterviewStatus({ interview, status });
  };

  const changeInterviewStatus = async () => {
    if (!pendingInterviewStatus) return;
    const { interview, status } = pendingInterviewStatus;
    const closeWorkspace = evaluationFor === interview.id;

    setError('');
    setInterviewStatusUpdating(interview.id + ':' + status);
    try {
      const updated = developmentMode
        ? { ...interview, status }
        : await apiFetch<InterviewRecord>('/interviews/' + interview.id + '/status', { method: 'POST', body: JSON.stringify({ status }) });
      if (developmentMode) dispatch({ type: 'SET_INTERVIEW_STATUS', interviewId: interview.id, status });
      setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, ...updated } : item));
      setSuccess('Interview marked ' + statusLabel(status).toLowerCase() + '.');
      if (closeWorkspace) {
        setEvaluationFor(null);
        setEvaluationMinimized(false);
        setEvaluationMaximized(false);
      }
      setPendingInterviewStatus(null);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the interview.');
    } finally {
      setInterviewStatusUpdating(null);
    }
  };

  const mergeInterview = (updated: InterviewRecord) => {
    setInterviews((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
    if (developmentMode) dispatch({ type: 'UPDATE_INTERVIEW', interview: updated });
  };

  const initialiseEvaluation = (
    interview: InterviewRecord,
    assignments: InterviewCriterionAssignment[],
    evaluation?: {
      id: string;
      interviewerId: string;
      status: 'DRAFT' | 'SUBMITTED';
      comments: string | null;
      submittedAt: string | null;
      scores: Array<{ criterionId: string; points: number }>;
      responses?: Array<{ criterionId: string; textValue: string | null; selectedOptions: string[] | null }>;
    } | null,
  ) => {
    const own = evaluation ?? interview.evaluations?.find((item) => item.interviewerId === user?.id);
    const scores: Record<string, string> = {};
    const responses: Record<string, string> = {};
    const options: Record<string, string[]> = {};
    const customTags: Record<string, string> = {};
    const candidateBirthdate = interview.candidate?.birthdate ?? candidates.find((item) => item.id === interview.candidateId)?.birthdate;
    const candidateAge = candidateBirthdate ? calculateAge(candidateBirthdate) : null;
    for (const assignment of assignments) {
      const existingScore = own?.scores.find((score) => score.criterionId === assignment.criterionId);
      const existingResponse = own?.responses?.find((response) => response.criterionId === assignment.criterionId);
      scores[assignment.criterionId] = existingScore ? String(existingScore.points) : '';
      responses[assignment.criterionId] = existingResponse?.textValue ?? '';
      if (candidateAge !== null && isAgeCriterion(assignment.name)) {
        responses[assignment.criterionId] = String(candidateAge);
      }
      options[assignment.criterionId] = existingResponse?.selectedOptions ?? [];
      customTags[assignment.criterionId] = '';
    }
    setEvaluationAssignments(assignments);
    setScoreDrafts(scores);
    setResponseDrafts(responses);
    setSelectedOptionsDrafts(options);
    setCustomTagDrafts(customTags);
    setEvaluationComments(own?.comments ?? '');
    setEvaluationStatus(own?.status ?? 'DRAFT');
  };

  const openEvaluationWorkspace = async (interview: InterviewRecord) => {
    setError('');
    setSuccess('');
    setEvaluationFor(interview.id);
    setEvaluationMinimized(false);
    setEvaluationMaximized(false);
    setEvaluationSummary(null);
    setEvaluationDetail(null);
    setEvaluationLastSaved(null);
    setEvaluationDecisionMessage('');

    try {
      if (role !== 'INTERVIEWER') {
        if (interview.status !== 'COMPLETED') {
          setEvaluationFor(null);
          setError('Only completed interviews can be opened in the admin review panel.');
          return;
        }
        if (developmentMode) {
          const current = interviews.find((item) => item.id === interview.id) ?? interview;
          const assignments = current.criterionAssignments ?? buildCriterionAssignments(
            criteriaGroups,
            current.criterionGroupIds ?? current.criterionGroups?.slice().sort((left, right) => left.sortOrder - right.sortOrder).map((item) => item.id) ?? (current.criterionGroupId ? [current.criterionGroupId] : []),
            current.id,
          );
          setEvaluationAssignments(assignments);
          setEvaluationDetail(current as InterviewDetail);
          return;
        }
        const result = await apiFetch<InterviewDetail>('/interviews/' + interview.id);
        setEvaluationDetail(result);
        setEvaluationAssignments(result.criterionAssignments ?? []);
        return;
      }

      if (developmentMode) {
        let current = interviews.find((item) => item.id === interview.id) ?? interview;
        if (current.status === 'SCHEDULED') {
          current = { ...current, status: 'IN_PROGRESS', startedAt: new Date().toISOString() };
          mergeInterview(current);
        }
        const assignments = current.criterionAssignments ?? buildCriterionAssignments(
          criteriaGroups,
          current.criterionGroupIds ?? current.criterionGroups?.slice().sort((left, right) => left.sortOrder - right.sortOrder).map((item) => item.id) ?? (current.criterionGroupId ? [current.criterionGroupId] : []),
          current.id,
        );
        initialiseEvaluation(current, assignments);
        const ownEvaluation = current.evaluations?.find((item) => item.interviewerId === user?.id);
        const total = assignments.reduce((sum, item) => sum + (ownEvaluation?.scores.find((score) => score.criterionId === item.criterionId)?.points ?? 0), 0);
        setEvaluationSummary({ submitted: ownEvaluation?.status === 'SUBMITTED' ? 1 : 0, drafts: ownEvaluation?.status === 'DRAFT' ? 1 : 0, required: current.panel?.length ?? current.panelUserIds.length, totalPoints: total, maxPoints: assignments.reduce((sum, item) => sum + item.maxPoints, 0), averagePercentage: null, allSubmitted: false });
        return;
      }

      let current = interview;
      if (current.status === 'SCHEDULED') {
        current = await apiFetch<InterviewRecord>('/interviews/' + interview.id + '/start', { method: 'POST' });
        mergeInterview(current);
      }
      const result = await apiFetch<{
        interview: InterviewRecord;
        assignments: InterviewCriterionAssignment[];
        evaluation: { id: string; interviewerId: string; status: 'DRAFT' | 'SUBMITTED'; comments: string | null; submittedAt: string | null; scores: Array<{ criterionId: string; points: number }>; responses?: Array<{ criterionId: string; textValue: string | null; selectedOptions: string[] | null }> } | null;
        summary: { submitted: number; drafts: number; required: number; totalPoints: number; maxPoints: number; averagePercentage: number | null; allSubmitted: boolean };
      }>('/interviews/' + interview.id + '/evaluation');
      initialiseEvaluation(result.interview, result.assignments, result.evaluation as never);
      setEvaluationSummary(result.summary);
    } catch (requestError: unknown) {
      setEvaluationFor(null);
      setError(requestError instanceof Error ? requestError.message : 'Unable to open the interview scorecard.');
    }
  };

  const saveEvaluationDraft = async (interviewId: string, silent = false): Promise<boolean> => {
    if (!evaluationAssignments.length || evaluationStatus === 'SUBMITTED') return false;
    const scores = evaluationAssignments
      .filter((assignment) => scoreDrafts[assignment.criterionId] !== '')
      .map((assignment) => ({ criterionId: assignment.criterionId, points: Number(scoreDrafts[assignment.criterionId]) }));
    const responses = evaluationAssignments
      .map((assignment) => ({
        criterionId: assignment.criterionId,
        textValue: assignment.responseType === 'MULTI_SELECT' ? null : (responseDrafts[assignment.criterionId]?.trim() || null),
        selectedOptions: assignment.responseType === 'MULTI_SELECT' ? (selectedOptionsDrafts[assignment.criterionId] ?? []) : null,
      }))
      .filter((response) => response.textValue !== null || (response.selectedOptions?.length ?? 0) > 0);

    if (scores.some((score) => !Number.isInteger(score.points) || score.points < 0 || score.points > (evaluationAssignments.find((item) => item.criterionId === score.criterionId)?.maxPoints ?? 0))) {
      if (!silent) setError('Every score must be a whole number within the criterion maximum.');
      return false;
    }

    setEvaluationSaving(true);
    try {
      if (developmentMode) {
        const interview = interviews.find((item) => item.id === interviewId);
        if (interview) {
          const ownId = user?.id ?? 'dev-interviewer';
          const draftEvaluation = {
            id: interview.evaluations?.find((item) => item.interviewerId === ownId)?.id ?? 'evaluation-' + Date.now(),
            interviewId,
            interviewerId: ownId,
            status: 'DRAFT' as const,
            comments: evaluationComments.trim() || null,
            submittedAt: null,
            scores,
            responses,
          };
          mergeInterview({ ...interview, evaluations: [...(interview.evaluations ?? []).filter((item) => item.interviewerId !== ownId), draftEvaluation] });
        }
      } else {
        const result = await apiFetch<{
          evaluation: { id: string; interviewerId: string; status: 'DRAFT' | 'SUBMITTED'; comments: string | null; submittedAt: string | null; scores: Array<{ criterionId: string; points: number }>; responses: Array<{ criterionId: string; textValue: string | null; selectedOptions: string[] | null }> };
          assignments: InterviewCriterionAssignment[];
          summary: { submitted: number; drafts: number; required: number; totalPoints: number; maxPoints: number; averagePercentage: number | null; allSubmitted: boolean };
        }>('/interviews/' + interviewId + '/evaluation', {
          method: 'PUT',
          body: JSON.stringify({ scores, responses, comments: evaluationComments.trim() || null }),
        });
        setEvaluationStatus(result.evaluation.status);
        setEvaluationSummary(result.summary);
      }
      setEvaluationLastSaved(Date.now());
      if (!silent) setSuccess('Scorecard saved.');
    } catch (requestError: unknown) {
      if (!silent) setError(requestError instanceof Error ? requestError.message : 'Unable to save the scorecard.');
      return false;
    } finally {
      setEvaluationSaving(false);
    }
    return true;
  };

  useEffect(() => {
    if (!evaluationFor || role !== 'INTERVIEWER' || evaluationStatus !== 'DRAFT' || !evaluationAssignments.length) return;
    const timer = window.setTimeout(() => { void saveEvaluationDraft(evaluationFor, true); }, 800);
    return () => window.clearTimeout(timer);
  }, [customTagDrafts, evaluationAssignments, evaluationComments, evaluationFor, evaluationStatus, responseDrafts, scoreDrafts, selectedOptionsDrafts]);

  const submitEvaluation = async (interview: InterviewRecord) => {
    if (!evaluationAssignments.length) {
      setError('This interview has no criteria assigned. Ask the scheduler to select at least one criteria group.');
      return;
    }
    const missingRequired = evaluationAssignments.filter((assignment) => {
      if (!assignment.required) return false;
      const missingScore = scoreDrafts[assignment.criterionId] === '';
      const missingAnswer = assignment.responseType === 'MULTI_SELECT'
        ? !(selectedOptionsDrafts[assignment.criterionId]?.length)
        : !responseDrafts[assignment.criterionId]?.trim();
      return missingScore || missingAnswer;
    });
    if (missingRequired.length) {
      setError('Complete the required criteria before submitting: ' + missingRequired.map((item) => item.name).join(', ') + '.');
      return;
    }

    setEvaluating(true);
    setError('');
    let closeAfterSubmit = false;
    try {
      const saved = await saveEvaluationDraft(interview.id);
      if (!saved) return;
      if (developmentMode) {
        const ownId = user?.id ?? 'dev-interviewer';
        const updated = interviews.find((item) => item.id === interview.id);
        if (updated) {
          const submittedAt = new Date().toISOString();
          const ownEvaluation = updated.evaluations?.find((item) => item.interviewerId === ownId);
          const ownEvaluationSubmitted = {
            id: ownEvaluation?.id ?? 'evaluation-' + Date.now(),
            interviewId: interview.id,
            interviewerId: ownId,
            status: 'SUBMITTED' as const,
            comments: evaluationComments.trim() || null,
            submittedAt,
            scores: evaluationAssignments.filter((assignment) => scoreDrafts[assignment.criterionId] !== '').map((assignment) => ({ criterionId: assignment.criterionId, points: Number(scoreDrafts[assignment.criterionId]) })),
            responses: evaluationAssignments.map((assignment) => ({
              criterionId: assignment.criterionId,
              textValue: assignment.responseType === 'MULTI_SELECT' ? null : (responseDrafts[assignment.criterionId]?.trim() || null),
              selectedOptions: assignment.responseType === 'MULTI_SELECT' ? (selectedOptionsDrafts[assignment.criterionId] ?? []) : null,
            })).filter((response) => response.textValue !== null || (response.selectedOptions?.length ?? 0) > 0),
          };
          const allEvaluations = [...(updated.evaluations ?? []).filter((item) => item.interviewerId !== ownId), ownEvaluationSubmitted];
          const requiredPanelSize = updated.panel?.length ?? updated.panelUserIds.length;
          const completed = allEvaluations.filter((item) => item.status === 'SUBMITTED').length >= requiredPanelSize;
          mergeInterview({ ...updated, status: completed ? 'COMPLETED' : 'IN_PROGRESS', completedAt: completed ? submittedAt : updated.completedAt, evaluations: allEvaluations });
          closeAfterSubmit = completed;
        }
        setEvaluationStatus('SUBMITTED');
      } else {
        const result = await apiFetch<{ interviewCompleted: boolean; evaluation: { status: 'SUBMITTED' }; summary: typeof evaluationSummary }>('/interviews/' + interview.id + '/evaluation/submit', { method: 'POST' });
        setEvaluationStatus('SUBMITTED');
        if (result.summary) setEvaluationSummary(result.summary);
        closeAfterSubmit = result.interviewCompleted;
        setInterviews((current) => current.map((item) => item.id === interview.id ? { ...item, status: result.interviewCompleted ? 'COMPLETED' : item.status, completedAt: result.interviewCompleted ? new Date().toISOString() : item.completedAt } : item));
      }
      setEvaluationLastSaved(Date.now());
      if (closeAfterSubmit) {
        setEvaluationFor(null);
        setEvaluationMinimized(false);
        setEvaluationMaximized(false);
      }
      setSuccess('Interview scorecard submitted.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit the interview scorecard.');
    } finally {
      setEvaluating(false);
    }
  };

  const saveCandidateBirthdate = async (candidate: Pick<Candidate, 'id' | 'birthdate'> | undefined) => {
    if (!candidate) return;
    const age = birthdateDraft ? calculateAge(birthdateDraft) : null;
    if (!birthdateDraft || age === null) {
      setError('Enter a valid birthdate that is not in the future.');
      return;
    }

    setSavingBirthdate(true);
    setError('');
    try {
      const updated: Candidate = developmentMode
        ? { ...candidate, birthdate: birthdateDraft }
        : await apiFetch<Candidate>('/candidates/' + candidate.id + '/birthdate', {
            method: 'PATCH',
            body: JSON.stringify({ birthdate: birthdateDraft }),
          });

      setCandidates((current) => current.map((item) => item.id === updated.id ? updated : item));
      setInterviews((current) => current.map((item) => item.candidateId === updated.id
        ? { ...item, candidate: item.candidate ? { ...item.candidate, ...updated } : item.candidate }
        : item));
      setEvaluationDetail((current) => current
        ? { ...current, candidate: current.candidate ? { ...current.candidate, ...updated } : current.candidate }
        : current);

      setResponseDrafts((current) => {
        const next = { ...current };
        for (const assignment of evaluationAssignments) {
          if (isAgeCriterion(assignment.name)) next[assignment.criterionId] = String(age);
        }
        return next;
      });
      setSuccess('Candidate birthdate saved and Age criteria updated.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the candidate birthdate.');
    } finally {
      setSavingBirthdate(false);
    }
  };

  const updateCandidateStatus = async (candidate: Pick<Candidate, 'id' | 'name' | 'status'>) => {
    const status = statusDrafts[candidate.id];
    if (!status || status === candidate.status) return;

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
      setInterviews((current) => current.map((item) => item.candidateId === updated.id
        ? {
            ...item,
            candidate: item.candidate ? { ...item.candidate, ...updated } : item.candidate,
          }
        : item));

      setStatusDrafts((current) => ({ ...current, [updated.id]: updated.status }));
      const message = 'Decision recorded: ' + updated.name + ' is now ' + statusLabel(updated.status) + '.';
      setEvaluationDecisionMessage(message);
      setSuccess(message);
    } catch (requestError: unknown) {
      setEvaluationDecisionMessage('');
      setError(requestError instanceof Error ? requestError.message : 'Unable to update candidate status.');
    }
  };

  const openInterviewDetails = async (interview: InterviewRecord) => {
    setDetailFor(interview.id);
    setDetail(null);
    setDetailLoading(!developmentMode);
    setError('');
    if (developmentMode) {
      setDetail(interview as InterviewDetail);
      return;
    }

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

  const scheduleCounts = useMemo(() => {
    if (role !== 'INTERVIEWER') return { upcoming: 0, current: 0, past: 0 };
    return interviews.reduce(
      (counts, interview) => {
        const bucket = scheduleBucket(interview);
        counts[bucket] += 1;
        return counts;
      },
      { upcoming: 0, current: 0, past: 0 },
    );
  }, [interviews, now, role]);

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

      {error && <StateMessage kind="error" title="Interview action failed" description={error} floating={showScheduleForm || Boolean(evaluationFor) || Boolean(detailFor) || Boolean(profileCandidate)} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}
      {loading && <StateMessage kind="loading" title="Loading interviews" description="Fetching the latest interview schedule." />}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0">
            <label className="field-label">Search interviews</label>
            <input className="field-input mt-1 w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search any candidate, passport, job, interviewer, status or detail…" />
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
                ...['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((status) => ({ value: status, label: statusLabel(status) })),
              ]}
              ariaLabel="Filter by interview status"
              className="mt-1"
            />
          </div>

          {role === 'INTERVIEWER' && (
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <label className="field-label">Schedule</label>
              <SelectMenu
                value={scheduleFilter}
                onChange={(value) => setScheduleFilter(value as typeof scheduleFilter)}
                options={[
                  { value: 'all', label: 'All interviews' },
                  { value: 'upcoming', label: 'Upcoming (' + scheduleCounts.upcoming + ')' },
                  { value: 'current', label: 'Current (' + scheduleCounts.current + ')' },
                  { value: 'past', label: 'Past (' + scheduleCounts.past + ')' },
                ]}
                ariaLabel="Filter interviewer schedule"
                className="mt-1"
              />
            </div>
          )}

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
                {role === 'ADMIN' && (
                  <div className="md:col-span-2">
                    <FormField label="Agency workspace" hint="Select the agency whose candidate pool you want to schedule from.">
                      <SelectMenu
                        value={agencyId}
                        onChange={(value) => {
                          setAgencyId(value);
                          setPanel([]);
                          setSelectedCandidateIds([]);
                          setCandidateSearch('');
                        }}
                        options={[
                          { value: '', label: 'Select an agency' },
                          ...agencies.filter((item) => item.status === 'ACTIVE').map((agency) => ({ value: agency.id, label: agency.name })),
                        ]}
                        ariaLabel="Select agency workspace for interview scheduling"
                      />
                    </FormField>
                  </div>
                )}
                        {editingInterviewId ? (
              <>
                <FormField label="Current candidate">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-xs font-extrabold text-slate-900">{candidateFor(interviews.find((item) => item.id === editingInterviewId) ?? interviews[0]!)?.name ?? candidateId}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{candidateFor(interviews.find((item) => item.id === editingInterviewId) ?? interviews[0]!)?.reference ?? candidateId} · Passport: {candidateFor(interviews.find((item) => item.id === editingInterviewId) ?? interviews[0]!)?.passportNumber ?? 'Not provided'}</p>
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
                              <span className="block truncate text-[10px] text-slate-400">{candidate.profession ?? 'Profession not set'} · Passport: {candidate.passportNumber ?? 'Not provided'} · {statusLabel(candidate.status)}</span>
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
                      {!agencyId
                        ? <p className="p-4 text-center text-xs text-slate-400">Select an agency workspace to load candidates.</p>
                        : !selectableCandidates.length
                          ? <p className="p-4 text-center text-xs text-slate-400">No candidates match this agency or search.</p>
                          : null}
                    </div>
                    <div className="border-t border-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500">{selectedCandidateIds.length} candidate(s) selected</div>
                  </div>
                </FormField>
              </div>
            )}
            <FormField label="Job / position" hint="Optional">
              <SelectMenu
                value={jobId}
                onChange={setJobId}
                options={[
                  { value: '', label: 'No specific job' },
                  ...availableJobs.map((job) => ({ value: job.id, label: job.title })),
                ]}
                ariaLabel="Select job position"
              />
            </FormField>
            <FormField label="Interview type">
              <SelectMenu
                value={form.type}
                onChange={(value) => setForm({ ...form, type: value as InterviewType })}
                options={[
                  { value: 'SCREENING', label: 'Screening' },
                  { value: 'TECHNICAL', label: 'Technical' },
                  { value: 'PRACTICAL', label: 'Practical' },
                  { value: 'FINAL', label: 'Final' },
                ]}
                ariaLabel="Select interview type"
              />
            </FormField>
            <FormField label="Interview criteria groups" hint="All active groups are selected by default. Group order becomes the section order in the interview panel.">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5">
                {criterionGroupIds.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">Interview group order</p>
                    {criterionGroupIds.map((groupId, index) => {
                      const group = criteriaGroups.find((item) => item.id === groupId);
                      if (!group) return null;
                      const scoreMax = group.criteria.reduce((sum, item) => sum + item.criterion.maxPoints, 0);
                      return (
                        <div key={group.id} className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2.5">
                          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-600 text-[10px] font-black text-white">{index + 1}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold text-slate-800">{group.name}</p>
                            <p className="mt-0.5 text-[10px] text-slate-400">{group.category ?? 'General'} · {group.criteria.length} criteria · {scoreMax} pts</p>
                          </div>
                          <button type="button" title="Move group up" aria-label={`Move ${group.name} up`} disabled={index === 0} onClick={() => moveCriterionGroup(group.id, -1)} className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-500 disabled:opacity-30">↑</button>
                          <button type="button" title="Move group down" aria-label={`Move ${group.name} down`} disabled={index === criterionGroupIds.length - 1} onClick={() => moveCriterionGroup(group.id, 1)} className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-500 disabled:opacity-30">↓</button>
                          <button type="button" title="Remove group" aria-label={`Remove ${group.name}`} onClick={() => setCriterionGroupIds((current) => current.filter((id) => id !== group.id))} className="grid size-7 shrink-0 place-items-center rounded-lg border border-rose-100 bg-white text-xs font-black text-rose-500">×</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Available groups</p>
                  {criteriaGroups.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {criteriaGroups.filter((group) => !criterionGroupIds.includes(group.id)).map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setCriterionGroupIds((current) => [...current, group.id])}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50"
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-extrabold text-slate-800">{group.name}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">{group.category ?? 'General'} · {group.criteria.length} criteria</span>
                          </span>
                          <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-slate-200 text-xs font-black text-cyan-600">+</span>
                        </button>
                      ))}
                    </div>
                  ) : <p className="p-2 text-xs text-slate-400">No active criteria groups available.</p>}
                </div>
              </div>
              <p className="mt-1.5 text-[10px] font-bold text-slate-400">{criterionGroupIds.length} group(s) selected</p>
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
              <FormField label="Interviewers" hint="Select one or more active interviewers from this agency or the global interviewer pool.">
                {interviewers.length ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Agency interviewers', items: interviewers.filter((item) => item.agencyId === agencyId) },
                      { label: 'Global interviewers', items: interviewers.filter((item) => item.agencyId === null) },
                    ].map((group) => group.items.length ? (
                      <div key={group.label}>
                        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{group.label}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {group.items.map((interviewer) => (
                            <label key={interviewer.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
                              <input type="checkbox" checked={panel.includes(interviewer.id)} onChange={(event) => setPanel((current) => event.target.checked ? [...new Set([...current, interviewer.id])] : current.filter((id) => id !== interviewer.id))} />
                              <span className="min-w-0">
                                <span className="block text-xs font-bold text-slate-800">{interviewer.name}</span>
                                <span className="block truncate text-[10px] text-slate-400">{interviewer.email}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null)}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-600">No active agency or global interviewers are available.</p>
                )}
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
            const ownEvaluation = interview.evaluations?.find((item) => item.interviewerId === user?.id);
            const alreadyEvaluated = ownEvaluation?.status === 'SUBMITTED';
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
                    <p className="mt-1 text-xs font-semibold text-cyan-700">{candidate?.reference ?? 'Candidate'} · Birthdate: {candidate?.birthdate ? new Date(candidate.birthdate).toLocaleDateString() : 'Not provided'} · Passport: {candidate?.passportNumber ?? 'Not provided'} {job ? '· ' + job.title : '· General interview'}</p>
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
                    <Button size="sm" variant="primary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => void openInterviewDetails(interview)}>View</Button>
                    {candidate && <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => { setProfileCandidate(candidate); setProfileMinimized(false); setProfileMaximized(false); }}>Full profile</Button>}

                    {(role === 'ADMIN' || role === 'AGENCY') && interview.status === 'SCHEDULED' && (
                      <>
                        <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" title="Edit interview" onClick={() => openReschedule(interview)}>Edit</Button>
                        <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" title="Mark as no show" onClick={() => requestInterviewStatusChange(interview, 'NO_SHOW')}>No show</Button>
                        <Button size="sm" variant="danger" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" title="Cancel interview" onClick={() => requestInterviewStatusChange(interview, 'CANCELLED')}>Cancel</Button>
                      </>
                    )}

                    {isAssignedInterviewer && interview.status === 'SCHEDULED' && (
                      isInterviewStartable(interview) ? (
                        <Button size="sm" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => void openEvaluationWorkspace(interview)}>
                          Start interview
                        </Button>
                      ) : (
                        <span className="inline-flex min-h-10 items-center rounded-lg bg-slate-100 px-2.5 text-[9px] font-extrabold text-slate-500">
                          {now < new Date(interview.scheduledAt).getTime() - 15 * 60_000 ? 'Starts later' : 'Past — view only'}
                        </span>
                      )
                    )}

                    {isAssignedInterviewer && interview.status === 'IN_PROGRESS' && (
                      <Button size="sm" variant={alreadyEvaluated ? 'secondary' : 'primary'} className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => void openEvaluationWorkspace(interview)}>
                        {alreadyEvaluated ? 'View scorecard' : 'Continue interview'}
                      </Button>
                    )}

                    {(['ADMIN', 'AGENCY', 'INTERVIEWER'].includes(role) && interview.status === 'COMPLETED') && (
                      <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => void openEvaluationWorkspace(interview)}>
                        Open interview panel
                      </Button>
                    )}
                  </div>
                </div>


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
                  const ownEvaluation = interview.evaluations?.find((item) => item.interviewerId === user?.id);
                  const alreadyEvaluated = ownEvaluation?.status === 'SUBMITTED';
                  const isAssignedInterviewer = role === 'INTERVIEWER';
                  return (
                    <tr key={interview.id} className="align-top text-xs text-slate-700 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-slate-900">{candidate?.name ?? interview.candidateId}</p>
                        <p className="mt-0.5 font-semibold text-cyan-700">{candidate?.reference ?? 'Candidate'} · Birthdate: {candidate?.birthdate ? new Date(candidate.birthdate).toLocaleDateString() : 'Not provided'} · Passport: {candidate?.passportNumber ?? 'Not provided'}{job ? ' · ' + job.title : ''}</p>
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
                          {candidate && <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => { setProfileCandidate(candidate); setProfileMinimized(false); setProfileMaximized(false); }}>Full profile</Button>}
                          {(role === 'ADMIN' || role === 'AGENCY') && interview.status === 'SCHEDULED' && (
                            <>
                              <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => openReschedule(interview)}>Edit</Button>
                              <Button size="sm" variant="secondary" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => requestInterviewStatusChange(interview, 'NO_SHOW')}>No show</Button>
                              <Button size="sm" variant="danger" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => requestInterviewStatusChange(interview, 'CANCELLED')}>Cancel</Button>
                            </>
                          )}
                          {isAssignedInterviewer && interview.status === 'SCHEDULED' && (
                            isInterviewStartable(interview) ? (
                              <Button size="sm" className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => { setListView('cards'); void openEvaluationWorkspace(interview); }}>
                                Start interview
                              </Button>
                            ) : (
                              <span className="inline-flex min-h-10 items-center rounded-lg bg-slate-100 px-2.5 text-[9px] font-extrabold text-slate-500">
                                {now < new Date(interview.scheduledAt).getTime() - 15 * 60_000 ? 'Starts later' : 'Past — view only'}
                              </span>
                            )
                          )}
                          {isAssignedInterviewer && interview.status === 'IN_PROGRESS' && (
                            <Button size="sm" variant={alreadyEvaluated ? 'secondary' : 'primary'} className="min-h-10 rounded-lg px-2 py-1 text-[9px]" onClick={() => { setListView('cards'); void openEvaluationWorkspace(interview); }}>
                              {alreadyEvaluated ? 'View scorecard' : 'Continue'}
                            </Button>
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

      {evaluationFor && ['ADMIN', 'AGENCY', 'INTERVIEWER'].includes(role) && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div
            className={
              evaluationMinimized
                ? 'pointer-events-auto fixed bottom-4 right-4 w-[min(360px,calc(100vw-2rem))]'
                : evaluationMaximized
                  ? 'pointer-events-auto fixed inset-3 sm:inset-5'
                  : 'pointer-events-auto fixed bottom-4 right-4 w-[min(620px,calc(100vw-2rem))]'
            }
          >
            {(() => {
              const activeInterview = interviews.find((item) => item.id === evaluationFor);
              const activeCandidate = activeInterview ? candidateFor(activeInterview) : null;
              if (!activeInterview) return null;
              const panelGroupSources = [
                ...(activeInterview.criterionGroups ?? []),
                ...criteriaGroups,
              ];
              const criterionSections = buildCriterionSections(
                evaluationAssignments,
                panelGroupSources,
                activeInterview.criterionGroup ? { id: activeInterview.criterionGroup.id, name: activeInterview.criterionGroup.name } : null,
              );
              if (evaluationMinimized) {
                return (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-slate-900">Interview — {activeCandidate?.name ?? activeInterview.candidateId}</p>
                        <p className="text-[10px] text-slate-400">{activeCandidate?.passportNumber ? 'Passport: ' + activeCandidate.passportNumber + ' · ' : 'Passport: Not provided · '}{evaluationSummary ? evaluationSummary.submitted + ' / ' + evaluationSummary.required + ' submitted' : 'Loading scorecard…'}</p>
                      </div>
                      <Button size="sm" variant="secondary" className="min-h-9 px-2 text-[10px]" onClick={() => setEvaluationMinimized(false)}>Open</Button>
                      <button type="button" aria-label="Close interview workspace" className="text-lg font-bold text-slate-400 hover:text-slate-700" onClick={() => setEvaluationFor(null)}>×</button>
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex h-full max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">{activeInterview.status === 'COMPLETED' ? 'Completed interview panel' : 'Ongoing interview'}</p>
                      <h3 className="truncate text-sm font-black text-slate-950">{activeCandidate?.name ?? activeInterview.candidateId}</h3>
                      <p className="truncate text-[10px] text-slate-400">Birthdate: {activeCandidate?.birthdate ? new Date(activeCandidate.birthdate).toLocaleDateString() : 'Not provided'} · Passport: {activeCandidate?.passportNumber ?? 'Not provided'} · {activeInterview.type} · {activeInterview.criterionGroup?.name ?? 'Assigned scorecard'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Minimize interview workspace" title="Minimize" className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEvaluationMinimized(true)}>−</button>
                      <button type="button" aria-label={evaluationMaximized ? 'Restore interview workspace' : 'Maximize interview workspace'} title={evaluationMaximized ? 'Restore' : 'Maximize'} className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEvaluationMaximized((value) => !value)}>{evaluationMaximized ? '❐' : '□'}</button>
                      <button type="button" aria-label="Close interview workspace" title="Close" className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEvaluationFor(null)}>×</button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                    {role === 'INTERVIEWER' ? (
                    <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress</p>
                        <p className="mt-1 text-sm font-black text-slate-900">{evaluationAssignments.filter((assignment) => scoreDrafts[assignment.criterionId] !== '' && (assignment.responseType === 'MULTI_SELECT' ? (selectedOptionsDrafts[assignment.criterionId]?.length ?? 0) > 0 : Boolean(responseDrafts[assignment.criterionId]?.trim()))).length} / {evaluationAssignments.length} answered</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My score</p>
                        <p className="mt-1 text-sm font-black text-cyan-700">
                          {evaluationAssignments.reduce((sum, item) => sum + (scoreDrafts[item.criterionId] === '' ? 0 : Number(scoreDrafts[item.criterionId] ?? 0)), 0)}
                          {' / '}
                          {evaluationAssignments.reduce((sum, item) => sum + item.maxPoints, 0)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Panel</p>
                        <p className="mt-1 text-sm font-black text-slate-900">{evaluationSummary ? evaluationSummary.submitted + ' / ' + evaluationSummary.required + ' submitted' : 'Loading'}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3.5 sm:p-4">
                      <div className="mb-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">Candidate details</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Personal details available to the interviewer before completing the criteria below.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-white bg-white/80 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</p>
                          <p className="mt-1 text-sm font-black text-slate-900">{activeCandidate?.name ?? activeInterview.candidateId}</p>
                        </div>
                        <div className="rounded-xl border border-white bg-white/80 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Birthdate</p>
                          {role === 'INTERVIEWER' ? (
                            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                type="date"
                                className="field-input min-w-0 flex-1 bg-white"
                                value={birthdateDraft}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(event) => setBirthdateDraft(event.target.value)}
                                disabled={savingBirthdate || evaluationStatus === 'SUBMITTED'}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="shrink-0"
                                disabled={savingBirthdate || evaluationStatus === 'SUBMITTED' || !birthdateDraft || birthdateDraft === (activeCandidate?.birthdate ? activeCandidate.birthdate.slice(0, 10) : '')}
                                onClick={() => void saveCandidateBirthdate(activeCandidate)}
                              >
                                {savingBirthdate ? 'Saving…' : 'Save'}
                              </Button>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm font-black text-slate-900">{activeCandidate?.birthdate ? new Date(activeCandidate.birthdate).toLocaleDateString() : 'Not provided'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {criterionSections.map((section) => (
                        <section key={section.id} className="space-y-2.5">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <div className="h-5 w-1 rounded-full bg-cyan-500" />
                            <div>
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">{section.name}</p>
                              <p className="text-[10px] text-slate-400">{section.assignments.length} criter{section.assignments.length === 1 ? 'ion' : 'ia'}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                          {section.assignments.map((assignment) => (
                        <div key={assignment.id} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                          <div className="flex flex-col gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-extrabold text-slate-900">{assignment.name}</p>
                                {assignment.required && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">Required</span>}
                                <span className="text-[10px] font-bold text-slate-400">Max {assignment.maxPoints} pts · {assignment.responseType === 'MULTI_SELECT' ? 'Multiple tags' : 'Standard answer'}</span>
                              </div>
                              {assignment.description && <p className="mt-1 text-[10px] leading-4 text-slate-400">{assignment.description}</p>}
                            </div>
                            <CriterionResponseField
                              assignment={assignment}
                              scoreValue={scoreDrafts[assignment.criterionId] ?? ''}
                              textValue={responseDrafts[assignment.criterionId] ?? ''}
                              selectedOptions={selectedOptionsDrafts[assignment.criterionId] ?? []}
                              customTagValue={customTagDrafts[assignment.criterionId] ?? ''}
                              disabled={evaluationStatus === 'SUBMITTED' || evaluating}
                              onScoreChange={(value) => setScoreDrafts((current) => ({ ...current, [assignment.criterionId]: value }))}
                              onTextChange={(value) => setResponseDrafts((current) => ({ ...current, [assignment.criterionId]: value }))}
                              onSelectedOptionsChange={(value) => setSelectedOptionsDrafts((current) => ({ ...current, [assignment.criterionId]: value }))}
                              onCustomTagValueChange={(value) => setCustomTagDrafts((current) => ({ ...current, [assignment.criterionId]: value }))}
                            />
                          </div>
                        </div>
                          ))}
                          </div>
                        </section>
                      ))}
                    </div>
                    <FormField label="Interview notes" hint="Add your interview observations before submitting.">
                      <textarea className="field-input min-h-28 resize-y" disabled={evaluationStatus === 'SUBMITTED' || evaluating} value={evaluationComments} onChange={(event) => setEvaluationComments(event.target.value)} placeholder="Enter interview observations, strengths, concerns and final notes…" />
                    </FormField>
                    </>
                    ) : (
                      <div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Panel submissions</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{evaluationDetail?.evaluations?.filter((item) => item.status === 'SUBMITTED').length ?? 0} / {evaluationDetail?.panel?.length ?? 0}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final average</p>
                            <p className="mt-1 text-sm font-black text-cyan-700">{(() => {
                              const submitted = evaluationDetail?.evaluations?.filter((item) => item.status === 'SUBMITTED') ?? [];
                              const scoringAssignments = evaluationDetail?.criterionAssignments ?? [];
                              const max = scoringAssignments.reduce((sum, item) => sum + item.maxPoints, 0);
                              if (!submitted.length || !max) return '—';
                              const percentages = submitted.map((item) => item.scores.reduce((sum, score) => sum + score.points, 0) / max * 100);
                              return (percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(2) + '%';
                            })()}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Access</p>
                            <p className="mt-1 text-sm font-black text-slate-900">All panel scores</p>
                          </div>
                        </div>
                        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                          <table className="min-w-[700px] w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <tr>
                                <th className="px-3 py-2.5">Criterion</th>
                                {(evaluationDetail?.evaluations ?? []).filter((item) => item.status === 'SUBMITTED').map((item) => <th key={item.id} className="px-3 py-2.5">{item.interviewer.name}</th>)}
                                <th className="px-3 py-2.5">Average</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(evaluationDetail?.criterionAssignments ?? []).map((assignment) => {
                                const submitted = (evaluationDetail?.evaluations ?? []).filter((item) => item.status === 'SUBMITTED');
                                const values = submitted.map((item) => item.scores.find((score) => score.criterionId === assignment.criterionId)?.points ?? 0);
                                const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
                                return <tr key={assignment.id}>
                                  <td className="px-3 py-2.5 font-bold text-slate-700">{assignment.name} <span className="font-normal text-slate-400">/ {assignment.maxPoints}</span></td>
                                  {submitted.map((evaluation, index) => {
                                    const response = evaluation.responses?.find((item) => item.criterionId === assignment.criterionId);
                                    const value = response?.selectedOptions?.join(', ') || response?.textValue || '—';
                                    return (
                                      <td key={evaluation.id} className="px-3 py-2.5 align-top">
                                        <div className="font-black text-slate-900">{values[index]}</div>
                                        <div className="mt-0.5 text-[10px] text-slate-500">{value}</div>
                                      </td>
                                    );
                                  })}
                                  <td className="px-3 py-2.5 font-black text-cyan-700">{average.toFixed(1)}</td>
                                </tr>;
                              })}
                          </tbody>
                        </table>
                      </div>
                        <div className="mt-4 space-y-3">
                          {(evaluationDetail?.evaluations ?? []).filter((item) => item.status === 'SUBMITTED').map((evaluation) => {
                            const total = evaluation.scores.reduce((sum, score) => sum + score.points, 0);
                            const max = evaluationDetail?.criterionAssignments?.reduce((sum, item) => sum + item.maxPoints, 0) ?? 0;
                            return <div key={evaluation.id} className="rounded-2xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div><p className="text-sm font-black text-slate-900">{evaluation.interviewer.name}</p><p className="text-[10px] text-slate-400">{evaluation.interviewer.email}</p></div>
                                <p className="text-sm font-black text-cyan-700">{total} / {max} {max ? '(' + Math.round((total / max) * 100) + '%)' : ''}</p>
                              </div>
                              {evaluation.comments && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{evaluation.comments}</p>}
                            </div>;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {evaluationDecisionMessage && (
                    <div className="shrink-0 border-t border-emerald-100 bg-emerald-50 px-4 py-3 sm:px-5" role="status" aria-live="polite">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-[11px] font-black text-white">✓</div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-emerald-900">Decision recorded</p>
                          <p className="mt-0.5 text-[11px] leading-5 text-emerald-800">{evaluationDecisionMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeInterview.status === 'COMPLETED' && activeCandidate && !candidateFinalStatuses.includes(activeCandidate.status) && (
                    <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">Final candidate decision</p>
                        <h4 className="mt-1 text-sm font-black text-slate-950">Record the candidate outcome</h4>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500">The final score is calculated from the interviewer panel. Record the decision here so the system keeps who made it.</p>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <FormField label="Status">
                          <select
                            className="field-input h-11"
                            value={statusDrafts[activeCandidate.id] ?? ''}
                            onChange={(event) => setStatusDrafts((current) => ({ ...current, [activeCandidate.id]: event.target.value as CandidateStatus }))}
                          >
                            <option value="">Select final status</option>
                            {candidateFinalStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                          </select>
                        </FormField>
                        <FormField label="Reason" hint="Optional">
                          <input
                            className="field-input h-11"
                            value={statusReasons[activeCandidate.id] ?? ''}
                            onChange={(event) => setStatusReasons((current) => ({ ...current, [activeCandidate.id]: event.target.value }))}
                            placeholder="Reason or decision note"
                          />
                        </FormField>
                        <div className="sm:col-span-2">
                          <Button
                            className="min-h-11 w-full sm:w-auto"
                            disabled={!statusDrafts[activeCandidate.id]}
                            onClick={() => void updateCandidateStatus(activeCandidate)}
                          >
                            Update status
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {role === 'INTERVIEWER' && ['SCHEDULED', 'IN_PROGRESS'].includes(activeInterview.status) && (
                    <div className="shrink-0 border-t border-amber-100 bg-amber-50/60 px-4 py-3 sm:px-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">Interview actions</p>
                          <p className="mt-0.5 text-[10px] leading-4 text-amber-700">Use No show when the candidate does not attend. Use Cancel when the interview should not continue.</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="min-h-10 rounded-lg px-3 py-1 text-[9px] font-extrabold"
                            disabled={Boolean(interviewStatusUpdating) || evaluationStatus === 'SUBMITTED' || evaluating}
                            onClick={() => requestInterviewStatusChange(activeInterview, 'NO_SHOW')}
                          >
                            {interviewStatusUpdating === activeInterview.id + ':NO_SHOW' ? 'Updating…' : 'No show'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            className="min-h-10 rounded-lg px-3 py-1 text-[9px] font-extrabold"
                            disabled={Boolean(interviewStatusUpdating) || evaluationStatus === 'SUBMITTED' || evaluating}
                            onClick={() => requestInterviewStatusChange(activeInterview, 'CANCELLED')}
                          >
                            {interviewStatusUpdating === activeInterview.id + ':CANCELLED' ? 'Updating…' : 'Cancel interview'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {role === 'INTERVIEWER' && (
                    <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] text-slate-400">{evaluationStatus === 'SUBMITTED' ? 'Submitted. Waiting for the remaining panel members.' : 'All required criteria and notes are submitted together.'}</p>
                        <Button onClick={() => void submitEvaluation(activeInterview)} disabled={evaluationStatus === 'SUBMITTED' || evaluating || evaluationAssignments.some((assignment) => assignment.required && (scoreDrafts[assignment.criterionId] === '' || (assignment.responseType === 'MULTI_SELECT' ? !(selectedOptionsDrafts[assignment.criterionId]?.length) : !responseDrafts[assignment.criterionId]?.trim()))) || !evaluationComments.trim()}>
                          {evaluating ? 'Submitting…' : evaluationStatus === 'SUBMITTED' ? 'Submitted' : 'Submit'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingInterviewStatus)}
        title={pendingInterviewStatus?.status === 'CANCELLED' ? 'Cancel this interview?' : 'Mark this interview as a no-show?'}
        description={
          pendingInterviewStatus?.status === 'CANCELLED'
            ? 'This interview will be cancelled and removed from the active interview workflow.'
            : 'This will record that the candidate did not attend the scheduled interview.'
        }
        warning={
          pendingInterviewStatus && evaluationFor === pendingInterviewStatus.interview.id && evaluationStatus === 'DRAFT'
            ? 'Any unsaved scorecard changes in the open interview panel will not be submitted.'
            : undefined
        }
        confirmLabel={pendingInterviewStatus?.status === 'CANCELLED' ? 'Cancel interview' : 'Mark no-show'}
        cancelLabel="Keep interview"
        danger={pendingInterviewStatus?.status === 'CANCELLED'}
        busy={Boolean(interviewStatusUpdating)}
        onCancel={() => {
          if (!interviewStatusUpdating) setPendingInterviewStatus(null);
        }}
        onConfirm={() => void changeInterviewStatus()}
      />

      <CandidateProfilePanel
        candidate={profileCandidate}
        role={role}
        apiEnabled={!developmentMode}
        minimized={profileMinimized}
        maximized={profileMaximized}
        onMinimize={() => setProfileMinimized(true)}
        onRestore={() => { setProfileMinimized(false); setProfileMaximized(false); }}
        onMaximize={() => { setProfileMinimized(false); setProfileMaximized((value) => !value); }}
        onClose={() => { setProfileCandidate(null); setProfileMinimized(false); setProfileMaximized(false); }}
        onCandidateUpdated={(updated) => {
          setCandidates((items) => items.map((item) => item.id === updated.id ? updated : item));
          setInterviews((items) => items.map((item) => item.candidateId === updated.id
            ? { ...item, candidate: item.candidate ? { ...item.candidate, ...updated } : item.candidate }
            : item));
        }}
      />

      {detailFor && detail && (
        <InterviewDetailsModal detail={detail} open={interviewDetailModalOpen} onClose={closeInterviewDetails} />
      )}

    </section>
  );
};