import { useState } from 'react';
import { AppShell, type AppView } from './components/AppShell';
import type { UserRole } from '../domain/types';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { JobsPage } from '../features/jobs/JobsPage';
import { CandidatesPage } from '../features/candidates/CandidatesPage';
import { ApplicationsPage } from '../features/applications/ApplicationsPage';
import { InterviewsPage } from '../features/interviews/InterviewsPage';
import { AgenciesPage } from '../features/agencies/AgenciesPage';
import { SettingsPage } from '../features/settings/SettingsPage';

const roleDefaults: Record<UserRole, AppView> = {
  ADMIN: 'dashboard',
  AGENCY: 'dashboard',
  INTERVIEWER: 'interviews',
  INTERVIEWEE: 'jobs',
};

export const App = () => {
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [activeView, setActiveView] = useState<AppView>(roleDefaults.ADMIN);

  const changeRole = (nextRole: UserRole) => {
    setRole(nextRole);
    setActiveView(roleDefaults[nextRole]);
  };

  const content = (() => {
    switch (activeView) {
      case 'jobs': return <JobsPage role={role} />;
      case 'candidates': return <CandidatesPage role={role} />;
      case 'applications': return <ApplicationsPage role={role} />;
      case 'interviews': return <InterviewsPage role={role} />;
      case 'agencies': return <AgenciesPage />;
      case 'settings': return <SettingsPage />;
      case 'dashboard':
      default: return <DashboardPage role={role} />;
    }
  })();

  return (
    <AppShell role={role} activeView={activeView} onNavigate={setActiveView} onRoleChange={changeRole}>
      {content}
    </AppShell>
  );
};
