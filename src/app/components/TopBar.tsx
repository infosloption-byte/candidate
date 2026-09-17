import { Icon } from '../../shared/components/Icon';

interface TopBarProps {
  onOpenCandidates: () => void;
}

export const TopBar = ({ onOpenCandidates }: TopBarProps) => (
  <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p><p className="text-sm font-semibold text-slate-800">Sri Lanka Recruitment</p></div>
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Notifications" className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"><Icon name="bell" size={18} /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" /></button>
      <button type="button" onClick={onOpenCandidates} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex"><Icon name="search" size={15} /> Quick find</button>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">HR</div>
    </div>
  </header>
);
