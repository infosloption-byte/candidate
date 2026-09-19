import { useMemo } from 'react';
import { useSelectionContext } from '../context/useSelectionContext';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { useSelectionSuitability } from './useSelectionSuitability';
import type { Candidate } from '../../candidates/types/candidate';
import { defaultSelectionScoringWeights } from '../types/selection';
import type { SelectionApproval, SelectionDecision, SelectionHistoryAction, SelectionHistoryEntry, SelectionJob, SelectionRecord, SelectionScoringWeights, SelectionTab } from '../types/selection';
import { fetchSelectionWorkspace, saveSelectionDecisionApi, setSelectionApprovalApi, setSelectionScoringApi } from '../services/selectionApi';

export interface SelectionCandidateRow {
  candidate: Candidate;
  record: SelectionRecord | null;
  skillMatchCount: number;
  skillMatchTotal: number;
  skillMatchPercent: number;
  experienceMeets: boolean;
  documentsReady: boolean;
  interviewScore: number | null;
  evidenceFlags: string[];
}

export interface SelectionHistoryView {
  id: string;
  candidateName: string;
  candidateId: string | null;
  action: SelectionHistoryAction;
  actionLabel: string;
  summary: string;
  jobTitle: string;
  relatedJobTitle: string | null;
  reason: string;
  note: string;
  occurredAt: string;
  occurredBy: string;
}

const documentReady = (candidate: Candidate): boolean => Object.values(candidate.documents).every((state) => state === 'verified');
const roleMatches = (candidate: Candidate, job: SelectionJob): boolean => {
  const candidateProfession = candidate.profession.toLowerCase();
  const originalProfession = candidate.originalProfession.toLowerCase();
  const jobProfession = job.profession.toLowerCase();
  return candidateProfession === jobProfession || originalProfession === jobProfession || candidateProfession.includes(jobProfession) || jobProfession.includes(candidateProfession);
};
const skillCoverage = (candidate: Candidate, job: SelectionJob): number => {
  if (job.requiredSkills.length === 0) return 1;
  const candidateSkills = new Set(candidate.secondarySkills.map((skill) => skill.toLowerCase()));
  return job.requiredSkills.filter((skill) => candidateSkills.has(skill.toLowerCase())).length / job.requiredSkills.length;
};
const rowFor = (candidate: Candidate, job: SelectionJob, records: SelectionRecord[]): SelectionCandidateRow => {
  const record = records.find((item) => item.candidateId === candidate.id && item.jobId === job.id) ?? null;
  const skillMatchCount = job.requiredSkills.filter((skill) => candidate.secondarySkills.some((candidateSkill) => candidateSkill.toLowerCase() === skill.toLowerCase())).length;
  const skillMatchTotal = job.requiredSkills.length;
  const coverage = skillCoverage(candidate, job);
  const evidenceFlags: string[] = [];
  if (!candidate.lastInterview) evidenceFlags.push('Interview evidence missing');
  if (candidate.experienceYears < job.requiredExperience) evidenceFlags.push(`Below ${job.requiredExperience} years required experience`);
  if (coverage < 1 && skillMatchTotal > 0) evidenceFlags.push(`${skillMatchTotal - skillMatchCount} required skill${skillMatchTotal - skillMatchCount === 1 ? '' : 's'} missing`);
  if (!documentReady(candidate)) evidenceFlags.push('Documents need attention');
  if (!candidate.locationReady) evidenceFlags.push('Location readiness not confirmed');
  return { candidate, record, skillMatchCount, skillMatchTotal, skillMatchPercent: Math.round(coverage * 100), experienceMeets: candidate.experienceYears >= job.requiredExperience, documentsReady: documentReady(candidate), interviewScore: candidate.lastInterview?.score ?? null, evidenceFlags };
};
const compareRows = (left: SelectionCandidateRow, right: SelectionCandidateRow): number => {
  const leftDecision = left.record?.decision ?? 'recommended';
  const rightDecision = right.record?.decision ?? 'recommended';
  const decisionRank: Record<SelectionDecision, number> = { selected: 0, recommended: 1, reserve: 2, rejected: 3 };
  if (decisionRank[leftDecision] !== decisionRank[rightDecision]) return decisionRank[leftDecision] - decisionRank[rightDecision];
  return (right.interviewScore ?? 0) - (left.interviewScore ?? 0) || right.candidate.fitScore - left.candidate.fitScore;
};
const historyActionLabel: Record<SelectionHistoryAction, string> = { decision_changed: 'Decision change', reassigned: 'Reassigned', approval_changed: 'Approval change', allocated: 'Allocated' };
const decisionLabel = (decision: SelectionDecision | null | undefined): string => decision ? decision.charAt(0).toUpperCase() + decision.slice(1) : 'No previous decision';
const historySummary = (entry: SelectionHistoryEntry, relatedJob: SelectionJob | undefined): string => {
  if (entry.action === 'reassigned') return `${decisionLabel(entry.fromDecision)} → Recommended${relatedJob ? ` in ${relatedJob.title}` : ''}`;
  if (entry.action === 'approval_changed') return entry.reason;
  if (entry.action === 'allocated') return 'Allocated to this job';
  return `${decisionLabel(entry.fromDecision)} → ${decisionLabel(entry.toDecision)}`;
};

