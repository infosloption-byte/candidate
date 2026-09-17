import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { CandidateContext } from './CandidateContextObject';
import type { Candidate, CandidateAction, CandidateState } from './CandidateContext';
import type { CandidateSmartFilters, CandidateStatus } from '../types/candidate';
import { loadCandidates, saveCandidates } from '../services/candidateRepository';
import { loadCandidateWorkspacePreferences, saveCandidateWorkspacePreferences, type CandidateWorkspacePreferences } from '../services/candidatePreferencesRepository';

const defaultSmartFilters: CandidateSmartFilters = { minExperience: null, maxExperience: null, englishLevel: 'all', availability: 'all', overseasExperience: 'all', drivingLicense: 'all', documentReadiness: 'all', skills: [] };
const defaultPreferences: CandidateWorkspacePreferences = { savedFilters: [], comparisonMinimized: false, comparisonHeight: 360 };

const initialState: CandidateState = {
  loadState: 'loading', errorMessage: null, loadAttempt: 0, candidates: [], filters: { search: '', status: 'all', profession: 'all' }, smartFilters: defaultSmartFilters,
  savedFilters: [], activeSavedFilterId: null, selectedCandidateId: null, compareCandidateIds: [], comparisonMinimized: false, comparisonHeight: 360, isAddDrawerOpen: false, rejectionCandidateId: null,
};

const makeEventId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `event-${Date.now()}`);
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const statusTitle = (status: CandidateStatus): string => ({ new: 'Candidate added', screening: 'Screening started', interview: 'Moved to interview', selected: 'Selected', reserve: 'Placed on reserve', rejected: 'Rejected' }[status]);
const statusDetail = (status: CandidateStatus): string => ({ new: 'Candidate is ready for screening.', screening: 'Recruiter is checking job fit.', interview: 'Candidate is ready for interview assessment.', selected: 'Candidate was added to the selection shortlist.', reserve: 'Candidate remains available as a reserve option.', rejected: 'A structured rejection decision was recorded.' }[status]);
const statusTone = (status: CandidateStatus): 'neutral' | 'positive' | 'warning' | 'negative' => status === 'rejected' ? 'negative' : status === 'selected' ? 'positive' : status === 'reserve' || status === 'screening' ? 'warning' : 'neutral';
const normalizeTag = (tag: string): string => tag.trim().replace(/\s+/g, ' ');

