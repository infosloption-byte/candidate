import { useEffect, useRef, useState } from 'react';
import { AppShell, type AppView } from './components/AppShell';
import type { UserRole } from '../domain/types';
import { AuthProvider, developmentUser, useAuth } from '../domain/authContext';
import { RecruitmentProvider } from '../domain/recruitmentContext';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PlatformDashboardPage } from '../features/dashboard/PlatformDashboardPage';
import { PlatformReportsPage } from '../features/dashboard/PlatformReportsPage';
import { PlatformActivityPage } from '../features/dashboard/PlatformActivityPage';
import { BillingRevenuePage } from '../features/dashboard/BillingRevenuePage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { JobsPage } from '../features/jobs/JobsPage';
import { JobDetailPage } from '../features/jobs/JobDetailPage';
import { CandidatesPage } from '../features/candidates/CandidatesPage';
import { InterviewsPage } from '../features/interviews/InterviewsPage';
import { AgenciesPage } from '../features/agencies/AgenciesPage';
import { CompanyUsersPage } from '../features/company/CompanyUsersPage';
import { CompaniesPage } from '../features/companies/CompaniesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { InterviewCriteriaPage } from '../features/interviews/InterviewCriteriaPage';
import { CalendarPage } from '../features/calendar/CalendarPage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { MarketingSite } from '../features/marketing/MarketingSite';

const roleDefaults: Record<UserRole, AppView> = {
  ADMIN: 'dashboard',
  COMPANY_ADMIN: 'dashboard',
  AGENCY: 'dashboard',
  INTERVIEWER: 'dashboard',
  INTERVIEWEE: 'interviews',
};

const roleAccessibleViews: Record<UserRole, AppView[]> = {
  ADMIN: ['dashboard', 'companies', 'agencies', 'platform-reports', 'platform-activity', 'billing', 'settings'],
  COMPANY_ADMIN: ['dashboard', 'jobs', 'job-detail', 'candidates', 'interviews', 'reports', 'criteria', 'agencies', 'companies', 'settings'],
  AGENCY: ['dashboard', 'jobs', 'job-detail', 'candidates', 'interviews', 'reports', 'criteria', 'agencies', 'settings'],
  INTERVIEWER: ['dashboard', 'calendar', 'reports', 'interviews'],
  INTERVIEWEE: ['calendar', 'interviews', 'candidates'],
};

const isViewAccessible = (role: UserRole, view: AppView): boolean => roleAccessibleViews[role].includes(view);

const routeForView = (view: AppView, jobId: string | null = null): string => {
  switch (view) {
    case 'dashboard': return '/app';
    case 'jobs': return '/app/jobs';
    case 'job-detail': return jobId ? '/app/jobs/' + encodeURIComponent(jobId) : '/app/jobs';
    case 'candidates': return jobId ? '/app/candidates?jobId=' + encodeURIComponent(jobId) : '/app/candidates';
    case 'interviews': return jobId ? '/app/interviews?jobId=' + encodeURIComponent(jobId) : '/app/interviews';
    case 'criteria': return '/app/criteria';
    case 'calendar': return '/app/calendar';
    case 'reports': return '/app/reports';
    case 'platform-reports': return '/app/platform-reports';
    case 'platform-activity': return '/app/platform-activity';
    case 'billing': return '/app/billing';
    case 'companies': return '/app/companies';
    case 'agencies': return '/app/agencies';
    case 'settings': return '/app/settings';
    default: return '/app';
  }
};

const routeFromLocation = (pathname: string, search = ''): { view: AppView; jobId: string | null } => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/app') return { view: 'dashboard', jobId: null };

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments[0] !== 'app') return { view: 'dashboard', jobId: null };

  const section = segments[1];
  switch (section) {
    case 'jobs':
      return segments[2]
        ? { view: 'job-detail', jobId: decodeURIComponent(segments[2]) }
        : { view: 'jobs', jobId: null };
    case 'candidates':
      return { view: 'candidates', jobId: new URLSearchParams(search).get('jobId') };
    case 'interviews':
      return { view: 'interviews', jobId: new URLSearchParams(search).get('jobId') };
    case 'criteria': return { view: 'criteria', jobId: null };
    case 'calendar': return { view: 'calendar', jobId: null };
    case 'reports': return { view: 'reports', jobId: null };
    case 'platform-reports': return { view: 'platform-reports', jobId: null };
    case 'platform-activity': return { view: 'platform-activity', jobId: null };
    case 'billing': return { view: 'billing', jobId: null };
    case 'companies': return { view: 'companies', jobId: null };
    case 'agencies': return { view: 'agencies', jobId: null };
    case 'settings': return { view: 'settings', jobId: null };
    default: return { view: 'dashboard', jobId: null };
  }
};

