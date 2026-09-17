import { useAppContext } from './hooks/useAppContext';
import { AppShell } from './components/AppShell';
import { CandidatePage } from '../features/candidates/components/CandidatePage';
import { InterviewPage } from '../features/interviews/components/InterviewPage';
import { SelectionPage } from '../features/selection/components/SelectionPage';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { ReportsPage } from '../features/reports/components/ReportsPage';
import { PlaceholderPage } from '../shared/components/PlaceholderPage';
import { useCandidateWorkspace } from '../features/candidates/hooks/useCandidateWorkspace';
import type { AppView } from './context/AppContextTypes';
import type { IconName } from '../shared/components/Icon';

type ModuleView = Exclude<AppView, 'dashboard' | 'candidates' | 'interviews' | 'selection' | 'reports'>;

const moduleContent: Record<ModuleView, { title: string; description: string; icon: IconName }> = {
  jobs: { title: 'Job requests', description: 'Define project manpower requirements and the skills each role needs.', icon: 'briefcase' },
  settings: { title: 'Settings', description: 'Manage professions, interview templates, users, permissions and system preferences.', icon: 'settings' },
};

export const AppContent = () => {
  const { state: appState } = useAppContext();
  const { state: candidateState, actions } = useCandidateWorkspace();

  const content = appState.activeView === 'candidates'
    ? <CandidatePage />
    : appState.activeView === 'interviews'
      ? <InterviewPage />
      : appState.activeView === 'selection'
        ? <SelectionPage />
        : appState.activeView === 'dashboard'
          ? <DashboardPage />
          : appState.activeView === 'reports'
            ? <ReportsPage />
            : <PlaceholderPage title={moduleContent[appState.activeView as ModuleView].title} eyebrow="MVP workspace" description={moduleContent[appState.activeView as ModuleView].description} icon={moduleContent[appState.activeView as ModuleView].icon} />;

  return <AppShell searchValue={candidateState.filters.search} onSearch={actions.setSearch}>{content}</AppShell>;
};
