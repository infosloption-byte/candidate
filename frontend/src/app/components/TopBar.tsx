import { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { useAppShell } from '../hooks/useAppShell';
import { Icon } from '../../shared/components/Icon';
import type { AppView } from '../context/AppContextTypes';
import { useNotifications } from '../../features/notifications/hooks/useNotifications';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { roleLabel } from '../../features/auth/services/permissions';

interface TopBarProps {
  title: string;
  subtitle: string;
  onSearch: (value: string) => void;
  searchValue: string;
}

const titles: Record<AppView, string> = {
  dashboard: 'Dashboard',
  candidates: 'Candidates',
  interviews: 'Interviews',
  jobs: 'Jobs',
  selection: 'Selection',
  allocation: 'Allocation',
  documents: 'Documents',
  reports: 'Reports',
  notifications: 'Notifications',
  settings: 'Settings',
  'candidate-portal': 'Candidate portal',
};

export const TopBar = ({ title, subtitle, onSearch, searchValue }: TopBarProps) => {
  const { state, actions } = useAppShell();
  const { dispatch } = useAppContext();
  const { unreadCount } = useNotifications();
  const { state: authState, dispatch: authDispatch } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentTitle = titles[state.activeView] ?? title;

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/92 px-3 backdrop-blur-xl sm:px-5">
      <button type="button" onClick={actions.openMobileNav} aria-label="Open navigation" title="Open navigation" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"><Icon name="menu" size={19} /></button>
      <div className="min-w-0 flex-1 lg:max-w-sm"><p className="truncate text-sm font-bold text-slate-950">{currentTitle}</p><p className="hidden truncate text-[11px] text-slate-500 sm:block">{subtitle}</p></div>
      <label className="hidden min-w-0 flex-1 md:block md:max-w-md"><span className="sr-only">Search candidates</span><div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="global-search" value={searchValue} onChange={(event) => onSearch(event.target.value)} placeholder="Search candidates, skills, professions…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-14 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white" /><kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">/</kbd></div></label>
      <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'notifications' })} className="relative grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50" aria-label="Open notifications" title={unreadCount > 0 ? unreadCount + ' unread notifications' : 'Open notifications'}><Icon name="bell" size={18} />{unreadCount > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-cyan-500 px-1 text-[8px] font-black leading-4 text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
      <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'candidate-portal' })} title="Open candidate portal preview" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 sm:block">Portal preview</button>
      <div className="relative">
        <button type="button" onClick={() => setMenuOpen((current) => !current)} aria-expanded={menuOpen} aria-haspopup="menu" title="Open account menu" className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50">
          <div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{authState.user.name.slice(0, 2).toUpperCase() || 'BH'}</div>
          <div className="hidden text-left lg:block"><p className="max-w-36 truncate text-xs font-bold text-slate-800">{authState.user.name}</p><p className="text-[10px] text-slate-500">{roleLabel(authState.user.role)}</p></div>
        </button>
        {menuOpen && <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="menu">
          <p className="truncate px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{authState.user.email ?? 'Authenticated session'}</p>
          <button type="button" onClick={() => { authDispatch({ type: 'OPEN_CHANGE_PASSWORD' }); setMenuOpen(false); }} title="Open change password" className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50" role="menuitem">Change password</button>
          <button type="button" onClick={() => { authDispatch({ type: 'LOGOUT' }); setMenuOpen(false); }} title="Sign out of this account" className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-700 hover:bg-rose-50" role="menuitem">Sign out</button>
        </div>}
      </div>
    </header>
  );
};
