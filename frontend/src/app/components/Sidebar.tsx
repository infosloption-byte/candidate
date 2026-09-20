import { Icon, type IconName } from '../../shared/components/Icon';
import type { AppView } from './AppShell';
import type { UserRole } from '../../domain/types';

interface SidebarProps {
  role: UserRole;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navByRole: Record<UserRole, Array<{ label: string; items: Array<{ view: AppView; label: string; icon: IconName }> }>> = {
  ADMIN: [
    { label: 'Operations', items: [
      { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { view: 'calendar', label: 'Calendar', icon: 'calendar' },
      { view: 'reports', label: 'Reports', icon: 'chart' },
      { view: 'jobs', label: 'Jobs', icon: 'briefcase' },
      { view: 'candidates', label: 'Candidates', icon: 'users' },
      { view: 'interviews', label: 'Interviews', icon: 'calendar' },
      { view: 'criteria', label: 'Interview criteria', icon: 'target' },
    ]},
    { label: 'Administration', items: [
      { view: 'agencies', label: 'Agencies & Users', icon: 'users' },
      { view: 'settings', label: 'Settings', icon: 'settings' },
    ]},
  ],
  AGENCY: [
    { label: 'Recruitment', items: [
      { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { view: 'calendar', label: 'Calendar', icon: 'calendar' },
      { view: 'reports', label: 'Reports', icon: 'chart' },
      { view: 'jobs', label: 'Jobs', icon: 'briefcase' },
      { view: 'candidates', label: 'Candidates', icon: 'users' },
      { view: 'interviews', label: 'Interviews', icon: 'calendar' },
      { view: 'criteria', label: 'Interview criteria', icon: 'target' },
    ]},
    { label: 'Administration', items: [
      { view: 'settings', label: 'Settings', icon: 'settings' },
    ]},
  ],
  INTERVIEWER: [
    { label: 'Interview desk', items: [
      { view: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { view: 'calendar', label: 'Calendar', icon: 'calendar' },
      { view: 'reports', label: 'Reports', icon: 'chart' },
      { view: 'interviews', label: 'My Interviews', icon: 'calendar' },
    ]},
  ],
  INTERVIEWEE: [
    { label: 'My recruitment', items: [
      { view: 'calendar', label: 'Calendar', icon: 'calendar' },
      { view: 'interviews', label: 'My Interviews', icon: 'calendar' },
      { view: 'candidates', label: 'My Profile', icon: 'users' },
    ]},
  ],
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'System administrator',
  AGENCY: 'Agency workspace',
  INTERVIEWER: 'Interview desk',
  INTERVIEWEE: 'Candidate portal',
};

export const Sidebar = ({ role, activeView, onNavigate, collapsed, onToggleCollapse }: SidebarProps) => (
  <aside className="flex h-full w-full flex-col bg-slate-950 text-white" aria-label="Primary navigation">
    <div className={`relative flex min-h-[72px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400 font-black text-[15px] text-slate-950 shadow-lg shadow-cyan-950/20">B</div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-tight">BuildHire</p>
          <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{roleLabels[role]}</p>
        </div>
      )}
      <button
        type="button"
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`hidden size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white lg:grid ${collapsed ? 'absolute right-1.5 top-4' : ''}`}
      >
        <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
      </button>
    </div>

    <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Workspace">
      {navByRole[role].map((group) => (
        <div key={group.label} className="mb-6 last:mb-0">
          {!collapsed && (
            <p className="px-2.5 pb-2.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = activeView === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onNavigate(item.view)}
                  title={item.label}
                  className={[
                    'group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-bold transition',
                    collapsed ? 'justify-center' : '',
                    active
                      ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/20'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
                  ].join(' ')}
                >
                  <Icon name={item.icon} size={18} strokeWidth={active ? 2 : 1.8} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>

    <div className="border-t border-white/10 px-3 py-3">
      {!collapsed && (
        <div className="rounded-xl border border-white/7 bg-white/[0.03] px-3 py-2.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Workspace</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-300">
            {role === 'ADMIN' ? 'System administration' : role === 'AGENCY' ? 'Recruitment operations' : role === 'INTERVIEWER' ? 'Interview operations' : 'Candidate portal'}
          </p>
        </div>
      )}
    </div>
  </aside>
);
