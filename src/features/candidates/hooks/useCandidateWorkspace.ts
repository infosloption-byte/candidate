import { useMemo } from 'react';
import { useCandidateContext } from '../context/CandidateContext';
import type { Candidate, CandidateFilters, CandidateStatus } from '../types/candidate';

export const useCandidateWorkspace = () => {
  const { state, dispatch } = useCandidateContext();

  const visibleCandidates = useMemo(() => {
    const query = state.filters.search.trim().toLowerCase();
    return state.candidates.filter((candidate) => {
      const matchesQuery = !query || [candidate.name, candidate.reference, candidate.profession, ...candidate.secondarySkills].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = state.filters.status === 'all' || candidate.status === state.filters.status;
      const matchesProfession = state.filters.profession === 'all' || candidate.profession === state.filters.profession;
      return matchesQuery && matchesStatus && matchesProfession;
    });
  }, [state.candidates, state.filters]);

  const selectedCandidate = useMemo<Candidate | null>(() => {
    const selected = state.candidates.find((candidate) => candidate.id === state.selectedCandidateId);
    return selected ?? state.candidates[0] ?? null;
  }, [state.candidates, state.selectedCandidateId]);

  const rejectionCandidate = useMemo<Candidate | null>(() => state.candidates.find((candidate) => candidate.id === state.rejectionCandidateId) ?? null, [state.candidates, state.rejectionCandidateId]);

  const professions = useMemo(() => ['all', ...Array.from(new Set(state.candidates.map((candidate) => candidate.profession)))], [state.candidates]);

  const metrics = useMemo(() => ({
    total: state.candidates.length,
    ready: state.candidates.filter((candidate) => candidate.availability === 'Available now').length,
    interviewing: state.candidates.filter((candidate) => candidate.status === 'interview').length,
    selected: state.candidates.filter((candidate) => candidate.status === 'selected').length,
    attention: state.candidates.filter((candidate) => candidate.status === 'rejected' || candidate.documents.passport !== 'verified').length,
  }), [state.candidates]);

  const setSearch = (value: string) => dispatch({ type: 'SET_SEARCH', value });
  const setStatus = (value: CandidateStatus | 'all') => dispatch({ type: 'SET_STATUS_FILTER', value });
  const setProfession = (value: string) => dispatch({ type: 'SET_PROFESSION_FILTER', value });
  const selectCandidate = (candidateId: string) => dispatch({ type: 'SELECT_CANDIDATE', candidateId });
  const openAddCandidate = () => dispatch({ type: 'OPEN_ADD_DRAWER' });
  const closeAddCandidate = () => dispatch({ type: 'CLOSE_ADD_DRAWER' });
  const createCandidate = (candidate: Candidate) => dispatch({ type: 'ADD_CANDIDATE', candidate });
  const moveToScreening = (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'screening' });
  const moveToInterview = (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'interview' });
  const selectCandidateForJob = (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'selected' });
  const moveToReserve = (candidateId: string) => dispatch({ type: 'UPDATE_STATUS', candidateId, status: 'reserve' });
  const openRejection = (candidateId: string) => dispatch({ type: 'OPEN_REJECTION_DIALOG', candidateId });
  const closeRejection = () => dispatch({ type: 'CLOSE_REJECTION_DIALOG' });
  const rejectCandidate = (reason: string, note: string) => {
    if (!rejectionCandidate) return;
    dispatch({ type: 'REJECT_CANDIDATE', candidateId: rejectionCandidate.id, reason, note });
  };

  return {
    state,
    filters: state.filters as CandidateFilters,
    visibleCandidates,
    selectedCandidate,
    rejectionCandidate,
    professions,
    metrics,
    actions: {
      setSearch,
      setStatus,
      setProfession,
      selectCandidate,
      openAddCandidate,
      closeAddCandidate,
      createCandidate,
      moveToScreening,
      moveToInterview,
      selectCandidateForJob,
      moveToReserve,
      openRejection,
      closeRejection,
      rejectCandidate,
    },
  };
};
