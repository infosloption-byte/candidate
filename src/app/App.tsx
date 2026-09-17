import { useState } from 'react';
import { AppShell } from './components/AppShell';
import type { AppView } from './components/Sidebar';
import { CandidateProvider } from '../features/candidates/context/CandidateContext';
import { CandidatePage } from '../features/candidates/components/CandidatePage';
import { DashboardPage } from '../features/dashboard/components/DashboardPage';
import { InterviewsPage } from '../features/interviews/components/InterviewsPage';
import { JobsPage } from '../features/jobs/components/JobsPage';
import { SelectionPage } from '../features/selection/components/SelectionPage';
import { ReportsPage } from '../features/reports/components/ReportsPage';
import { SettingsPage } from '../features/settings/components/SettingsPage';

interface AppContentProps {
  view: AppView;
  onOpenCandidates: () => void;
}

const AppContent = ({ view, onOpenCandidates }: AppContentProps) => {
  if (view === 'dashboard') return <DashboardPage onOpenCandidates={onOpenCandidates} />;
  if (view === 'candidates') return <CandidatePage />;
  if (view === 'interviews') return <InterviewsPage />;
  if (view === 'jobs') return <JobsPage />;
  if (view === 'selection') return <SelectionPage />;
  if (view === 'reports') return <ReportsPage />;
  return <SettingsPage />;
};

export const App = () => {
  const [view, setView] = useState<AppView>('dashboard');

  return (
    <CandidateProvider>
      <AppShell activeView={view} onChangeView={setView}>
        <AppContent view={view} onOpenCandidates={() => setView('candidates')} />
      </AppShell>
    </CandidateProvider>
  );
};
