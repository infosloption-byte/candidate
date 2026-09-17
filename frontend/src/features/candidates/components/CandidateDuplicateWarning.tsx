import { Icon } from '../../../shared/components/Icon';
import type { Candidate, CandidateDuplicateMatch } from '../types/candidate';

interface CandidateDuplicateWarningProps {
  matches: CandidateDuplicateMatch[];
  candidates: Candidate[];
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  onReview: (candidateId: string) => void;
}

export const CandidateDuplicateWarning = ({ matches, candidates, acknowledged, onAcknowledge, onReview }: CandidateDuplicateWarningProps) => {
  if (matches.length === 0) return null;

  const high = matches.filter((match) => match.confidence === 'high');
  const possible = matches.filter((match) => match.confidence === 'possible');
  const topMatches = matches.slice(0, 3);

  return (
    <section className={`mt-4 rounded-2xl border p-4 ${high.length ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`} aria-labelledby="duplicate-warning-title">
      <div className="flex items-start gap-3">
        <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${high.length ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500'}`}><Icon name="alert" size={17}/></div>
        <div className="min-w-0 flex-1"><h3 id="duplicate-warning-title" className="text-xs font-black text-slate-900">{high.length ? 'Possible duplicate found' : 'Similar candidates found'}</h3><p className="mt-1 text-[11px] leading-5 text-slate-600">{high.length ? 'A passport or phone match suggests this person may already be in the talent pool.' : 'There are existing candidates with similar identifying details. Review before creating another profile.'}</p></div>
      </div>

      <div className="mt-3 space-y-2">
        {topMatches.map((match) => {
          const candidate = candidates.find((item) => item.id === match.candidateId);
          if (!candidate) return null;
          return <div key={match.candidateId} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-[10px] font-black text-white">{candidate.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{candidate.name}</p><p className="truncate text-[10px] text-slate-500">{candidate.profession} · {candidate.reference}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{match.reasons.join(' · ')}</p></div><div className="text-right"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${match.confidence === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{match.confidence === 'high' ? 'High match' : 'Possible'}</span><button type="button" onClick={() => onReview(candidate.id)} className="mt-1 block w-full text-[9px] font-bold text-cyan-700 hover:text-cyan-800">Review</button></div></div>;
        })}
      </div>

      {high.length > 0 && <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-200"><input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} className="mt-0.5 size-4 accent-cyan-600"/><span className="text-[10px] leading-5 text-slate-600">I reviewed the possible duplicate and this is a genuinely different candidate.</span></label>}
      {possible.length > 0 && high.length === 0 && <p className="mt-2 text-[10px] text-slate-500">Possible matches are informational and do not block creation.</p>}
    </section>
  );
};
