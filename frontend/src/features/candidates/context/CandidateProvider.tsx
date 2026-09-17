import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { CandidateContext } from './CandidateContextObject';
import type { Candidate, CandidateAction, CandidateState } from './CandidateContext';
import type { CandidateStatus } from '../types/candidate';
import { loadCandidates, saveCandidates } from '../services/candidateRepository';

const initialState: CandidateState = { loadState: 'loading', errorMessage: null, candidates: [], filters: { search: '', status: 'all', profession: 'all' }, selectedCandidateId: null, isAddDrawerOpen: false, rejectionCandidateId: null };

const makeEventId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `event-${Date.now()}`);
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const statusTitle = (status: CandidateStatus): string => ({ new: 'Candidate added', screening: 'Screening started', interview: 'Moved to interview', selected: 'Selected', reserve: 'Placed on reserve', rejected: 'Rejected' }[status]);
const statusDetail = (status: CandidateStatus): string => ({ new: 'Candidate is ready for screening.', screening: 'Recruiter is checking job fit.', interview: 'Candidate is ready for interview assessment.', selected: 'Candidate was added to the selection shortlist.', reserve: 'Candidate remains available as a reserve option.', rejected: 'A structured rejection decision was recorded.' }[status]);
const statusTone = (status: CandidateStatus): 'neutral' | 'positive' | 'warning' | 'negative' => status === 'rejected' ? 'negative' : status === 'selected' ? 'positive' : status === 'reserve' || status === 'screening' ? 'warning' : 'neutral';

const candidateReducer = (state: CandidateState, action: CandidateAction): CandidateState => {
  switch (action.type) {
    case 'HYDRATE': return { ...state, loadState: 'success', errorMessage: null, candidates: action.candidates, selectedCandidateId: action.candidates[0]?.id ?? null };
    case 'LOAD_ERROR': return { ...state, loadState: 'error', errorMessage: action.message };
    case 'SET_SEARCH': return { ...state, filters: { ...state.filters, search: action.value } };
    case 'SET_STATUS_FILTER': return { ...state, filters: { ...state.filters, status: action.value } };
    case 'SET_PROFESSION_FILTER': return { ...state, filters: { ...state.filters, profession: action.value } };
    case 'SELECT_CANDIDATE': return { ...state, selectedCandidateId: action.candidateId };
    case 'OPEN_ADD_DRAWER': return { ...state, isAddDrawerOpen: true };
    case 'CLOSE_ADD_DRAWER': return { ...state, isAddDrawerOpen: false };
    case 'ADD_CANDIDATE': return { ...state, candidates: [action.candidate, ...state.candidates], selectedCandidateId: action.candidate.id, isAddDrawerOpen: false };
    case 'UPDATE_STATUS': return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: action.status, journey: [{ id: makeEventId(), date: today(), title: statusTitle(action.status), detail: statusDetail(action.status), tone: statusTone(action.status) }, ...candidate.journey] } : candidate) };
    case 'OPEN_REJECTION_DIALOG': return { ...state, rejectionCandidateId: action.candidateId };
    case 'CLOSE_REJECTION_DIALOG': return { ...state, rejectionCandidateId: null };
    case 'REJECT_CANDIDATE': return { ...state, rejectionCandidateId: null, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: 'rejected', rejectionReason: action.reason, rejectionNote: action.note, journey: [{ id: makeEventId(), date: today(), title: 'Rejected', detail: `${action.reason}: ${action.note}`, tone: 'negative' }, ...candidate.journey] } : candidate) };
    default: return state;
  }
};

export const CandidateProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(candidateReducer, initialState);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const candidates = await loadCandidates();
        if (!cancelled) dispatch({ type: 'HYDRATE', candidates });
      } catch {
        if (!cancelled) dispatch({ type: 'LOAD_ERROR', message: 'Candidate data could not be loaded. Retry to restore the local workspace.' });
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state.loadState !== 'success') return;
    void saveCandidates(state.candidates).catch(() => undefined);
  }, [state.candidates, state.loadState]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CandidateContext.Provider value={value}>{children}</CandidateContext.Provider>;
};
