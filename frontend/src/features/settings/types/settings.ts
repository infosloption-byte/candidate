export type SettingsTab = 'recruitment' | 'interviews' | 'users' | 'accessibility';

export interface SettingsProfession {
  id: string;
  name: string;
  skills: string[];
  active: boolean;
}

export interface SettingsTemplate {
  id: string;
  name: string;
  profession: string;
  criteriaCount: number;
  practicalTaskCount: number;
  active: boolean;
}

export interface SettingsUser {
  id: string;
  name: string;
  email: string;
  role: 'system-admin' | 'recruiter' | 'interviewer';
  active: boolean;
}

export interface SettingsState {
  professions: SettingsProfession[];
  templates: SettingsTemplate[];
  users: SettingsUser[];
}
