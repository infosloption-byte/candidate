import { useEffect, useState } from 'react';
import { AppShell, type AppView } from './components/AppShell';
import type { UserRole } from '../domain/types';
import { AuthProvider, developmentUser, useAuth } from '../domain/authContext';
import { RecruitmentProvider } from '../domain/recruitmentContext';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { JobsPage } from '../features/jobs/JobsPage';
import { JobDetailPage } from '../features/jobs/JobDetailPage';
import { CandidatesPage } from '../features/candidates/CandidatesPage';
import { InterviewsPage } from '../features/interviews/InterviewsPage';
import { AgenciesPage } from '../features/agencies/AgenciesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { InterviewCriteriaPage } from '../features/interviews/InterviewCriteriaPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { LanguageProvider } from '../i18n/LanguageContext';

const roleDefaults: Record<UserRole, AppView> = {
  ADMIN: 'dashboard',
  AGENCY: 'dashboard',
  INTERVIEWER: 'dashboard',
  INTERVIEWEE: 'interviews',
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
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    setActiveView(roleDefaults[role]);
    setActiveJobId(null);
  }, [role]);

  const changeRole = (nextRole: UserRole) => {
    if (!developmentMode) return;
    onDevelopmentRoleChange(nextRole);
  };

  const navigate = (view: AppView, jobId: string | null = null) => {
    setActiveView(view);
    setActiveJobId(jobId);
  };

  const content = (() => {
    switch (activeView) {
      case 'calendar': return <CalendarPage role={role} />;
      case 'reports': return <ReportsPage role={role} />;
      case 'jobs':
        return <JobsPage role={role} onOpenJob={(jobId) => navigate('job-detail', jobId)} />;
      case 'job-detail':
        return <JobDetailPage
          role={role}
          jobId={activeJobId}
          onBack={() => navigate('jobs')}
          onCandidates={(jobId) => navigate('candidates', jobId)}
          onInterviews={(jobId) => navigate('interviews', jobId)}
        />;
      case 'candidates':
        return <CandidatesPage role={role} initialJobId={activeJobId} onJobChange={(jobId) => setActiveJobId(jobId)} />;
      case 'interviews':
        return <InterviewsPage role={role} initialJobId={activeJobId} onJobChange={(jobId) => setActiveJobId(jobId)} />;
      case 'agencies': return <AgenciesPage />;
      case 'criteria': return <InterviewCriteriaPage role={role} />;
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
        onNavigate={(view) => navigate(view)}
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
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  </AuthProvider>
);
