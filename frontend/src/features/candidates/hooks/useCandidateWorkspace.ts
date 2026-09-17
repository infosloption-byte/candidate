import { useMemo } from 'react';
import { useCandidateContext } from './useCandidateContext';
import type { Candidate, CandidateFilters, CandidateStatus } from '../types/candidate';

export const useCandidateWorkspace = () => {
  const { state, dispatch } = useCandidateContext();
  const visibleCandidates = useMemo(() => {
    const query = state.filters.search.trim().toLowerCase();
    return state.candidates.filter((candidate) => {
      const haystack = [candidate.name, candidate.reference, candidate.profession, candidate.location, ...candidate.secondarySkills, ...candidate.overseasCountries].join(' ').toLowerCase();
      return (!query || haystack.includes(query)) && (state.filters.status === 'all' || candidate.status === state.filters.status) && (state.filters.profession === 'all' || candidate.profession === state.filters.profession);
    });
  }, [state.candidates, state.filters]);

  const selectedCandidate = useMemo<Candidate | null>(() => state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) ?? visibleCandidates[0] ?? state.candidates[0] ?? null, [state.candidates, state.selectedCandidateId, visibleCandidates]);
  const rejectionCandidate = useMemo<Candidate | null>(() => state.candidates.find((candidate) => candidate.id === state.rejectionCandidateId) ?? null, [state.candidates, state.rejectionCandidateId]);
  const professions = useMemo(() => ['all', ...Array.from(new Set(state.candidates.map((candidate) => candidate.profession)))], [state.candidates]);
  const metrics = useMemo(() => ({
    total: state.candidates.length,
    available: state.candidates.filter((candidate) => candidate.availability === 'Available now').length,
    interviewing: state.candidates.filter((candidate) => candidate.status === 'interview').length,
    selected: state.candidates.filter((candidate) => candidate.status === 'selected').length,
    attention: state.candidates.filter((candidate) => candidate.status === 'rejected' || Object.values(candidate.documents).some((status) => status !== 'verified')).length,
  }), [state.candidates]);

  return {
    state,
    visibleCandidates,
    selectedCandidate,
    rejectionCandidate,
    professions,
    metrics,
    actions: {
      setSearch: (value: string) => dispatch({ type: 'SET_SEARCH', value }),
      setStatus: (value: CandidateStatus | 'all') => dispatch({ type: 'SET_STATUS_FILTER', value }),
      setProfession: (value: string) => dispatch({ type: 'SET_PROFESSION_FILTER', value }),
      selectCandidate: (candidateId: string) => dispatch({ type: 'SELECT_CANDIDATE', candidateId }),
      openAddCandidate: () => dispatch({ type: 'OPEN_ADD_DRAWER' }),
      closeAddCandidate: () => dispatch({ type: 'CLOSE_ADD_DRAWER' }),
      createCandidate: (candidate: Candidate) => dispatch({ type: 'ADD_CANDIDATE', candidate }),
      moveToScreening: (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'screening' }),
      moveToInterview: (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'interview' }),
      selectCandidateForJob: (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'selected' }),
      moveToReserve: (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'reserve' }),
      openRejection: (candidateId: string) => dispatch({ type: 'OPEN_REJECTION_DIALOG', candidateId }),
      closeRejection: () => dispatch({ type: 'CLOSE_REJECTION_DIALOG' }),
      rejectCandidate: (candidateId: string, reason: import('../types/candidate').RejectionReason, note: string) => dispatch({ type: 'REJECT_CANDIDATE', candidateId, reason, note }),
    },
  };
};
