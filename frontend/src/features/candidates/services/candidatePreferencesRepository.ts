import type { CandidateSavedFilter } from '../types/candidate';

export interface CandidateWorkspacePreferences {
  savedFilters: CandidateSavedFilter[];
  comparisonMinimized: boolean;
  comparisonHeight: number;
}

const STORAGE_KEY = 'buildhire.candidate-preferences';

const DEFAULT_PREFERENCES: CandidateWorkspacePreferences = {
  savedFilters: [],
  comparisonMinimized: false,
  comparisonHeight: 360,
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const loadCandidateWorkspacePreferences = async (): Promise<CandidateWorkspacePreferences> => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PREFERENCES;

  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return DEFAULT_PREFERENCES;

  const comparisonHeight = typeof parsed.comparisonHeight === 'number' && Number.isFinite(parsed.comparisonHeight)
    ? Math.min(720, Math.max(180, parsed.comparisonHeight))
    : DEFAULT_PREFERENCES.comparisonHeight;

  const savedFilters = Array.isArray(parsed.savedFilters) ? parsed.savedFilters.filter(isRecord).filter((filter) => (
    typeof filter.id === 'string'
    && typeof filter.name === 'string'
    && isRecord(filter.filters)
    && isRecord(filter.smartFilters)
  )) as CandidateSavedFilter[] : [];

  return {
    savedFilters,
    comparisonMinimized: parsed.comparisonMinimized === true,
    comparisonHeight,
  };
};

export const saveCandidateWorkspacePreferences = async (preferences: CandidateWorkspacePreferences): Promise<void> => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
};
