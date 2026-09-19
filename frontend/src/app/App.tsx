import { useEffect, useState } from 'react';
import { AppShell, type AppView } from './components/AppShell';
import type { UserRole } from '../domain/types';
import { AuthProvider, developmentUser, useAuth } from '../domain/authContext';
import { RecruitmentProvider } from '../domain/recruitmentContext';
import { LoginPage } from '../features/auth/LoginPage';
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

const AppContent = () => {
  const { user, loading, developmentMode, logout } = useAuth();
  const [developmentRole, setDevelopmentRole] = useState<UserRole>('ADMIN');

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-100 p-6">
        <p className="text-sm font-semibold text-slate-500">Loading BuildHire…</p>
      </main>
    );
  }

  if (!user && !developmentMode) {
    return <LoginPage />;
  }

  const role = user?.role ?? developmentRole;
  const displayUser = user ?? developmentUser(role);

  return (
    <AuthenticatedApp
      user={displayUser}
      role={role}
      developmentMode={developmentMode}
      onDevelopmentRoleChange={setDevelopmentRole}
      onLogout={() => void logout()}
    />
  );
};

interface AuthenticatedAppProps {
  user: ReturnType<typeof developmentUser>;
  role: UserRole;
  developmentMode: boolean;
  onDevelopmentRoleChange: (role: UserRole) => void;
  onLogout: () => void;
}

const AuthenticatedApp = ({
  user,
  role,
  developmentMode,
  onDevelopmentRoleChange,
  onLogout,
}: AuthenticatedAppProps) => {
  const [activeView, setActiveView] = useState<AppView>(roleDefaults[role]);

  useEffect(() => {
    setActiveView(roleDefaults[role]);
  }, [role]);

  const changeRole = (nextRole: UserRole) => {
    if (!developmentMode) return;
    onDevelopmentRoleChange(nextRole);
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
    <RecruitmentProvider>
      <AppShell
        role={role}
        activeView={activeView}
        onNavigate={setActiveView}
        onRoleChange={changeRole}
        onLogout={onLogout}
        user={user}
        showDevelopmentRoleSelector={developmentMode}
      >
        {content}
      </AppShell>
    </RecruitmentProvider>
  );
};

export const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);
