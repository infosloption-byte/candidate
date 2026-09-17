import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { SelectionContext } from './SelectionContextObject';
import { loadSelectionApproval, loadSelectionHistory, loadSelectionJobs, loadSelectionRecords, loadSelectionScoring, saveSelectionApproval, saveSelectionHistory, saveSelectionJobs, saveSelectionRecords, saveSelectionScoring } from '../services/selectionRepository';
import { defaultSelectionScoringWeights } from '../types/selection';
import type { ApprovalStatus, SelectionAction, SelectionHistoryEntry, SelectionRecord, SelectionScoringWeights, SelectionState } from '../types/selection';

const initialState: SelectionState = { loadState: 'loading', errorMessage: null, loadAttempt: 0, jobs: [], records: [], history: [], scoringByJob: {}, activeJobId: null, activeTab: 'recommended', selectedCandidateId: null, approvalByJob: {} };
const isApprovalStatus = (value: unknown): value is ApprovalStatus => ['draft', 'pending', 'approved', 'returned'].includes(value as string);
const recordKey = (record: SelectionRecord): string => `${record.candidateId}::${record.jobId}`;
const decisionHistory = (record: SelectionRecord, previous: SelectionRecord | undefined): SelectionHistoryEntry => ({ candidateId: record.candidateId, jobId: record.jobId, action: 'decision_changed', fromDecision: previous?.decision ?? null, toDecision: record.decision, reason: record.reason, note: record.note, occurredAt: record.decidedAt, occurredBy: record.decidedBy });
const resetApprovedJobs = (approvalByJob: SelectionState['approvalByJob'], jobIds: string[]): SelectionState['approvalByJob'] => Array.from(new Set(jobIds)).reduce((next, jobId) => next[jobId]?.status === 'approved' ? { ...next, [jobId]: { status: 'draft', note: '' } } : next, approvalByJob);
const normalizeScoring = (weights: SelectionScoringWeights): SelectionScoringWeights => {
  const safe = Object.fromEntries(Object.entries(defaultSelectionScoringWeights).map(([key, fallback]) => [key, Math.max(0, Math.min(100, Number.isFinite(weights[key as keyof SelectionScoringWeights]) ? weights[key as keyof SelectionScoringWeights] : fallback))])) as SelectionScoringWeights;
  const total = Object.values(safe).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return defaultSelectionScoringWeights;
  const normalized = Object.fromEntries(Object.entries(safe).map(([key, value]) => [key, Math.round((value / total) * 100)])) as SelectionScoringWeights;
  let remainder = 100 - Object.values(normalized).reduce((sum, value) => sum + value, 0);
  for (const key of Object.keys(normalized) as Array<keyof SelectionScoringWeights>) { if (remainder === 0) break; normalized[key] += remainder > 0 ? 1 : -1; remainder += remainder > 0 ? -1 : 1; }
  return normalized;
};

