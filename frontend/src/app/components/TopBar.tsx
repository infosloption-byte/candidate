import { Icon } from '../../shared/components/Icon';
import type { AppView } from './AppShell';
import type { User, UserRole } from '../../domain/types';

interface TopBarProps {
  role: UserRole;
  activeView: AppView;
  user: User;
  showDevelopmentRoleSelector: boolean;
  onOpenMobileNav: () => void;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
}

const titles: Record<AppView, string> = {
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  candidates: 'Candidates',
  applications: 'Applications',
  interviews: 'Interviews',
  agencies: 'Agencies & Users',
  settings: 'Settings',
};

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  AGENCY: 'Agency',
  INTERVIEWER: 'Interviewer',
  INTERVIEWEE: 'Interviewee',
};

export const TopBar = ({
  role,
  activeView,
  user,
  showDevelopmentRoleSelector,
  onOpenMobileNav,
  onRoleChange,
  onLogout,
}: TopBarProps) => (
  <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/92 px-3 backdrop-blur-xl sm:px-5">
    <button type="button" onClick={onOpenMobileNav} aria-label="Open navigation" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"><Icon name="menu" size={19} /></button>
    <div className="min-w-0 flex-1 lg:max-w-sm"><p className="truncate text-sm font-bold text-slate-950">{titles[activeView]}</p><p className="hidden truncate text-[11px] text-slate-500 sm:block">Core recruitment workflow</p></div>
    <div className="hidden min-w-0 flex-1 md:block md:max-w-md">
      <div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><div className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-14 text-sm text-slate-400">Search workspace…</div><kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">/</kbd></div>
    </div>
    {showDevelopmentRoleSelector && <div className="hidden min-w-0 items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 sm:flex">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Dev role</span>
      <select value={role} onChange={(event) => onRoleChange(event.target.value as UserRole)} className="bg-transparent text-[11px] font-bold text-slate-700 outline-none">
        {(Object.keys(roleLabels) as UserRole[]).map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
      </select>
    </div>}
    <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900">
      <span className="text-sm font-black">↪</span>
    </button>
    <div className="grid size-10 place-items-center rounded-xl text-slate-500" aria-hidden="true"><Icon name="bell" size={18} /></div>
    <div className="flex items-center gap-2 rounded-xl px-2 py-1.5"><div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{role === 'INTERVIEWEE' ? 'IN' : role === 'INTERVIEWER' ? 'IR' : role === 'AGENCY' ? 'AG' : 'AD'}</div><div className="hidden text-left lg:block"><p className="max-w-44 truncate text-xs font-bold text-slate-800">{user.name}</p><p className="max-w-44 truncate text-[10px] text-slate-500">{user.email}</p></div></div>
  </header>
);
