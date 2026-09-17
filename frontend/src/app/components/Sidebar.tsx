import type { AppView } from '../context/AppContext';
import { useAppShell } from '../hooks/useAppShell';
import { Icon, type IconName } from '../../shared/components/Icon';

interface SidebarProps { onNavigate?: () => void; }

const nav: Array<{ view: AppView; label: string; icon: IconName; section?: string }> = [
  { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { view: 'candidates', label: 'Candidates', icon: 'users' },
  { view: 'interviews', label: 'Interviews', icon: 'calendar' },
  { view: 'jobs', label: 'Jobs', icon: 'briefcase', section: 'Manage' },
  { view: 'selection', label: 'Selection', icon: 'target' },
  { view: 'reports', label: 'Reports', icon: 'chart', section: 'Insights' },
  { view: 'settings', label: 'Settings', icon: 'settings', section: 'System' },
];

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const { state, actions } = useAppShell();
  const sections: Array<{ label: string; items: typeof nav }> = [
    { label: 'Workspace', items: nav.slice(0, 3) },
    { label: 'Manage', items: nav.slice(3, 5) },
    { label: 'Insights', items: nav.slice(5, 6) },
    { label: 'System', items: nav.slice(6) },
  ];

  return (
    <aside className="flex h-full w-full flex-col bg-slate-950 text-white" aria-label="Primary navigation">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-400 text-slate-950 font-black">B</div>
        {!state.sidebarCollapsed && <div className="min-w-0"><p className="truncate text-sm font-bold">BuildHire</p><p className="text-[10px] text-slate-400">Recruitment workspace</p></div>}
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            {!state.sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{section.label}</p>}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = state.activeView === item.view;
                return <button key={item.view} type="button" aria-current={active ? 'page' : undefined} onClick={() => { actions.setView(item.view); onNavigate?.(); }} title={state.sidebarCollapsed ? item.label : undefined} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/20' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}>
                  <Icon name={item.icon} size={18} />
                  {!state.sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>;
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-2">
        <button type="button" title={state.sidebarCollapsed ? 'Collapse sidebar is disabled here' : undefined} onClick={actions.toggleSidebar} className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/7 hover:text-white lg:flex">
          <Icon name={state.sidebarCollapsed ? 'chevron-right' : 'chevron-left'} size={16} />
          {!state.sidebarCollapsed && 'Collapse sidebar'}
        </button>
      </div>
    </aside>
  );
};
