import { useId, type ReactNode } from 'react';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { useAppShell } from '../hooks/useAppShell';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Icon } from '../../shared/components/Icon';

interface AppShellProps { children: ReactNode; searchValue: string; onSearch: (value: string) => void; }

export const AppShell = ({ children, searchValue, onSearch }: AppShellProps) => {
  const { state, actions } = useAppShell();
  const mobileNavTitleId = useId();
  const mobileNavRef = useFocusTrap({ enabled: state.mobileNavOpen, onEscape: actions.closeMobileNav });
  useGlobalShortcuts();
  const subtitle = state.activeView === 'dashboard'
    ? 'Daily recruiter overview and action center.'
    : state.activeView === 'candidates'
      ? 'Find the right people without losing interview context.'
      : state.activeView === 'reports'
        ? 'Operational recruitment analytics and exports.'
        : state.activeView === 'jobs'
          ? 'Manpower requirements, vacancies and client demand.'
          : state.activeView === 'settings'
            ? 'Reference data, users and workspace controls.'
            : state.activeView === 'documents'
              ? 'Candidate files and verification workflow.'
              : state.activeView === 'allocation'
                ? 'Cross-job candidate matching and allocation.'
                : 'Construction recruitment workspace';

  return <div className="flex h-dvh overflow-hidden bg-slate-100">
    <aside className={`hidden shrink-0 border-r border-slate-900/10 transition-[width] duration-200 lg:block ${state.sidebarCollapsed ? 'w-[72px]' : 'w-[248px]'}`}><Sidebar /></aside>
    {state.mobileNavOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={actions.closeMobileNav} aria-hidden="true" />}
    <aside ref={mobileNavRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={mobileNavTitleId} className={`fixed inset-y-0 left-0 z-50 w-[280px] transform shadow-2xl transition-transform duration-200 lg:hidden ${state.mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <h2 id={mobileNavTitleId} className="sr-only">Mobile navigation</h2>
      <Sidebar forceExpanded onNavigate={actions.closeMobileNav}/>
      <button type="button" onClick={actions.closeMobileNav} aria-label="Close navigation" title="Close navigation" className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-white/10 text-white"><Icon name="x" size={18}/></button>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col"><TopBar title="" subtitle={subtitle} searchValue={searchValue} onSearch={onSearch}/><main className="scrollbar-thin min-h-0 flex-1 overflow-auto">{children}</main></div>
  </div>;
};
