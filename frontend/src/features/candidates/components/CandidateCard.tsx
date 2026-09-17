import { Icon } from '../../../shared/components/Icon';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { Candidate } from '../types/candidate';

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  compareSelected: boolean;
  compareDisabled: boolean;
  onSelect: (candidateId: string) => void;
  onToggleCompare: (candidateId: string) => void;
}

export const CandidateCard = ({ candidate, selected, compareSelected, compareDisabled, onSelect, onToggleCompare }: CandidateCardProps) => {
  const initials = candidate.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <article className={`group relative flex items-start gap-3 border-b border-slate-100 px-3 py-3.5 transition sm:px-4 ${selected ? 'bg-cyan-50/70' : 'bg-white hover:bg-slate-50'}`}>
      <div className="relative shrink-0">
        <button type="button" aria-label={`Open ${candidate.name}`} aria-pressed={selected} onClick={() => onSelect(candidate.id)} className="grid size-10 place-items-center rounded-xl bg-slate-900 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2">{initials}</button>
        <button type="button" aria-label={`${compareSelected ? 'Remove' : 'Add'} ${candidate.name} ${compareSelected ? 'from' : 'to'} comparison`} aria-pressed={compareSelected} disabled={compareDisabled && !compareSelected} onClick={() => onToggleCompare(candidate.id)} className={`absolute -bottom-1.5 -right-1.5 grid size-6 place-items-center rounded-full border-2 border-white transition ${compareSelected ? 'bg-cyan-600 text-white' : compareDisabled ? 'bg-slate-100 text-slate-300' : 'bg-white text-slate-400 shadow-sm hover:bg-cyan-50 hover:text-cyan-700'}`}>
          {compareSelected ? <Icon name="check" size={12} strokeWidth={2.5} /> : <Icon name="plus" size={11} strokeWidth={2.2} />}
        </button>
      </div>
      <button type="button" onClick={() => onSelect(candidate.id)} className="min-w-0 flex-1 text-left focus:outline-none">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{candidate.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{candidate.profession} · {candidate.experienceYears} yrs</p></div><span className="shrink-0 text-xs font-black text-slate-700">{candidate.fitScore ? `${candidate.fitScore}%` : '—'}</span></div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5"><StatusBadge status={candidate.status} compact />{candidate.availability === 'Available now' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500"/>Available</span>}</div>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px] text-slate-400"><Icon name="map-pin" size={12}/><span className="truncate">{candidate.location}</span><span>·</span><span className="truncate">{candidate.reference}</span></div>
      </button>
      <Icon name="chevron-right" size={16} className={`mt-3 shrink-0 text-slate-300 transition group-hover:text-slate-500 ${selected ? 'text-cyan-600' : ''}`} />
    </article>
  );
};
