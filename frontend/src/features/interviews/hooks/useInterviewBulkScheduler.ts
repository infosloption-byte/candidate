import { useEffect, useMemo, useState } from 'react';
import { useInterviewContext } from '../context/useInterviewContext';
import { buildBulkInterviews, planBulkInterviewSchedule } from '../services/interviewBatchScheduler';
import type { Candidate } from '../../candidates/types/candidate';
import type { BulkInterviewScheduleConfig, BulkInterviewSchedulePlan, InterviewType } from '../types/interview';

interface UseInterviewBulkSchedulerProps {
  candidates: Candidate[];
  open: boolean;
  onClose: () => void;
  onScheduled: (candidateIds: string[]) => void;
}

const addDays = (date: Date, days: number): Date => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const isoDate = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const defaultConfig = (interviewerIds: string[] = []): BulkInterviewScheduleConfig => {
  const today = new Date();
  return { type: 'Screening', startDate: isoDate(today), endDate: isoDate(addDays(today, 1)), dayStart: '09:00', dayEnd: '17:00', durationMinutes: 30, breakMinutes: 10, location: 'Interview Centre', interviewerIds, includeWeekends: false };
};

export const useInterviewBulkScheduler = ({ candidates, open, onClose, onScheduled }: UseInterviewBulkSchedulerProps) => {
  const { state, dispatch } = useInterviewContext();
  const activeInterviewCandidateIds = useMemo(() => new Set(state.interviews.filter((interview) => ['scheduled', 'in-progress', 'evaluation'].includes(interview.status)).map((interview) => interview.candidateId)), [state.interviews]);
  const eligibleCandidates = useMemo(() => candidates.filter((candidate) => candidate.status !== 'rejected' && !activeInterviewCandidateIds.has(candidate.id)), [activeInterviewCandidateIds, candidates]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [config, setConfig] = useState<BulkInterviewScheduleConfig>(() => defaultConfig());
  const [plan, setPlan] = useState<BulkInterviewSchedulePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 40;

  useEffect(() => {
    if (!open) return;
    setConfig((current) => ({ ...current, interviewerIds: current.interviewerIds.length > 0 ? current.interviewerIds.filter((id) => state.interviewers.some((person) => person.id === id && person.active)) : state.interviewers.filter((person) => person.active).map((person) => person.id) }));
  }, [open, state.interviewers]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return eligibleCandidates.filter((candidate) => !normalized || [candidate.name, candidate.reference, candidate.profession, candidate.location, ...candidate.secondarySkills].join(' ').toLowerCase().includes(normalized));
  }, [eligibleCandidates, query]);

  const pageCount = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageCandidates = filteredCandidates.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedCandidates = useMemo(() => eligibleCandidates.filter((candidate) => selectedIds.includes(candidate.id)), [eligibleCandidates, selectedIds]);
  const allFilteredSelected = filteredCandidates.length > 0 && filteredCandidates.every((candidate) => selectedIds.includes(candidate.id));

  const setConfigField = <K extends keyof BulkInterviewScheduleConfig>(field: K, value: BulkInterviewScheduleConfig[K]) => {
    setConfig((current) => ({ ...current, [field]: value }));
    setPlan(null);
    setError(null);
  };

  const toggleCandidate = (candidateId: string) => {
    setSelectedIds((current) => current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]);
    setPlan(null);
    setError(null);
  };

  const toggleAllFiltered = () => {
    const ids = filteredCandidates.map((candidate) => candidate.id);
    setSelectedIds((current) => allFilteredSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids])));
    setPlan(null);
    setError(null);
  };

  const toggleInterviewer = (interviewerId: string) => {
    setConfig((current) => ({ ...current, interviewerIds: current.interviewerIds.includes(interviewerId) ? current.interviewerIds.filter((id) => id !== interviewerId) : [...current.interviewerIds, interviewerId] }));
    setPlan(null);
    setError(null);
  };

  const generatePlan = () => {
    if (selectedCandidates.length === 0) { setError('Select at least one candidate to build a schedule.'); return; }
    if (config.interviewerIds.length === 0) { setError('Select at least one interviewer.'); return; }
    if (config.startDate > config.endDate) { setError('The end date must be on or after the start date.'); return; }
    const next = planBulkInterviewSchedule(selectedCandidates, state.interviewers, state.interviews, config);
    setPlan(next);
    setError(next.slots.length === 0 ? 'No candidates could be placed in the configured window. Adjust the dates, time window or interviewer pool.' : null);
  };

  const applyPlan = () => {
    if (!plan || plan.slots.length === 0) { setError('Build a schedule plan before applying it.'); return; }
    const created = buildBulkInterviews(plan, selectedCandidates, config);
    if (created.length === 0) { setError('The schedule plan no longer contains valid candidate records.'); return; }
    dispatch({ type: 'CREATE_INTERVIEWS', interviews: created });
    onScheduled(created.map((interview) => interview.candidateId));
    setSelectedIds([]);
    setPlan(null);
    setError(null);
    onClose();
  };

  const reset = () => { setSelectedIds([]); setQuery(''); setPage(1); setConfig(defaultConfig(state.interviewers.filter((person) => person.active).map((person) => person.id))); setPlan(null); setError(null); };

  return {
    eligibleCandidates,
    filteredCandidates,
    pageCandidates,
    page: currentPage,
    pageCount,
    pageSize,
    selectedIds,
    selectedCandidates,
    allFilteredSelected,
    query,
    config,
    plan,
    error,
    actions: {
      setQuery: (value: string) => { setQuery(value); setPage(1); setPlan(null); setError(null); },
      setPage: (value: number) => setPage(Math.min(Math.max(value, 1), pageCount)),
      setConfigField,
      toggleCandidate,
      toggleAllFiltered,
      toggleInterviewer,
      generatePlan,
      applyPlan,
      reset,
    },
    open,
  };
};
