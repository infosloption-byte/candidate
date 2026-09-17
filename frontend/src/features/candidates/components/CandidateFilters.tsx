import { useEffect, useRef } from 'react';
import { Icon } from '../../../shared/components/Icon';
import type { CandidateSmartFilters, CandidateStatus } from '../types/candidate';

interface CandidateFiltersProps {
  search: string;
  status: CandidateStatus | 'all';
  profession: string;
  professions: string[];
  resultCount: number;
  smartFilterCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CandidateStatus | 'all') => void;
  onProfessionChange: (value: string) => void;
  onOpenSmartFilters: () => void;
  smartFiltersOpen: boolean;
  smartFilters: CandidateSmartFilters;
}

const statuses: Array<{ value: CandidateStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'reserve', label: 'Reserve' },
  { value: 'rejected', label: 'Rejected' },
];

export const CandidateFilters = ({ search, status, profession, professions, resultCount, smartFilterCount, onSearchChange, onStatusChange, onProfessionChange, onOpenSmartFilters, smartFiltersOpen, smartFilters }: CandidateFiltersProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasExperience = smartFilters.minExperience !== null || smartFilters.maxExperience !== null;

  return (
    <div className="border-b border-slate-200 bg-white p-3 sm:p-4">
      <label className="relative block"><span className="sr-only">Search candidates</span><Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input ref={inputRef} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search name, skill, profession…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-12 text-sm outline-none focus:border-cyan-300 focus:bg-white"/><kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 sm:block">Ctrl K</kbd></label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label><span className="sr-only">Status</span><select aria-label="Filter by status" value={status} onChange={(event) => onStatusChange(event.target.value as CandidateStatus | 'all')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-cyan-300">{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span className="sr-only">Profession</span><select aria-label="Filter by profession" value={profession} onChange={(event) => onProfessionChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-cyan-300">{professions.map((item) => <option key={item} value={item}>{item === 'all' ? 'All professions' : item}</option>)}</select></label>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><Icon name="sliders" size={13} /> {resultCount} matching</span><button type="button" aria-expanded={smartFiltersOpen} onClick={onOpenSmartFilters} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${smartFiltersOpen || smartFilterCount > 0 ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}><Icon name="sliders" size={13}/><span>Smart filters</span>{smartFilterCount > 0 && <span className="grid min-w-4 place-items-center rounded-full bg-cyan-600 px-1 text-[9px] font-black text-white">{smartFilterCount}</span>}{hasExperience && <span className="sr-only">Experience range active</span>}</button></div>
    </div>
  );
};