export const useSelectionWorkspace = () => {
  const { state, dispatch } = useSelectionContext();
  const { state: candidateState } = useCandidateWorkspace();
  const activeJob = useMemo<SelectionJob | null>(() => state.jobs.find((job) => job.id === state.activeJobId) ?? state.jobs[0] ?? null, [state.jobs, state.activeJobId]);
  const rows = useMemo(() => activeJob ? candidateState.candidates.filter((candidate) => roleMatches(candidate, activeJob)).filter((candidate) => Boolean(candidate.lastInterview) || candidate.status === 'selected' || candidate.status === 'reserve').map((candidate) => rowFor(candidate, activeJob, state.records)) : [], [activeJob, candidateState.candidates, state.records]);
  const tabRows = useMemo(() => state.activeTab === 'recommended' ? rows.filter((row) => row.record?.decision !== 'selected' && row.record?.decision !== 'reserve' && row.record?.decision !== 'rejected') : rows.filter((row) => row.record?.decision === state.activeTab), [rows, state.activeTab]);
  const selectedRow = useMemo(() => rows.find((row) => row.candidate.id === state.selectedCandidateId) ?? tabRows[0] ?? rows[0] ?? null, [rows, state.selectedCandidateId, tabRows]);
  const approval = useMemo<SelectionApproval>(() => activeJob ? (state.approvalByJob[activeJob.id] ?? { status: 'draft', note: '' }) : { status: 'draft', note: '' }, [activeJob, state.approvalByJob]);
  const scoringWeights = useMemo<SelectionScoringWeights>(() => activeJob ? (state.scoringByJob[activeJob.id] ?? defaultSelectionScoringWeights) : defaultSelectionScoringWeights, [activeJob, state.scoringByJob]);
  const suitability = useSelectionSuitability(selectedRow, activeJob, scoringWeights);
  const history = useMemo<SelectionHistoryView[]>(() => {
    if (!activeJob) return [];
    return state.history.filter((entry) => entry.jobId === activeJob.id || entry.relatedJobId === activeJob.id).map((entry) => {
      const candidate = entry.candidateId ? candidateState.candidates.find((item) => item.id === entry.candidateId) : undefined;
      const job = state.jobs.find((item) => item.id === entry.jobId);
      const relatedJob = entry.relatedJobId ? state.jobs.find((item) => item.id === entry.relatedJobId) : undefined;
      return { id: `${entry.occurredAt}::${entry.candidateId ?? 'job'}::${entry.action}::${entry.jobId}::${entry.relatedJobId ?? ''}`, candidateName: candidate?.name ?? (entry.candidateId ?? 'Job-level action'), candidateId: entry.candidateId, action: entry.action, actionLabel: historyActionLabel[entry.action], summary: historySummary(entry, relatedJob), jobTitle: job?.title ?? entry.jobId, relatedJobTitle: relatedJob?.title ?? null, reason: entry.reason, note: entry.note, occurredAt: entry.occurredAt, occurredBy: entry.occurredBy };
    }).sort((left, right) => { const leftTime = Date.parse(left.occurredAt); const rightTime = Date.parse(right.occurredAt); if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0; return rightTime - leftTime; }).slice(0, 40);
  }, [activeJob, candidateState.candidates, state.history, state.jobs]);
  const metrics = useMemo(() => {
    if (!activeJob) return { total: 0, recommended: 0, selected: 0, reserve: 0, rejected: 0, remaining: 0, readyToSelect: 0, approvalReady: false };
    const selected = rows.filter((row) => row.record?.decision === 'selected').length;
    const reserve = rows.filter((row) => row.record?.decision === 'reserve').length;
    const rejected = rows.filter((row) => row.record?.decision === 'rejected').length;
    const recommended = rows.filter((row) => row.record?.decision === 'recommended' || !row.record).length;
    const readyToSelect = rows.filter((row) => row.experienceMeets && row.skillMatchPercent >= 50 && row.candidate.locationReady).length;
    return { total: rows.length, recommended, selected, reserve, rejected, remaining: Math.max(activeJob.openings - selected, 0), readyToSelect, approvalReady: selected > 0 && selected <= activeJob.openings };
  }, [activeJob, rows]);
  const refreshRemote = async () => {
    const workspace = await fetchSelectionWorkspace();
    dispatch({
      type: 'REFRESH_REMOTE',
      jobs: workspace.jobs,
      records: workspace.records,
      history: workspace.history,
      approvalByJob: workspace.approvalByJob,
      scoringByJob: workspace.scoringByJob,
    });
  };

  const actions = {
    setJob: (jobId: string) => dispatch({ type: 'SET_JOB', jobId }),
    setTab: (tab: SelectionTab) => dispatch({ type: 'SET_TAB', tab }),
    selectCandidate: (candidateId: string | null) => dispatch({ type: 'SELECT_CANDIDATE', candidateId }),
    saveDecision: async (candidateId: string, decision: SelectionDecision, reason: string, note: string) => {
      if (!activeJob) return;
      await saveSelectionDecisionApi(activeJob.id, candidateId, decision, reason.trim(), note.trim());
      await refreshRemote();
    },
    setApproval: async (status: SelectionApproval['status'], note: string) => {
      if (!activeJob) return;
      await setSelectionApprovalApi(activeJob.id, status, note.trim());
      await refreshRemote();
    },
    setScoringWeights: async (weights: SelectionScoringWeights) => {
      if (!activeJob) return;
      await setSelectionScoringApi(activeJob.id, weights);
      await refreshRemote();
    },
    refreshRemote,
    retryLoad: () => dispatch({ type: 'RETRY_LOAD' }),
  };

  return { state, activeJob, rows: [...rows].sort(compareRows), tabRows: [...tabRows].sort(compareRows), selectedRow, approval, scoringWeights, suitability, history, metrics, visibleJobs: state.jobs, actions };
};