const reducer = (state: SelectionState, action: SelectionAction): SelectionState => {
  switch (action.type) {
    case 'HYDRATE': return { ...state, loadState: 'success', errorMessage: null, jobs: action.jobs, records: action.records, history: action.history, scoringByJob: action.scoringByJob, approvalByJob: action.approvalByJob, activeJobId: state.activeJobId ?? action.jobs[0]?.id ?? null, selectedCandidateId: null };
    case 'LOAD_ERROR': return { ...state, loadState: 'error', errorMessage: action.message };
    case 'RETRY_LOAD': return { ...state, loadState: 'loading', errorMessage: null, loadAttempt: state.loadAttempt + 1 };
    case 'SET_JOB': return { ...state, activeJobId: action.jobId, activeTab: 'recommended', selectedCandidateId: null };
    case 'SET_TAB': return { ...state, activeTab: action.tab, selectedCandidateId: null };
    case 'SELECT_CANDIDATE': return { ...state, selectedCandidateId: action.candidateId };
    case 'SAVE_DECISION': { const key = recordKey(action.record); const previous = state.records.find((record) => recordKey(record) === key); return { ...state, records: [action.record, ...state.records.filter((record) => recordKey(record) !== key)], history: [decisionHistory(action.record, previous), ...state.history], approvalByJob: resetApprovedJobs(state.approvalByJob, [action.record.jobId]) }; }
    case 'BULK_SAVE_DECISIONS': { if (action.records.length === 0) return state; const changedKeys = new Set(action.records.map(recordKey)); const nextRecords = [...action.records, ...state.records.filter((record) => !changedKeys.has(recordKey(record)))]; const historyEntries = action.records.map((record) => decisionHistory(record, state.records.find((previous) => recordKey(previous) === recordKey(record)))); return { ...state, records: nextRecords, history: [...historyEntries, ...state.history], approvalByJob: resetApprovedJobs(state.approvalByJob, action.records.map((record) => record.jobId)) }; }
    case 'REASSIGN_CANDIDATES': { if (action.fromJobId === action.toJobId || action.candidateIds.length === 0) return state; const uniqueCandidateIds = Array.from(new Set(action.candidateIds)); const targetCandidateIds = new Set(state.records.filter((record) => record.jobId === action.toJobId).map((record) => record.candidateId)); const eligibleCandidateIds = uniqueCandidateIds.filter((candidateId) => !targetCandidateIds.has(candidateId)); if (eligibleCandidateIds.length === 0) return state; const eligibleIds = new Set(eligibleCandidateIds); const sourceRecords = state.records.filter((record) => record.jobId === action.fromJobId && eligibleIds.has(record.candidateId)); const recordsToCreate: SelectionRecord[] = eligibleCandidateIds.map((candidateId) => ({ candidateId, jobId: action.toJobId, decision: 'recommended', reason: action.reason, note: action.note, decidedAt: action.occurredAt, decidedBy: action.occurredBy })); const sourceKeys = new Set(sourceRecords.map(recordKey)); const historyEntries = eligibleCandidateIds.map((candidateId) => ({ candidateId, jobId: action.fromJobId, relatedJobId: action.toJobId, action: 'reassigned' as const, fromDecision: sourceRecords.find((record) => record.candidateId === candidateId)?.decision ?? null, toDecision: 'recommended' as const, reason: action.reason, note: action.note, occurredAt: action.occurredAt, occurredBy: action.occurredBy } satisfies SelectionHistoryEntry)); return { ...state, records: [...recordsToCreate, ...state.records.filter((record) => !sourceKeys.has(recordKey(record)))], history: [...historyEntries, ...state.history], approvalByJob: resetApprovedJobs(state.approvalByJob, [action.fromJobId]), selectedCandidateId: eligibleIds.has(state.selectedCandidateId ?? '') ? null : state.selectedCandidateId }; }
    case 'SET_APPROVAL': { const previous = state.approvalByJob[action.jobId]?.status ?? 'draft'; const historyEntry: SelectionHistoryEntry = { candidateId: null, jobId: action.jobId, action: 'approval_changed', reason: `Approval ${previous} → ${action.status}`, note: action.note, occurredAt: action.changedAt, occurredBy: action.changedBy }; return { ...state, approvalByJob: { ...state.approvalByJob, [action.jobId]: { status: action.status, note: action.note } }, history: [historyEntry, ...state.history] }; }
    case 'SET_SCORING_WEIGHTS': return { ...state, scoringByJob: { ...state.scoringByJob, [action.jobId]: normalizeScoring(action.weights) } };
    default: return state;
  }
};

export const SelectionProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const [jobs, records, history, approvalByJob, scoringByJob] = await Promise.all([loadSelectionJobs(), loadSelectionRecords(), loadSelectionHistory(), loadSelectionApproval(), loadSelectionScoring()]);
        const normalizedApproval = Object.fromEntries(Object.entries(approvalByJob).map(([jobId, approval]) => [jobId, { status: isApprovalStatus(approval.status) ? approval.status : 'draft', note: approval.note }]));
        const normalizedScoring = Object.fromEntries(jobs.map((job) => [job.id, normalizeScoring(scoringByJob[job.id] ?? defaultSelectionScoringWeights)]));
        if (!cancelled) dispatch({ type: 'HYDRATE', jobs, records, history, approvalByJob: normalizedApproval, scoringByJob: normalizedScoring });
      } catch { if (!cancelled) dispatch({ type: 'LOAD_ERROR', message: 'Selection data could not be loaded. Retry to restore the selection board.' }); }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [state.loadAttempt]);
  useEffect(() => { if (state.loadState !== 'success') return; void saveSelectionRecords(state.records).catch(() => undefined); void saveSelectionHistory(state.history).catch(() => undefined); void saveSelectionApproval(state.approvalByJob).catch(() => undefined); void saveSelectionScoring(state.scoringByJob).catch(() => undefined); }, [state.records, state.history, state.approvalByJob, state.scoringByJob, state.loadState]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};
