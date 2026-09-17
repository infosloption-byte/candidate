import type { Dispatch } from 'react';
import type { Candidate, CandidateFilters, CandidateSavedFilter, CandidateSmartFilters, CandidateStatus, RejectionReason } from '../types/candidate';

export type CandidateLoadState = 'loading' | 'error' | 'success';

export interface CandidateState {
  loadState: CandidateLoadState;
  errorMessage: string | null;
  loadAttempt: number;
  candidates: Candidate[];
  filters: CandidateFilters;
  smartFilters: CandidateSmartFilters;
  savedFilters: CandidateSavedFilter[];
  activeSavedFilterId: string | null;
  selectedCandidateId: string | null;
  compareCandidateIds: string[];
  comparisonMinimized: boolean;
  comparisonHeight: number;
  isAddDrawerOpen: boolean;
  rejectionCandidateId: string | null;
}

export type CandidateAction =
  | { type: 'HYDRATE'; candidates: Candidate[]; savedFilters: CandidateSavedFilter[]; comparisonMinimized: boolean; comparisonHeight: number }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'RETRY_LOAD' }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_STATUS_FILTER'; value: CandidateStatus | 'all' }
  | { type: 'SET_PROFESSION_FILTER'; value: string }
  | { type: 'SET_SMART_FILTERS'; filters: CandidateSmartFilters }
  | { type: 'TOGGLE_SKILL_FILTER'; skill: string }
  | { type: 'CLEAR_SMART_FILTERS' }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'SAVE_FILTER'; filter: CandidateSavedFilter }
  | { type: 'APPLY_SAVED_FILTER'; filter: CandidateSavedFilter }
  | { type: 'DELETE_SAVED_FILTER'; filterId: string }
  | { type: 'SELECT_CANDIDATE'; candidateId: string }
  | { type: 'TOGGLE_COMPARE_CANDIDATE'; candidateId: string }
  | { type: 'CLEAR_COMPARISON' }
  | { type: 'SET_COMPARISON_MINIMIZED'; value: boolean }
  | { type: 'SET_COMPARISON_HEIGHT'; value: number }
  | { type: 'ADD_TAG'; candidateId: string; tag: string }
  | { type: 'REMOVE_TAG'; candidateId: string; tag: string }
  | { type: 'OPEN_ADD_DRAWER' }
  | { type: 'CLOSE_ADD_DRAWER' }
  | { type: 'ADD_CANDIDATE'; candidate: Candidate }
  | { type: 'UPDATE_STATUS'; candidateId: string; status: CandidateStatus }
  | { type: 'BULK_UPDATE_STATUS'; candidateIds: string[]; status: CandidateStatus }
  | { type: 'RECORD_INTERVIEW_OUTCOME'; candidateId: string; status: Extract<CandidateStatus, 'selected' | 'reserve' | 'rejected'>; interviewDate: string; interviewer: string; profession: string; score: number; reason: RejectionReason | ''; note: string }
  | { type: 'OPEN_REJECTION_DIALOG'; candidateId: string }
  | { type: 'CLOSE_REJECTION_DIALOG' }
  | { type: 'REJECT_CANDIDATE'; candidateId: string; reason: RejectionReason; note: string };

export interface CandidateContextValue {
  state: CandidateState;
  dispatch: Dispatch<CandidateAction>;
}
