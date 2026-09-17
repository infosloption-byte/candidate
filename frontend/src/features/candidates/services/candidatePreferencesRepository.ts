import type { Availability, BooleanFilter, CandidateFilters, CandidateSavedFilter, CandidateSmartFilters, CandidateStatus, DocumentReadinessFilter, EnglishLevel } from '../types/candidate';

export interface CandidateWorkspacePreferences {
  savedFilters: CandidateSavedFilter[];
  comparisonMinimized: boolean;
  comparisonHeight: number;
}

const STORAGE_KEY = 'buildhire.candidate-preferences';
const DEFAULT_SMART_FILTERS: CandidateSmartFilters = { minExperience: null, maxExperience: null, englishLevel: 'all', availability: 'all', overseasExperience: 'all', drivingLicense: 'all', documentReadiness: 'all', skills: [] };
const DEFAULT_FILTERS: CandidateFilters = { search: '', status: 'all', profession: 'all' };
const DEFAULT_PREFERENCES: CandidateWorkspacePreferences = { savedFilters: [], comparisonMinimized: false, comparisonHeight: 360 };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isCandidateStatus = (value: unknown): value is CandidateStatus => ['new', 'screening', 'interview', 'selected', 'reserve', 'rejected'].includes(value as string);
const isEnglishLevel = (value: unknown): value is EnglishLevel => ['Not assessed', 'Basic', 'Working', 'Good', 'Strong'].includes(value as string);
const isAvailability = (value: unknown): value is Availability => ['Available now', 'Within 2 weeks', 'Within 1 month', 'Not available'].includes(value as string);
const isBooleanFilter = (value: unknown): value is BooleanFilter => ['all', 'yes', 'no'].includes(value as string);
const isDocumentReadiness = (value: unknown): value is DocumentReadinessFilter => ['all', 'ready', 'attention'].includes(value as string);

const normalizeFilters = (value: unknown): CandidateFilters => {
  if (!isRecord(value)) return DEFAULT_FILTERS;
  return { search: typeof value.search === 'string' ? value.search : '', status: isCandidateStatus(value.status) ? value.status : 'all', profession: typeof value.profession === 'string' ? value.profession : 'all' };
};

const normalizeSmartFilters = (value: unknown): CandidateSmartFilters => {
  if (!isRecord(value)) return DEFAULT_SMART_FILTERS;
  const minExperience = typeof value.minExperience === 'number' && Number.isFinite(value.minExperience) ? Math.max(0, value.minExperience) : null;
  const maxExperience = typeof value.maxExperience === 'number' && Number.isFinite(value.maxExperience) ? Math.max(0, value.maxExperience) : null;
  return {
    minExperience,
    maxExperience,
    englishLevel: isEnglishLevel(value.englishLevel) ? value.englishLevel : 'all',
    availability: isAvailability(value.availability) ? value.availability : 'all',
    overseasExperience: isBooleanFilter(value.overseasExperience) ? value.overseasExperience : 'all',
    drivingLicense: isBooleanFilter(value.drivingLicense) ? value.drivingLicense : 'all',
    documentReadiness: isDocumentReadiness(value.documentReadiness) ? value.documentReadiness : 'all',
    skills: Array.isArray(value.skills) ? value.skills.filter((item): item is string => typeof item === 'string').slice(0, 50) : [],
  };
};

const normalizeSavedFilter = (value: unknown, index: number): CandidateSavedFilter | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
  const name = value.name.trim();
  if (!name) return null;
  return { id: value.id, name, filters: normalizeFilters(value.filters), smartFilters: normalizeSmartFilters(value.smartFilters), createdAt: typeof value.createdAt === 'string' ? value.createdAt : `saved-${index}` };
};

export const loadCandidateWorkspacePreferences = async (): Promise<CandidateWorkspacePreferences> => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return DEFAULT_PREFERENCES;
  const comparisonHeight = typeof parsed.comparisonHeight === 'number' && Number.isFinite(parsed.comparisonHeight) ? Math.min(720, Math.max(180, parsed.comparisonHeight)) : DEFAULT_PREFERENCES.comparisonHeight;
  const savedFilters = Array.isArray(parsed.savedFilters) ? parsed.savedFilters.map(normalizeSavedFilter).filter((filter): filter is CandidateSavedFilter => filter !== null).slice(0, 20) : [];
  return { savedFilters, comparisonMinimized: parsed.comparisonMinimized === true, comparisonHeight };
};

export const saveCandidateWorkspacePreferences = async (preferences: CandidateWorkspacePreferences): Promise<void> => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
};
