import type { Candidate } from '../types/candidate';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Icon } from '../../../shared/components/Icon';

interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onSelect: (candidateId: string) => void;
}

export const CandidateCard = ({ candidate, selected, onSelect }: CandidateCardProps) => (
  <button type="button" onClick={() => onSelect(candidate.id)} aria-pressed={selected} className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${selected ? 'bg-blue-50/70' : 'bg-white'}`}>
    <div className="flex items-start gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{candidate.initials}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{candidate.name}</p><p className="mt-0.5 text-xs text-slate-500">{candidate.profession} · {candidate.reference}</p></div>
          <StatusBadge status={candidate.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{candidate.secondarySkills.slice(0, 3).map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{skill}</span>)}</div>
        <div className="mt-3 flex items-center justify-between gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Icon name="briefcase" size={14} /> {candidate.experienceYears} yrs</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="map-pin" size={14} /> {candidate.location}</span>
          <span className={`font-bold ${candidate.fitScore >= 85 ? 'text-emerald-600' : candidate.fitScore >= 70 ? 'text-amber-600' : 'text-slate-500'}`}>{candidate.fitScore}% fit</span>
        </div>
      </div>
    </div>
  </button>
);
