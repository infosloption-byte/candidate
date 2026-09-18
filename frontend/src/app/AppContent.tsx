import { useEffect } from 'react';
import { useAppContext } from './hooks/useAppContext';
import { AppShell } from './components/AppShell';
import { AccessDeniedPage } from './components/AccessDeniedPage';
import { CandidatePage } from '../features/candidates/components/CandidatePage';
import { CandidatePortalPage } from '../features/candidates/components/CandidatePortalPage';
import { InterviewPage } from '../features/interviews/components/InterviewPage';
import { SelectionPage } from '../features/selection/components/SelectionPage';
import { AllocationPage } from '../features/allocation/components/AllocationPage';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { ReportsPage } from '../features/reports/components/ReportsPage';
import { JobsPage } from '../features/jobs/components/JobsPage';
import { DocumentsPage } from '../features/documents/components/DocumentsPage';
import { NotificationsPage } from '../features/notifications/components/NotificationsPage';
import { SettingsPage } from '../features/settings/components/SettingsPage';
import { AuthPage } from '../features/auth/components/AuthPage';
import { AuthPasswordDialog } from '../features/auth/components/AuthPasswordDialog';
import { useAuth } from '../features/auth/hooks/useAuth';
import { canView, getDefaultView, roleLabel } from '../features/auth/services/permissions';
import { useCandidateWorkspace } from '../features/candidates/hooks/useCandidateWorkspace';

export const AppContent = () => {
  const { state: appState, dispatch: appDispatch } = useAppContext();
  const { state: candidateState, actions } = useCandidateWorkspace();
  const { state: authState } = useAuth();

  useEffect(() => {
    if (!authState.authenticated || authState.user.role === 'candidate' || appState.activeView === 'candidate-portal') return;
    if (!canView(authState.user.role, appState.activeView)) {
      appDispatch({ type: 'SET_VIEW', view: getDefaultView(authState.user.role) });
    }
  }, [authState.authenticated, authState.user.role, appState.activeView, appDispatch]);

  if (appState.activeView === 'candidate-portal') return <CandidatePortalPage />;
  if (!authState.authenticated) return <AuthPage candidates={candidateState.candidates} />;
  if (authState.user.role === 'candidate') return <CandidatePortalPage />;
  if (!canView(authState.user.role, appState.activeView)) return <AccessDeniedPage roleLabel={roleLabel(authState.user.role)} />;

  const content = appState.activeView === 'candidates'
    ? <CandidatePage />
    : appState.activeView === 'interviews'
      ? <InterviewPage />
      : appState.activeView === 'selection'
        ? <SelectionPage />
        : appState.activeView === 'allocation'
          ? <AllocationPage />
          : appState.activeView === 'dashboard'
            ? <DashboardPage />
            : appState.activeView === 'reports'
              ? <ReportsPage />
              : appState.activeView === 'jobs'
                ? <JobsPage />
                : appState.activeView === 'documents'
                  ? <DocumentsPage />
                  : appState.activeView === 'notifications'
                    ? <NotificationsPage />
                    : <SettingsPage />;

  return (
    <>
      <AppShell searchValue={candidateState.filters.search} onSearch={actions.setSearch}>{content}</AppShell>
      <AuthPasswordDialog />
    </>
  );
};
