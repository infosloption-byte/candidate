import { useId, useState, type ReactNode } from 'react';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { User, UserRole } from '../../domain/types';

export type AppView = 'dashboard' | 'calendar' | 'reports' | 'jobs' | 'job-detail' | 'candidates' | 'interviews' | 'criteria' | 'agencies' | 'settings';

interface AppShellProps {
  role: UserRole;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  user: User;
  showDevelopmentRoleSelector: boolean;
  children: ReactNode;
}

export const AppShell = ({
  role,
  activeView,
  onNavigate,
  onRoleChange,
  onLogout,
  user,
  showDevelopmentRoleSelector,
  children,
}: AppShellProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem('buildhire.sidebar-collapsed') === 'true');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavTitleId = useId();
  const mobileNavRef = useFocusTrap({ enabled: mobileNavOpen, onEscape: () => setMobileNavOpen(false) });

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('buildhire.sidebar-collapsed', String(next));
      return next;
    });
  };

  const navigate = (view: AppView) => {
    onNavigate(view);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-100">
      <aside className={`hidden shrink-0 border-r border-slate-900/10 transition-[width] duration-200 lg:block ${sidebarCollapsed ? 'w-[72px]' : 'w-[248px]'}`}>
        <Sidebar role={role} activeView={activeView} onNavigate={navigate} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </aside>
      {mobileNavOpen && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}
      <aside ref={mobileNavRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={mobileNavTitleId} className={`fixed inset-y-0 left-0 z-50 w-[280px] transform shadow-2xl transition-transform duration-200 lg:hidden ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <h2 id={mobileNavTitleId} className="sr-only">Mobile navigation</h2>
        <Sidebar role={role} activeView={activeView} onNavigate={navigate} collapsed={false} onToggleCollapse={() => undefined} />
        <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-white/10 text-white">×</button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          role={role}
          activeView={activeView}
          user={user}
          showDevelopmentRoleSelector={showDevelopmentRoleSelector}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onRoleChange={onRoleChange}
          onLogout={onLogout}
        />
        <main className="scrollbar-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
