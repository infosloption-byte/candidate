import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { SelectionContext } from './SelectionContextObject';
import { loadSelectionApproval, loadSelectionJobs, loadSelectionRecords, saveSelectionApproval, saveSelectionRecords } from '../services/selectionRepository';
import type { ApprovalStatus, SelectionAction, SelectionState } from '../types/selection';

const initialState: SelectionState = {
  loadState: 'loading',
  errorMessage: null,
  loadAttempt: 0,
  jobs: [],
  records: [],
  activeJobId: null,
  activeTab: 'recommended',
  selectedCandidateId: null,
  approvalByJob: {},
};

const isApprovalStatus = (value: unknown): value is ApprovalStatus => ['draft', 'pending', 'approved', 'returned'].includes(value as string);

const reducer = (state: SelectionState, action: SelectionAction): SelectionState => {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        loadState: 'success',
        errorMessage: null,
        jobs: action.jobs,
        records: action.records,
        approvalByJob: action.approvalByJob,
        activeJobId: state.activeJobId ?? action.jobs[0]?.id ?? null,
        selectedCandidateId: null,
      };
    case 'LOAD_ERROR':
      return { ...state, loadState: 'error', errorMessage: action.message };
    case 'RETRY_LOAD':
      return { ...state, loadState: 'loading', errorMessage: null, loadAttempt: state.loadAttempt + 1 };
    case 'SET_JOB':
      return { ...state, activeJobId: action.jobId, activeTab: 'recommended', selectedCandidateId: null };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, selectedCandidateId: null };
    case 'SELECT_CANDIDATE':
      return { ...state, selectedCandidateId: action.candidateId };
    case 'SAVE_DECISION': {
      const sameCandidate = (record: typeof action.record) => record.candidateId === action.record.candidateId && record.jobId === action.record.jobId;
      const nextRecords = [action.record, ...state.records.filter((record) => !sameCandidate(record))];
      const jobApproval = state.approvalByJob[action.record.jobId];
      return {
        ...state,
        records: nextRecords,
        approvalByJob: jobApproval?.status === 'approved'
          ? { ...state.approvalByJob, [action.record.jobId]: { status: 'draft', note: '' } }
          : state.approvalByJob,
      };
    }
    case 'SET_APPROVAL':
      return { ...state, approvalByJob: { ...state.approvalByJob, [action.jobId]: { status: action.status, note: action.note } } };
    default:
      return state;
  }
};

export const SelectionProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const [jobs, records, approvalByJob] = await Promise.all([loadSelectionJobs(), loadSelectionRecords(), loadSelectionApproval()]);
        const normalizedApproval = Object.fromEntries(Object.entries(approvalByJob).map(([jobId, approval]) => [jobId, { status: isApprovalStatus(approval.status) ? approval.status : 'draft', note: approval.note }]));
        if (!cancelled) dispatch({ type: 'HYDRATE', jobs, records, approvalByJob: normalizedApproval });
      } catch {
        if (!cancelled) dispatch({ type: 'LOAD_ERROR', message: 'Selection data could not be loaded. Retry to restore the selection board.' });
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [state.loadAttempt]);

  useEffect(() => {
    if (state.loadState !== 'success') return;
    void saveSelectionRecords(state.records).catch(() => undefined);
    void saveSelectionApproval(state.approvalByJob).catch(() => undefined);
  }, [state.records, state.approvalByJob, state.loadState]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};
