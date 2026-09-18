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
import { PlaceholderPage } from '../shared/components/PlaceholderPage';
import { useCandidateWorkspace } from '../features/candidates/hooks/useCandidateWorkspace';
import type { AppView } from './context/AppContextTypes';
import type { IconName } from '../shared/components/Icon';

type ModuleView = Exclude<AppView, 'dashboard' | 'candidates' | 'interviews' | 'selection' | 'allocation' | 'documents' | 'reports' | 'notifications' | 'settings' | 'candidate-portal'>;

const moduleContent = {} as Record<ModuleView, { title: string; description: string; icon: IconName }>;

export const AppContent = () => {
  const { state: appState } = useAppContext();
  const { state: candidateState, actions } = useCandidateWorkspace();

  const content = appState.activeView === 'candidates'
    ? <CandidatePage />
    : appState.activeView === 'candidate-portal'
      ? <CandidatePortalPage />
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
                      : appState.activeView === 'settings'
                        ? <SettingsPage />
                        : <PlaceholderPage title={moduleContent[appState.activeView as ModuleView].title} eyebrow="MVP workspace" description={moduleContent[appState.activeView as ModuleView].description} icon={moduleContent[appState.activeView as ModuleView].icon} />;

  return <AppShell searchValue={candidateState.filters.search} onSearch={actions.setSearch}>{content}</AppShell>;
};
