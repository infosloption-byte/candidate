import { useAppContext } from './hooks/useAppContext';
import { AppShell } from './components/AppShell';
import { CandidatePage } from '../features/candidates/components/CandidatePage';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { PlaceholderPage } from '../shared/components/PlaceholderPage';
import { useCandidateWorkspace } from '../features/candidates/hooks/useCandidateWorkspace';

export const AppContent = () => {
  const { state: appState } = useAppContext();
  const { state: candidateState, actions } = useCandidateWorkspace();
  const page = appState.activeView === 'candidates' ? <CandidatePage /> : appState.activeView === 'dashboard' ? <DashboardPage /> : <PlaceholderPage title={pageTitle(appState.activeView)} eyebrow="MVP workspace" description={pageDescription(appState.activeView)} icon={pageIcon(appState.activeView)} />;
  return <AppShell searchValue={candidateState.filters.search} onSearch={actions.setSearch}>{page}</AppShell>;
};

const pageTitle = (view: Parameters<typeof pageDescription>[0]) => ({ interviews: 'Interviews', jobs: 'Job requests', selection: 'Selection board', reports: 'Reports', settings: 'Settings' }[view]);
const pageDescription = (view: Parameters<typeof pageDescription>[0]) => ({ interviews: 'Schedule interviews, assign interviewers, run structured scorecards and capture reasons.', jobs: 'Define project manpower requirements and the skills each role needs.', selection: 'Compare interviewed candidates and make transparent selection decisions.', reports: 'Track interview throughput, failure reasons and recruitment performance.', settings: 'Manage professions, interview templates, users, permissions and system preferences.' }[view]);
const pageIcon = (view: Parameters<typeof pageDescription>[0]) => ({ interviews: 'calendar', jobs: 'briefcase', selection: 'target', reports: 'chart', settings: 'settings' } as const)[view];
