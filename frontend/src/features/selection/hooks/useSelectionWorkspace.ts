import { useMemo } from 'react';
import { useSelectionContext } from '../context/useSelectionContext';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import type { Candidate } from '../../candidates/types/candidate';
import type { SelectionDecision, SelectionJob, SelectionRecord, SelectionTab } from '../types/selection';

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
  const matched = job.requiredSkills.filter((skill) => candidateSkills.has(skill.toLowerCase()) || candidateSkills.has(candidate.profession.toLowerCase()));
  return matched.length / job.requiredSkills.length;
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

  return {
    candidate,
    record,
    skillMatchCount,
    skillMatchTotal,
    skillMatchPercent: Math.round(coverage * 100),
    experienceMeets: candidate.experienceYears >= job.requiredExperience,
    documentsReady: documentReady(candidate),
    interviewScore: candidate.lastInterview?.score ?? null,
    evidenceFlags,
  };
};

const compareRows = (left: SelectionCandidateRow, right: SelectionCandidateRow): number => {
  const leftDecision = left.record?.decision ?? 'recommended';
  const rightDecision = right.record?.decision ?? 'recommended';
  const decisionRank: Record<SelectionDecision, number> = { selected: 0, recommended: 1, reserve: 2, rejected: 3 };
  if (decisionRank[leftDecision] !== decisionRank[rightDecision]) return decisionRank[leftDecision] - decisionRank[rightDecision];
  const leftScore = left.interviewScore ?? 0;
  const rightScore = right.interviewScore ?? 0;
  return rightScore - leftScore || right.candidate.fitScore - left.candidate.fitScore;
};

export const useSelectionWorkspace = () => {
  const { state, dispatch } = useSelectionContext();
  const { state: candidateState } = useCandidateWorkspace();

  const activeJob = useMemo<SelectionJob | null>(() => state.jobs.find((job) => job.id === state.activeJobId) ?? state.jobs[0] ?? null, [state.jobs, state.activeJobId]);

  const rows = useMemo(() => {
    if (!activeJob) return [];
    return candidateState.candidates
      .filter((candidate) => roleMatches(candidate, activeJob))
      .filter((candidate) => Boolean(candidate.lastInterview) || candidate.status === 'selected' || candidate.status === 'reserve')
      .map((candidate) => rowFor(candidate, activeJob, state.records));
  }, [activeJob, candidateState.candidates, state.records]);

  const tabRows = useMemo(() => {
    const tab = state.activeTab;
    if (tab === 'recommended') return rows.filter((row) => row.record?.decision !== 'selected' && row.record?.decision !== 'reserve' && row.record?.decision !== 'rejected');
    return rows.filter((row) => row.record?.decision === tab);
  }, [rows, state.activeTab]);

  const selectedRow = useMemo(() => rows.find((row) => row.candidate.id === state.selectedCandidateId) ?? tabRows[0] ?? rows[0] ?? null, [rows, state.selectedCandidateId, tabRows]);

  const metrics = useMemo(() => {
    if (!activeJob) return { total: 0, recommended: 0, selected: 0, reserve: 0, rejected: 0, remaining: 0, readyToSelect: 0, approvalReady: false };
    const selected = rows.filter((row) => row.record?.decision === 'selected').length;
    const reserve = rows.filter((row) => row.record?.decision === 'reserve').length;
    const rejected = rows.filter((row) => row.record?.decision === 'rejected').length;
    const recommended = rows.filter((row) => row.record?.decision === 'recommended' || !row.record).length;
    const readyToSelect = rows.filter((row) => row.experienceMeets && row.skillMatchPercent >= 50 && row.candidate.locationReady).length;
    return { total: rows.length, recommended, selected, reserve, rejected, remaining: Math.max(activeJob.openings - selected, 0), readyToSelect, approvalReady: selected > 0 && selected <= activeJob.openings };
  }, [activeJob, rows]);

  const setJob = (jobId: string) => dispatch({ type: 'SET_JOB', jobId });
  const setTab = (tab: SelectionTab) => dispatch({ type: 'SET_TAB', tab });
  const selectCandidate = (candidateId: string | null) => dispatch({ type: 'SELECT_CANDIDATE', candidateId });

  const saveDecision = (candidateId: string, decision: SelectionDecision, reason: string, note: string) => {
    if (!activeJob) return;
    const record: SelectionRecord = {
      candidateId,
      jobId: activeJob.id,
      decision,
      reason: reason.trim(),
      note: note.trim(),
      decidedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      decidedBy: 'Current recruiter',
    };
    dispatch({ type: 'SAVE_DECISION', record });
  };

  const setApproval = (status: 'draft' | 'pending' | 'approved' | 'returned', note: string) => dispatch({ type: 'SET_APPROVAL', status, note });

  return {
    state,
    activeJob,
    rows: [...rows].sort(compareRows),
    tabRows: [...tabRows].sort(compareRows),
    selectedRow,
    metrics,
    visibleJobs: state.jobs,
    actions: { setJob, setTab, selectCandidate, saveDecision, setApproval, retryLoad: () => dispatch({ type: 'RETRY_LOAD' }) },
  };
};
