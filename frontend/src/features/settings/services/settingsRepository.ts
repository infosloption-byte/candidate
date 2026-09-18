import type { SettingsState } from '../types/settings';

const STORAGE_KEY = 'buildhire.settings';

const seed: SettingsState = {
  professions: [
    { id: 'mason', name: 'Mason', skills: ['Tile', 'Putty', 'Plaster'], active: true },
    { id: 'welder', name: 'Welder', skills: ['Fabrication', 'Arc Welding'], active: true },
    { id: 'carpenter', name: 'Shuttering Carpenter', skills: ['Formwork', 'Scaffolding'], active: true },
    { id: 'painter', name: 'Painter', skills: ['Spray Paint', 'Putty'], active: true },
  ],
  templates: [
    { id: 'mason-standard', name: 'Mason Standard', profession: 'Mason', criteriaCount: 7, practicalTaskCount: 4, active: true },
    { id: 'carpentry-standard', name: 'Carpentry Standard', profession: 'Shuttering Carpenter', criteriaCount: 7, practicalTaskCount: 3, active: true },
    { id: 'welding-standard', name: 'Welding Standard', profession: 'Welder', criteriaCount: 7, practicalTaskCount: 3, active: true },
  ],
  users: [
    { id: 'user-admin', name: 'System Administrator', email: 'admin@buildhire.local', role: 'system-admin', active: true },
    { id: 'user-recruiter', name: 'Recruitment Team', email: 'recruiter@buildhire.local', role: 'recruiter', active: true },
    { id: 'user-interviewer', name: 'Interview Team', email: 'interviewer@buildhire.local', role: 'interviewer', active: true },
  ],
};

const clone = (state: SettingsState): SettingsState => JSON.parse(JSON.stringify(state)) as SettingsState;

export const loadSettings = (): SettingsState => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seed;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return seed;
    return parsed as SettingsState;
  } catch {
    return seed;
  }
};

export const saveSettings = (state: SettingsState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const createSettingsId = (prefix: string): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? prefix + '-' + crypto.randomUUID()
    : prefix + '-' + Date.now();

export const createDefaultSettings = (): SettingsState => clone(seed);