const candidateReducer = (state: CandidateState, action: CandidateAction): CandidateState => {
  switch (action.type) {
    case 'HYDRATE': return { ...state, loadState: 'success', errorMessage: null, candidates: action.candidates, savedFilters: action.savedFilters, activeSavedFilterId: null, comparisonMinimized: action.comparisonMinimized, comparisonHeight: action.comparisonHeight, selectedCandidateId: action.candidates[0]?.id ?? null };
    case 'LOAD_ERROR': return { ...state, loadState: 'error', errorMessage: action.message };
    case 'RETRY_LOAD': return { ...state, loadState: 'loading', errorMessage: null, loadAttempt: state.loadAttempt + 1 };
    case 'SET_SEARCH': return { ...state, activeSavedFilterId: null, filters: { ...state.filters, search: action.value } };
    case 'SET_STATUS_FILTER': return { ...state, activeSavedFilterId: null, filters: { ...state.filters, status: action.value } };
    case 'SET_PROFESSION_FILTER': return { ...state, activeSavedFilterId: null, filters: { ...state.filters, profession: action.value } };
    case 'SET_SMART_FILTERS': return { ...state, activeSavedFilterId: null, smartFilters: action.filters };
    case 'TOGGLE_SKILL_FILTER': {
      const skills = state.smartFilters.skills.includes(action.skill) ? state.smartFilters.skills.filter((skill) => skill !== action.skill) : [...state.smartFilters.skills, action.skill];
      return { ...state, activeSavedFilterId: null, smartFilters: { ...state.smartFilters, skills } };
    }
    case 'CLEAR_SMART_FILTERS': return { ...state, activeSavedFilterId: null, smartFilters: defaultSmartFilters };
    case 'CLEAR_ALL_FILTERS': return { ...state, activeSavedFilterId: null, filters: { search: '', status: 'all', profession: 'all' }, smartFilters: defaultSmartFilters };
    case 'SAVE_FILTER': {
      const duplicateName = action.filter.name.trim().toLowerCase();
      const withoutSameName = state.savedFilters.filter((filter) => filter.name.trim().toLowerCase() !== duplicateName);
      return { ...state, savedFilters: [action.filter, ...withoutSameName], activeSavedFilterId: action.filter.id };
    }
    case 'APPLY_SAVED_FILTER': return { ...state, activeSavedFilterId: action.filter.id, filters: action.filter.filters, smartFilters: action.filter.smartFilters };
    case 'DELETE_SAVED_FILTER': return { ...state, savedFilters: state.savedFilters.filter((filter) => filter.id !== action.filterId), activeSavedFilterId: state.activeSavedFilterId === action.filterId ? null : state.activeSavedFilterId };
    case 'SELECT_CANDIDATE': return { ...state, selectedCandidateId: action.candidateId };
    case 'TOGGLE_COMPARE_CANDIDATE': {
      const exists = state.compareCandidateIds.includes(action.candidateId);
      if (exists) return { ...state, compareCandidateIds: state.compareCandidateIds.filter((id) => id !== action.candidateId) };
      if (state.compareCandidateIds.length >= 4) return state;
      return { ...state, compareCandidateIds: [...state.compareCandidateIds, action.candidateId], comparisonMinimized: false };
    }
    case 'CLEAR_COMPARISON': return { ...state, compareCandidateIds: [] };
    case 'SET_COMPARISON_MINIMIZED': return { ...state, comparisonMinimized: action.value };
    case 'SET_COMPARISON_HEIGHT': return { ...state, comparisonHeight: Math.min(720, Math.max(180, action.value)), comparisonMinimized: false };
    case 'ADD_TAG': {
      const tag = normalizeTag(action.tag);
      if (!tag) return state;
      return { ...state, candidates: state.candidates.map((candidate) => {
        if (candidate.id !== action.candidateId) return candidate;
        const tags = candidate.tags ?? [];
        const exists = tags.some((item) => item.toLowerCase() === tag.toLowerCase());
        return exists ? { ...candidate, tags } : { ...candidate, tags: [...tags, tag] };
      }) };
    }
    case 'REMOVE_TAG': return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, tags: (candidate.tags ?? []).filter((tag) => tag.toLowerCase() !== action.tag.toLowerCase()) } : candidate) };
    case 'OPEN_ADD_DRAWER': return { ...state, isAddDrawerOpen: true };
    case 'CLOSE_ADD_DRAWER': return { ...state, isAddDrawerOpen: false };
    case 'ADD_CANDIDATE': return { ...state, candidates: [action.candidate, ...state.candidates], selectedCandidateId: action.candidate.id, isAddDrawerOpen: false };
    case 'UPDATE_STATUS': return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: action.status, journey: [{ id: makeEventId(), date: today(), title: statusTitle(action.status), detail: statusDetail(action.status), tone: statusTone(action.status) }, ...candidate.journey] } : candidate) };
    case 'BULK_UPDATE_STATUS': {
      const ids = new Set(action.candidateIds);
      if (ids.size === 0) return state;
      return {
        ...state,
        candidates: state.candidates.map((candidate) => ids.has(candidate.id) && candidate.status !== action.status
          ? { ...candidate, status: action.status, journey: [{ id: makeEventId(), date: today(), title: statusTitle(action.status), detail: statusDetail(action.status), tone: statusTone(action.status) }, ...candidate.journey] }
          : candidate),
      };
    }
    case 'RECORD_INTERVIEW_OUTCOME': {
      const result = action.status === 'rejected' ? 'Failed' : 'Passed';
      return {
        ...state,
        candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? {
          ...candidate,
          status: action.status,
          rejectionReason: action.status === 'rejected' && action.reason ? action.reason : undefined,
          rejectionNote: action.status === 'rejected' ? action.note : undefined,
          lastInterview: {
            date: action.interviewDate,
            interviewer: action.interviewer,
            role: action.profession,
            result,
            score: action.score,
            note: action.note || undefined,
          },
          journey: [{
            id: makeEventId(),
            date: action.interviewDate,
            title: action.status === 'rejected' ? 'Interview failed' : action.status === 'selected' ? 'Interview passed — selected' : 'Interview passed — reserve',
            detail: action.status === 'rejected' ? `${action.reason}: ${action.note}` : `${action.score}% interview result.`,
            tone: action.status === 'rejected' ? 'negative' : action.status === 'selected' ? 'positive' : 'warning',
          }, ...candidate.journey],
        } : candidate),
      };
    }
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
        const loadedCandidates = await loadCandidates();
        const candidates = loadedCandidates.map((candidate) => ({ ...candidate, tags: candidate.tags ?? [] }));
        let preferences: CandidateWorkspacePreferences = defaultPreferences;
        try { preferences = await loadCandidateWorkspacePreferences(); } catch { preferences = defaultPreferences; }
        if (!cancelled) dispatch({ type: 'HYDRATE', candidates, savedFilters: preferences.savedFilters, comparisonMinimized: preferences.comparisonMinimized, comparisonHeight: preferences.comparisonHeight });
      } catch {
        if (!cancelled) dispatch({ type: 'LOAD_ERROR', message: 'Candidate data could not be loaded. Retry to restore the local workspace.' });
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [state.loadAttempt]);

  useEffect(() => {
    if (state.loadState !== 'success') return;
    void saveCandidates(state.candidates).catch(() => undefined);
    void saveCandidateWorkspacePreferences({ savedFilters: state.savedFilters, comparisonMinimized: state.comparisonMinimized, comparisonHeight: state.comparisonHeight }).catch(() => undefined);
  }, [state.candidates, state.loadState, state.savedFilters, state.comparisonMinimized, state.comparisonHeight]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CandidateContext.Provider value={value}>{children}</CandidateContext.Provider>;
};