const AppContent = () => {
  const { user, loading, developmentMode, logout } = useAuth();
  const [developmentRole, setDevelopmentRole] = useState<UserRole>('ADMIN');
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (user && (pathname === '/login' || pathname === '/login/')) {
      window.history.replaceState({}, '', '/app');
      setPathname('/app');
    }
  }, [pathname, user]);

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-100 p-6">
        <p className="text-sm font-semibold text-slate-500">Loading BuildHire…</p>
      </main>
    );
  }

  const publicPath = pathname === '/' || pathname === '/features' || pathname === '/security';

  if (publicPath) {
    return <MarketingSite />;
  }

  const isAppPath = pathname === '/app' || pathname.startsWith('/app/');

  if (!user && !developmentMode && isAppPath) {
    return <LoginPage />;
  }

  if (!user && pathname !== '/app' && !pathname.startsWith('/app/') && pathname !== '/login') {
    return <MarketingSite />;
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
  const initialRoute = routeFromLocation(window.location.pathname, window.location.search);
  const initialView = isViewAccessible(role, initialRoute.view) ? initialRoute.view : roleDefaults[role];
  const initialJobId = initialView === initialRoute.view ? initialRoute.jobId : null;
  const [activeView, setActiveView] = useState<AppView>(initialView);
  const [activeJobId, setActiveJobId] = useState<string | null>(initialJobId);
  const previousRole = useRef(role);

  useEffect(() => {
    const currentRoute = routeFromLocation(window.location.pathname, window.location.search);

    if (previousRole.current !== role) {
      previousRole.current = role;
      const nextView = roleDefaults[role];
      setActiveView(nextView);
      setActiveJobId(null);
      window.history.pushState({}, '', routeForView(nextView));
      return;
    }

    if (!isViewAccessible(role, currentRoute.view)) {
      const nextView = roleDefaults[role];
      setActiveView(nextView);
      setActiveJobId(null);
      window.history.replaceState({}, '', routeForView(nextView));
    }
  }, [role]);

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = routeFromLocation(window.location.pathname, window.location.search);
      const safeView = isViewAccessible(role, nextRoute.view) ? nextRoute.view : roleDefaults[role];
      setActiveView(safeView);
      setActiveJobId(safeView === nextRoute.view ? nextRoute.jobId : null);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [role]);

  const changeRole = (nextRole: UserRole) => {
    if (!developmentMode) return;
    onDevelopmentRoleChange(nextRole);
  };

  const navigate = (view: AppView, jobId: string | null = null) => {
    if (!isViewAccessible(role, view)) return;
    const nextUrl = routeForView(view, jobId);
    const currentUrl = window.location.pathname + window.location.search;
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, '', nextUrl);
    }
    setActiveView(view);
    setActiveJobId(jobId);
  };

  const content = (() => {
    switch (activeView) {
      case 'calendar': return <CalendarPage role={role} />;
      case 'reports': return <ReportsPage role={role} />;
      case 'platform-reports':
        return role === 'ADMIN' ? <PlatformReportsPage /> : <DashboardPage role={role} />;
      case 'platform-activity':
        return role === 'ADMIN' ? <PlatformActivityPage /> : <DashboardPage role={role} />;
      case 'billing':
        return role === 'ADMIN' ? <BillingRevenuePage /> : <DashboardPage role={role} />;
      case 'jobs':
        return <JobsPage role={role} onOpenJob={(jobId) => navigate('job-detail', jobId)} />;
      case 'job-detail':
        return <JobDetailPage
          role={role}
          jobId={activeJobId}
          onBack={() => navigate('jobs')}
        />;
      case 'candidates':
        return <CandidatesPage role={role} initialJobId={activeJobId} onJobChange={(jobId) => navigate('candidates', jobId)} />;
      case 'interviews':
        return <InterviewsPage role={role} initialJobId={activeJobId} onJobChange={(jobId) => navigate('interviews', jobId)} />;
      case 'companies':
        return role === 'ADMIN' || role === 'COMPANY_ADMIN' ? <CompaniesPage /> : <DashboardPage role={role} />;
      case 'agencies':
        return role === 'ADMIN' || role === 'COMPANY_ADMIN' ? <AgenciesPage /> : role === 'AGENCY' ? <CompanyUsersPage /> : <DashboardPage role={role} />;
      case 'criteria': return <InterviewCriteriaPage role={role} />;
      case 'settings': return <SettingsPage />;
      case 'dashboard':
      default:
        return role === 'ADMIN'
          ? <PlatformDashboardPage role={role} />
          : <DashboardPage role={role} />;
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
