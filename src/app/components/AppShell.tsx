import type { PropsWithChildren } from 'react';
import { Sidebar, type AppView } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps extends PropsWithChildren {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
}

export const AppShell = ({ children, activeView, onChangeView }: AppShellProps) => (
  <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
    <Sidebar activeView={activeView} onChange={onChangeView} />
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TopBar onOpenCandidates={() => onChangeView('candidates')} />
      {children}
    </div>
  </div>
);
