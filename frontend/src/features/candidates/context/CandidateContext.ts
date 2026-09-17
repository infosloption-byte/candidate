import type { Dispatch } from 'react';
import type { Candidate, CandidateFilters, CandidateSmartFilters, CandidateStatus, RejectionReason } from '../types/candidate';

export type CandidateLoadState = 'loading' | 'error' | 'success';

export interface CandidateState {
  loadState: CandidateLoadState;
  errorMessage: string | null;
  loadAttempt: number;
  candidates: Candidate[];
  filters: CandidateFilters;
  smartFilters: CandidateSmartFilters;
  selectedCandidateId: string | null;
  compareCandidateIds: string[];
  isAddDrawerOpen: boolean;
  rejectionCandidateId: string | null;
}

export type CandidateAction =
  | { type: 'HYDRATE'; candidates: Candidate[] }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'RETRY_LOAD' }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_STATUS_FILTER'; value: CandidateStatus | 'all' }
  | { type: 'SET_PROFESSION_FILTER'; value: string }
  | { type: 'SET_SMART_FILTERS'; filters: CandidateSmartFilters }
  | { type: 'TOGGLE_SKILL_FILTER'; skill: string }
  | { type: 'CLEAR_SMART_FILTERS' }
  | { type: 'SELECT_CANDIDATE'; candidateId: string }
  | { type: 'TOGGLE_COMPARE_CANDIDATE'; candidateId: string }
  | { type: 'CLEAR_COMPARISON' }
  | { type: 'OPEN_ADD_DRAWER' }
  | { type: 'CLOSE_ADD_DRAWER' }
  | { type: 'ADD_CANDIDATE'; candidate: Candidate }
  | { type: 'UPDATE_STATUS'; candidateId: string; status: CandidateStatus }
  | { type: 'OPEN_REJECTION_DIALOG'; candidateId: string }
  | { type: 'CLOSE_REJECTION_DIALOG' }
  | { type: 'REJECT_CANDIDATE'; candidateId: string; reason: RejectionReason; note: string };

export interface CandidateContextValue {
  state: CandidateState;
  dispatch: Dispatch<CandidateAction>;
}
