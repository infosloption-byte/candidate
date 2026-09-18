import type { AppView } from '../../../app/context/AppContextTypes';
import type { AuthRole } from '../types/auth';

export type Permission =
  | 'dashboard.view'
  | 'candidate.view'
  | 'candidate.manage'
  | 'candidate.import'
  | 'candidate.invite'
  | 'interview.view'
  | 'interview.schedule'
  | 'interview.evaluate'
  | 'job.view'
  | 'job.manage'
  | 'selection.view'
  | 'selection.decide'
  | 'selection.approve'
  | 'allocation.view'
  | 'allocation.manage'
  | 'document.view'
  | 'document.manage'
  | 'document.bulk-follow-up'
  | 'report.view'
  | 'notification.view'
  | 'settings.view'
  | 'settings.manage';

const rolePermissions: Record<AuthRole, readonly Permission[]> = {
  'system-admin': [
    'dashboard.view', 'candidate.view', 'candidate.manage', 'candidate.import', 'candidate.invite',
    'interview.view', 'interview.schedule', 'interview.evaluate',
    'job.view', 'job.manage',
    'selection.view', 'selection.decide', 'selection.approve',
    'allocation.view', 'allocation.manage',
    'document.view', 'document.manage', 'document.bulk-follow-up',
    'report.view', 'notification.view', 'settings.view', 'settings.manage',
  ],
  recruiter: [
    'dashboard.view', 'candidate.view', 'candidate.manage', 'candidate.import', 'candidate.invite',
    'interview.view', 'interview.schedule', 'interview.evaluate',
    'job.view', 'job.manage',
    'selection.view', 'selection.decide',
    'allocation.view', 'allocation.manage',
    'document.view', 'document.manage', 'document.bulk-follow-up',
    'report.view', 'notification.view',
  ],
  interviewer: [
    'dashboard.view', 'candidate.view',
    'interview.view', 'interview.schedule', 'interview.evaluate',
    'document.view', 'report.view', 'notification.view',
  ],
  manager: [
    'dashboard.view', 'candidate.view',
    'job.view', 'job.manage',
    'selection.view', 'selection.approve',
    'allocation.view', 'allocation.manage',
    'document.view', 'document.manage',
    'report.view', 'notification.view',
  ],
  candidate: [],
};

const viewPermission: Partial<Record<AppView, Permission>> = {
  dashboard: 'dashboard.view',
  candidates: 'candidate.view',
  interviews: 'interview.view',
  jobs: 'job.view',
  selection: 'selection.view',
  allocation: 'allocation.view',
  documents: 'document.view',
  reports: 'report.view',
  notifications: 'notification.view',
  settings: 'settings.view',
};

export const canRole = (role: AuthRole, permission: Permission): boolean =>
  rolePermissions[role].includes(permission);

export const canView = (role: AuthRole, view: AppView): boolean =>
  view === 'candidate-portal'
    ? true
    : Boolean(viewPermission[view] && canRole(role, viewPermission[view] as Permission));

export const getDefaultView = (role: AuthRole): Exclude<AppView, 'candidate-portal'> => {
  const views: Array<Exclude<AppView, 'candidate-portal'>> = [
    'dashboard', 'candidates', 'interviews', 'jobs', 'selection', 'allocation',
    'documents', 'reports', 'notifications', 'settings',
  ];
  return views.find((view) => canView(role, view)) ?? 'dashboard';
};

export const roleLabel = (role: AuthRole): string => ({
  'system-admin': 'System Admin',
  recruiter: 'Recruiter',
  interviewer: 'Interviewer',
  manager: 'Manager / Approver',
  candidate: 'Candidate',
}[role]);

export const roleDescription = (role: AuthRole): string => ({
  'system-admin': 'Full administration, recruitment operations and configuration.',
  recruiter: 'Candidate intake, onboarding, scheduling, selection and daily operations.',
  interviewer: 'Interview schedules, candidate evidence and evaluations.',
  manager: 'Job oversight, shortlist approval and allocation.',
  candidate: 'Self-service onboarding and candidate profile.',
}[role]);
