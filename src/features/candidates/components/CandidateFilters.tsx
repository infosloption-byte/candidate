import type { CandidateStatus } from '../types/candidate';
import { Icon } from '../../../shared/components/Icon';

interface CandidateFiltersProps {
  search: string;
  status: CandidateStatus | 'all';
  profession: string;
  professions: string[];
  resultCount: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CandidateStatus | 'all') => void;
  onProfessionChange: (value: string) => void;
}

export const CandidateFilters = ({ search, status, profession, professions, resultCount, onSearchChange, onStatusChange, onProfessionChange }: CandidateFiltersProps) => (
  <div className="space-y-3 border-b border-slate-200 p-4">
    <div className="relative">
      <label className="sr-only" htmlFor="candidate-search">Search candidates</label>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input id="candidate-search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search name, profession, skill..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="sr-only" htmlFor="candidate-status">Status</label>
        <select id="candidate-status" value={status} onChange={(event) => onStatusChange(event.target.value as CandidateStatus | 'all')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
          <option value="all">All statuses</option><option value="new">New</option><option value="screening">Screening</option><option value="interview">Interview</option><option value="selected">Selected</option><option value="reserve">Reserve</option><option value="rejected">Rejected</option>
        </select>
      </div>
      <div>
        <label className="sr-only" htmlFor="candidate-profession">Profession</label>
        <select id="candidate-profession" value={profession} onChange={(event) => onProfessionChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50">
          {professions.map((item) => <option key={item} value={item}>{item === 'all' ? 'All professions' : item}</option>)}
        </select>
      </div>
    </div>
    <div className="flex items-center justify-between text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Icon name="filter" size={14} /> Filtered results</span><strong className="text-slate-700">{resultCount}</strong></div>
  </div>
);
