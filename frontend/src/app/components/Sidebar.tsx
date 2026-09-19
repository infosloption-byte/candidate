import { Icon, type IconName } from '../../shared/components/Icon';
import type { AppView } from './AppShell';

interface SidebarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const groups: Array<{ label: string; items: Array<{ view: AppView; label: string; icon: IconName }> }> = [
  { label: 'Workspace', items: [
    { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { view: 'jobs', label: 'Jobs', icon: 'briefcase' },
    { view: 'candidates', label: 'Candidates', icon: 'users' },
    { view: 'applications', label: 'Applications', icon: 'file' },
    { view: 'interviews', label: 'Interviews', icon: 'calendar' },
  ]},
  { label: 'Administration', items: [
    { view: 'agencies', label: 'Agencies & Users', icon: 'users' },
    { view: 'settings', label: 'Settings', icon: 'settings' },
  ]},
];

export const Sidebar = ({ activeView, onNavigate, collapsed, onToggleCollapse }: SidebarProps) => (
  <aside className="flex h-full w-full flex-col bg-slate-950 text-white" aria-label="Primary navigation">
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan-400 font-black text-slate-950">B</div>
      {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-bold">BuildHire</p><p className="text-[10px] text-slate-400">Recruitment workspace</p></div>}
    </div>
    <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-4">
      {groups.map((group) => (
        <div key={group.label} className="mb-5">
          {!collapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = activeView === item.view;
              return <button key={item.view} type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(item.view)} title={item.label} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/20' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}>
                <Icon name={item.icon} size={18} />{!collapsed && <span className="truncate">{item.label}</span>}
              </button>;
            })}
          </div>
        </div>
      ))}
    </nav>
    <div className="border-t border-white/10 p-2">
      <button type="button" onClick={onToggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/7 hover:text-white lg:flex">
        <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />{!collapsed && 'Collapse sidebar'}
      </button>
    </div>
  </aside>
);
