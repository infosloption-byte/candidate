import type { AppView } from '../context/AppContextTypes';
import { useAppShell } from '../hooks/useAppShell';
import { Icon, type IconName } from '../../shared/components/Icon';
import { usePermissions } from '../../features/auth/hooks/usePermissions';

interface SidebarProps { onNavigate?: () => void; forceExpanded?: boolean; }

const nav: Array<{ view: AppView; label: string; icon: IconName }> = [
  { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { view: 'candidates', label: 'Candidates', icon: 'users' },
  { view: 'interviews', label: 'Interviews', icon: 'calendar' },
  { view: 'jobs', label: 'Jobs', icon: 'briefcase' },
  { view: 'selection', label: 'Selection', icon: 'target' },
  { view: 'allocation', label: 'Allocation', icon: 'target' },
  { view: 'documents', label: 'Documents', icon: 'file' },
  { view: 'reports', label: 'Reports', icon: 'chart' },
  { view: 'notifications', label: 'Notifications', icon: 'bell' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];

export const Sidebar = ({ onNavigate, forceExpanded = false }: SidebarProps) => {
  const { state, actions } = useAppShell();
  const { canView } = usePermissions();
  const isCollapsed = forceExpanded ? false : state.sidebarCollapsed;
  const groups: Array<{ label: string; items: typeof nav }> = [
    { label: 'Workspace', items: nav.slice(0, 3).filter((item) => canView(item.view)) },
    { label: 'Manage', items: nav.slice(3, 7).filter((item) => canView(item.view)) },
    { label: 'Insights', items: nav.slice(7, 9).filter((item) => canView(item.view)) },
    { label: 'System', items: nav.slice(9).filter((item) => canView(item.view)) },
  ];

  return <aside className="flex h-full w-full flex-col bg-slate-950 text-white" aria-label="Primary navigation">
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-400 font-black text-slate-950">B</div>{!isCollapsed && <div className="min-w-0"><p className="truncate text-sm font-bold">BuildHire</p><p className="text-[10px] text-slate-400">Recruitment workspace</p></div>}</div>
    <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-4">
      {groups.filter((group) => group.items.length > 0).map((group) => <div key={group.label} className="mb-5">{!isCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>}<div className="space-y-1">{group.items.map((item) => { const active = state.activeView === item.view; return <button key={item.view} type="button" aria-current={active ? 'page' : undefined} onClick={() => { actions.setView(item.view); onNavigate?.(); }} title={item.label} className={'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ' + (active ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/20' : 'text-slate-300 hover:bg-white/7 hover:text-white')}><Icon name={item.icon} size={18}/>{!isCollapsed && <span className="truncate">{item.label}</span>}</button>; })}</div></div>)}
    </nav>
    <div className="border-t border-white/10 p-2"><button type="button" onClick={actions.toggleSidebar} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/7 hover:text-white lg:flex"><Icon name={isCollapsed ? 'chevron-right' : 'chevron-left'} size={16}/>{!isCollapsed && 'Collapse sidebar'}</button></div>
  </aside>;
};