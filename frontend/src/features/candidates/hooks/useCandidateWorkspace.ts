import { useMemo } from 'react';
import { useCandidateContext } from './useCandidateContext';
import { findDuplicateMatches } from '../services/candidateMatching';
import { createCandidateApi, updateCandidateApi, updateCandidateStatusApi } from '../services/candidateApi';
import type { Candidate, CandidateFilters, CandidateSavedFilter, CandidateSmartFilters, CandidateStatus, RejectionReason } from '../types/candidate';

const documentReady = (candidate: Candidate): boolean => Object.values(candidate.documents).every((status) => status === 'verified');
const createId = (prefix: string): string => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`);

export const useCandidateWorkspace = () => {
  const { state, dispatch } = useCandidateContext();
  const visibleCandidates = useMemo(() => {
    const query = state.filters.search.trim().toLowerCase();
    const smart = state.smartFilters;
    return state.candidates.filter((candidate) => {
      const haystack = [candidate.name, candidate.reference, candidate.profession, candidate.originalProfession, candidate.location, candidate.phone, candidate.passportNumber, ...candidate.secondarySkills, ...candidate.overseasCountries, ...(candidate.tags ?? [])].join(' ').toLowerCase();
      const matchesKeyword = !query || haystack.includes(query);
      const matchesStatus = state.filters.status === 'all' || candidate.status === state.filters.status;
      const matchesProfession = state.filters.profession === 'all' || candidate.profession === state.filters.profession;
      const matchesMinExperience = smart.minExperience === null || candidate.experienceYears >= smart.minExperience;
      const matchesMaxExperience = smart.maxExperience === null || candidate.experienceYears <= smart.maxExperience;
      const matchesEnglish = smart.englishLevel === 'all' || candidate.englishLevel === smart.englishLevel;
      const matchesAvailability = smart.availability === 'all' || candidate.availability === smart.availability;
      const matchesOverseas = smart.overseasExperience === 'all' || (smart.overseasExperience === 'yes' && candidate.overseasCountries.length > 0) || (smart.overseasExperience === 'no' && candidate.overseasCountries.length === 0);
      const matchesDriving = smart.drivingLicense === 'all' || (smart.drivingLicense === 'yes' && candidate.drivingLicense) || (smart.drivingLicense === 'no' && !candidate.drivingLicense);
      const matchesDocuments = smart.documentReadiness === 'all' || (smart.documentReadiness === 'ready' && documentReady(candidate)) || (smart.documentReadiness === 'attention' && !documentReady(candidate));
      const matchesSkills = smart.skills.length === 0 || smart.skills.every((skill) => candidate.secondarySkills.includes(skill));
      return matchesKeyword && matchesStatus && matchesProfession && matchesMinExperience && matchesMaxExperience && matchesEnglish && matchesAvailability && matchesOverseas && matchesDriving && matchesDocuments && matchesSkills;
    });
  }, [state.candidates, state.filters, state.smartFilters]);
  const selectedCandidate = useMemo<Candidate | null>(() => state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) ?? visibleCandidates[0] ?? state.candidates[0] ?? null, [state.candidates, state.selectedCandidateId, visibleCandidates]);
  const rejectionCandidate = useMemo<Candidate | null>(() => state.candidates.find((candidate) => candidate.id === state.rejectionCandidateId) ?? null, [state.candidates, state.rejectionCandidateId]);
  const compareCandidates = useMemo(() => state.compareCandidateIds.map((id) => state.candidates.find((candidate) => candidate.id === id)).filter((candidate): candidate is Candidate => Boolean(candidate)), [state.candidates, state.compareCandidateIds]);
  const duplicateMatches = useMemo(() => selectedCandidate ? findDuplicateMatches(state.candidates, selectedCandidate.id) : [], [selectedCandidate, state.candidates]);
  const professions = useMemo(() => ['all', ...Array.from(new Set(state.candidates.map((candidate) => candidate.profession))).sort()], [state.candidates]);
  const skillOptions = useMemo(() => Array.from(new Set(state.candidates.flatMap((candidate) => candidate.secondarySkills))).sort(), [state.candidates]);
  const smartFilterCount = useMemo(() => { const smart = state.smartFilters; return [smart.minExperience !== null, smart.maxExperience !== null, smart.englishLevel !== 'all', smart.availability !== 'all', smart.overseasExperience !== 'all', smart.drivingLicense !== 'all', smart.documentReadiness !== 'all', smart.skills.length > 0, state.filters.status !== 'all', state.filters.profession !== 'all'].filter(Boolean).length; }, [state.filters, state.smartFilters]);
  const metrics = useMemo(() => ({ total: state.candidates.length, available: state.candidates.filter((candidate) => candidate.availability === 'Available now').length, interviewing: state.candidates.filter((candidate) => candidate.status === 'interview').length, selected: state.candidates.filter((candidate) => candidate.status === 'selected').length, attention: state.candidates.filter((candidate) => candidate.status === 'rejected' || Object.values(candidate.documents).some((status) => status !== 'verified')).length }), [state.candidates]);

  return {
    state, visibleCandidates, selectedCandidate, rejectionCandidate, compareCandidates, duplicateMatches, professions, skillOptions, smartFilterCount, metrics,
    actions: {
      retryLoad: () => dispatch({ type: 'RETRY_LOAD' }),
      setSearch: (value: string) => dispatch({ type: 'SET_SEARCH', value }),
      setStatus: (value: CandidateStatus | 'all') => dispatch({ type: 'SET_STATUS_FILTER', value }),
      setProfession: (value: string) => dispatch({ type: 'SET_PROFESSION_FILTER', value }),
      setSmartFilters: (filters: CandidateSmartFilters) => dispatch({ type: 'SET_SMART_FILTERS', filters }),
      toggleSkillFilter: (skill: string) => dispatch({ type: 'TOGGLE_SKILL_FILTER', skill }),
      clearSmartFilters: () => dispatch({ type: 'CLEAR_SMART_FILTERS' }),
      clearAllFilters: () => dispatch({ type: 'CLEAR_ALL_FILTERS' }),
      saveCurrentFilter: (name: string) => { const filter: CandidateSavedFilter = { id: createId('filter'), name, filters: { ...state.filters }, smartFilters: { ...state.smartFilters, skills: [...state.smartFilters.skills] }, createdAt: new Date().toISOString() }; dispatch({ type: 'SAVE_FILTER', filter }); },
      applySavedFilter: (filter: CandidateSavedFilter) => dispatch({ type: 'APPLY_SAVED_FILTER', filter }),
      deleteSavedFilter: (filterId: string) => dispatch({ type: 'DELETE_SAVED_FILTER', filterId }),
      selectCandidate: (candidateId: string) => dispatch({ type: 'SELECT_CANDIDATE', candidateId }),
      toggleCompareCandidate: (candidateId: string) => dispatch({ type: 'TOGGLE_COMPARE_CANDIDATE', candidateId }),
      clearComparison: () => dispatch({ type: 'CLEAR_COMPARISON' }),
      setComparisonMinimized: (value: boolean) => dispatch({ type: 'SET_COMPARISON_MINIMIZED', value }),
      setComparisonHeight: (value: number) => dispatch({ type: 'SET_COMPARISON_HEIGHT', value }),
      addTag: async (candidateId: string, tag: string) => {
        const candidate = state.candidates.find((item) => item.id === candidateId);
        if (!candidate) return;
        const normalizedTag = tag.trim().replace(/\s+/g, ' ');
        if (!normalizedTag) return;
        const tags = candidate.tags ?? [];
        if (tags.some((item) => item.toLowerCase() === normalizedTag.toLowerCase())) return;
        const updated = await updateCandidateApi(candidateId, { tags: [...tags, normalizedTag] });
        dispatch({ type: 'REPLACE_CANDIDATE', candidate: updated });
      },
      removeTag: async (candidateId: string, tag: string) => {
        const candidate = state.candidates.find((item) => item.id === candidateId);
        if (!candidate) return;
        const updated = await updateCandidateApi(candidateId, { tags: (candidate.tags ?? []).filter((item) => item.toLowerCase() !== tag.toLowerCase()) });
        dispatch({ type: 'REPLACE_CANDIDATE', candidate: updated });
      },
      openAddCandidate: () => dispatch({ type: 'OPEN_ADD_DRAWER' }),
      closeAddCandidate: () => dispatch({ type: 'CLOSE_ADD_DRAWER' }),
      openBulkImport: () => dispatch({ type: 'OPEN_BULK_IMPORT' }),
      closeBulkImport: () => dispatch({ type: 'CLOSE_BULK_IMPORT' }),
      createCandidate: async (candidate: Candidate) => {
        const created = await createCandidateApi(candidate, false);
        dispatch({ type: 'ADD_CANDIDATE', candidate: created });
      },
      bulkImportCandidates: (candidates: Candidate[]) => dispatch({ type: 'BULK_ADD_CANDIDATES', candidates }),
      updateOnboarding: (candidateId: string, onboarding: Candidate['onboarding'], journeyEvent: Candidate['journey'][number]) => { if (onboarding) dispatch({ type: 'UPDATE_ONBOARDING', candidateId, onboarding, journeyEvent }); },
      updateProfile: async (candidateId: string, changes: Partial<Candidate>, journeyEvent: Candidate['journey'][number]) => {
        const {
          id: _id,
          reference: _reference,
          journey: _journey,
          documents: _documents,
          lastInterview: _lastInterview,
          rejectionReason: _rejectionReason,
          rejectionNote: _rejectionNote,
          createdAt: _createdAt,
          fitScore: _fitScore,
          onboarding: _onboarding,
          recruiterOwnerName: _recruiterOwnerName,
          status: _status,
          ...candidatePatch
        } = changes;
        const patch = candidatePatch.emergencyContact
          ? {
              ...candidatePatch,
              emergencyName: candidatePatch.emergencyContact.name,
              emergencyPhone: candidatePatch.emergencyContact.phone,
              emergencyRelationship: candidatePatch.emergencyContact.relationship,
              emergencyContact: undefined,
            }
          : candidatePatch;
        const updated = await updateCandidateApi(candidateId, patch);
        dispatch({ type: 'REPLACE_CANDIDATE', candidate: updated });
      },
      updateDocuments: (candidateId: string, documents: Candidate['documents'], journeyEvent: Candidate['journey'][number]) => dispatch({ type: 'UPDATE_DOCUMENTS', candidateId, documents, journeyEvent }),
      moveToScreening: async (candidateId: string) => dispatch({ type: 'REPLACE_CANDIDATE', candidate: await updateCandidateStatusApi(candidateId, 'screening') }),
      moveToInterview: async (candidateId: string) => dispatch({ type: 'REPLACE_CANDIDATE', candidate: await updateCandidateStatusApi(candidateId, 'interview') }),
      moveCandidatesToInterview: async (candidateIds: string[]) => {
        const updated = await Promise.all(candidateIds.map((candidateId) => updateCandidateStatusApi(candidateId, 'interview')));
        updated.forEach((candidate) => dispatch({ type: 'REPLACE_CANDIDATE', candidate }));
      },
      moveCandidatesToStatus: async (candidateIds: string[], status: CandidateStatus) => {
        const updated = await Promise.all(candidateIds.map((candidateId) => updateCandidateStatusApi(candidateId, status)));
        updated.forEach((candidate) => dispatch({ type: 'REPLACE_CANDIDATE', candidate }));
      },
      selectCandidateForJob: async (candidateId: string) => dispatch({ type: 'REPLACE_CANDIDATE', candidate: await updateCandidateStatusApi(candidateId, 'selected') }),
      moveToReserve: async (candidateId: string) => dispatch({ type: 'REPLACE_CANDIDATE', candidate: await updateCandidateStatusApi(candidateId, 'reserve') }),
      recordInterviewOutcome: async (candidateId: string, status: Extract<CandidateStatus, 'selected' | 'reserve' | 'rejected'>, interviewDate: string, interviewer: string, profession: string, score: number, reason: RejectionReason | '', note: string) => {
        const updated = await updateCandidateStatusApi(candidateId, status, reason, note);
        dispatch({
          type: 'REPLACE_CANDIDATE',
          candidate: {
            ...updated,
            lastInterview: { date: interviewDate, interviewer, role: profession, result: status === 'rejected' ? 'Failed' : 'Passed', score, note: note || undefined },
          },
        });
      },
      openRejection: (candidateId: string) => dispatch({ type: 'OPEN_REJECTION_DIALOG', candidateId }),
      closeRejection: () => dispatch({ type: 'CLOSE_REJECTION_DIALOG' }),
      rejectCandidate: async (candidateId: string, reason: RejectionReason, note: string) => dispatch({ type: 'REPLACE_CANDIDATE', candidate: await updateCandidateStatusApi(candidateId, 'rejected', reason, note) }),
    },
  };
};
