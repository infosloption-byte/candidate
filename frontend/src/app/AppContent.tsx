import { useAppContext } from './hooks/useAppContext';
import { AppShell } from './components/AppShell';
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
import { useCandidateWorkspace } from '../features/candidates/hooks/useCandidateWorkspace';
export const AppContent = () => {
  const { state: appState } = useAppContext();
  const { state: candidateState, actions } = useCandidateWorkspace();

  if (appState.activeView === 'candidate-portal') return <CandidatePortalPage />;

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

  return <AppShell searchValue={candidateState.filters.search} onSearch={actions.setSearch}>{content}</AppShell>;
};
