import { useAppShell } from '../hooks/useAppShell';
import { Icon } from '../../shared/components/Icon';
import type { AppView } from '../context/AppContextTypes';

interface TopBarProps { title: string; subtitle: string; onSearch: (value: string) => void; searchValue: string; }
const titles: Record<AppView, string> = { dashboard: 'Dashboard', candidates: 'Candidates', interviews: 'Interviews', jobs: 'Jobs', selection: 'Selection', reports: 'Reports', settings: 'Settings' };

export const TopBar = ({ title, subtitle, onSearch, searchValue }: TopBarProps) => {
  const { state, actions } = useAppShell();
  const currentTitle = titles[state.activeView] ?? title;
  return <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/92 px-3 backdrop-blur-xl sm:px-5">
    <button type="button" onClick={actions.openMobileNav} aria-label="Open navigation" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"><Icon name="menu" size={19}/></button>
    <div className="min-w-0 flex-1 lg:max-w-sm"><p className="truncate text-sm font-bold text-slate-950">{currentTitle}</p><p className="hidden truncate text-[11px] text-slate-500 sm:block">{subtitle}</p></div>
    <label className="hidden min-w-0 flex-1 md:block md:max-w-md"><span className="sr-only">Search candidates</span><div className="relative"><Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input id="global-search" value={searchValue} onChange={(event) => onSearch(event.target.value)} placeholder="Search candidates, skills, professions…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-14 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white"/><kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">/</kbd></div></label>
    <button type="button" className="hidden size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50 sm:grid" aria-label="Notifications"><Icon name="bell" size={18}/><span className="absolute ml-4 mt-[-12px] size-2 rounded-full bg-cyan-500 ring-2 ring-white"/></button>
    <div className="hidden h-8 w-px bg-slate-200 sm:block" />
    <div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">NF</div><div className="hidden lg:block"><p className="text-xs font-bold text-slate-800">Nadeesha Fernando</p><p className="text-[10px] text-slate-500">Recruitment</p></div></div>
  </header>;
};
