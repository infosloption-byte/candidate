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
  approvalStatus: 'draft',
  approvalNote: '',
};

const reducer = (state: SelectionState, action: SelectionAction): SelectionState => {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        loadState: 'success',
        errorMessage: null,
        jobs: action.jobs,
        records: action.records,
        activeJobId: state.activeJobId ?? action.jobs[0]?.id ?? null,
        approvalStatus: action.approvalStatus,
        approvalNote: action.approvalNote,
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
      return { ...state, records: [action.record, ...state.records.filter((record) => !sameCandidate(record))], approvalStatus: state.approvalStatus === 'approved' ? 'draft' : state.approvalStatus };
    }
    case 'SET_APPROVAL':
      return { ...state, approvalStatus: action.status, approvalNote: action.note };
    default:
      return state;
  }
};

const isApprovalStatus = (value: unknown): value is ApprovalStatus => ['draft', 'pending', 'approved', 'returned'].includes(value as string);

export const SelectionProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const [jobs, records, approval] = await Promise.all([loadSelectionJobs(), loadSelectionRecords(), loadSelectionApproval()]);
        if (!cancelled) dispatch({ type: 'HYDRATE', jobs, records, approvalStatus: isApprovalStatus(approval.status) ? approval.status : 'draft', approvalNote: approval.note });
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
    void saveSelectionApproval({ status: state.approvalStatus, note: state.approvalNote }).catch(() => undefined);
  }, [state.records, state.approvalNote, state.approvalStatus, state.loadState]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
};
