import type { IconName } from '../../shared/components/Icon';
import { Icon } from '../../shared/components/Icon';

export type AppView = 'dashboard' | 'candidates' | 'interviews' | 'jobs' | 'selection' | 'reports' | 'settings';

interface SidebarProps {
  activeView: AppView;
  onChange: (view: AppView) => void;
}

const primaryNav: Array<{ view: AppView; label: string; icon: IconName }> = [
  { view: 'dashboard', label: 'Dashboard', icon: 'home' },
  { view: 'candidates', label: 'Candidates', icon: 'users' },
  { view: 'interviews', label: 'Interviews', icon: 'calendar' },
  { view: 'jobs', label: 'Jobs', icon: 'briefcase' },
  { view: 'selection', label: 'Selection', icon: 'layers' },
  { view: 'reports', label: 'Reports', icon: 'chart' },
];

export const Sidebar = ({ activeView, onChange }: SidebarProps) => (
  <aside className="w-full shrink-0 border-b border-slate-800 bg-slate-950 text-slate-300 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:border-slate-800" aria-label="Primary navigation">
    <div className="flex items-center gap-3 px-4 py-4 lg:px-5 lg:py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">B</div>
      <div><p className="text-sm font-bold text-white">BuildHire</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Candidate ERP</p></div>
    </div>
    <nav className="scrollbar-thin flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3 lg:pb-0">
      {primaryNav.map((item) => (
        <button key={item.view} type="button" onClick={() => onChange(item.view)} aria-current={activeView === item.view ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:w-full ${activeView === item.view ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
          <Icon name={item.icon} size={18} />{item.label}
        </button>
      ))}
      <button type="button" onClick={() => onChange('settings')} aria-current={activeView === 'settings' ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:mt-6 lg:w-full ${activeView === 'settings' ? 'bg-white text-slate-950' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
        <Icon name="settings" size={18} />Settings
      </button>
    </nav>
    <div className="hidden border-t border-slate-800 p-4 lg:block"><div className="rounded-2xl bg-slate-900 p-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">HR</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-white">HR Workspace</p><p className="truncate text-[11px] text-slate-500">Recruitment team</p></div></div></div></div>
  </aside>
);
