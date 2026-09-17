import { Icon } from '../../../shared/components/Icon';
import type { Candidate, CandidateDuplicateMatch } from '../types/candidate';

interface CandidateDuplicatePanelProps {
  matches: CandidateDuplicateMatch[];
  candidates: Candidate[];
  onOpenCandidate: (candidateId: string) => void;
}

export const CandidateDuplicatePanel = ({ matches, candidates, onOpenCandidate }: CandidateDuplicatePanelProps) => {
  if (matches.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm sm:p-5" aria-labelledby="duplicate-title">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm"><Icon name="alert" size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 id="duplicate-title" className="text-sm font-black text-amber-950">Possible duplicate candidate</h2><p className="mt-0.5 text-xs leading-5 text-amber-800">Review these matches before creating a second profile.</p></div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-amber-800 ring-1 ring-amber-200">{matches.length} match{matches.length === 1 ? '' : 'es'}</span>
          </div>
          <div className="mt-3 space-y-2">
            {matches.map((match) => {
              const candidate = candidates.find((item) => item.id === match.candidateId);
              if (!candidate) return null;
              return <button key={match.candidateId} type="button" onClick={() => onOpenCandidate(match.candidateId)} className="flex w-full items-start gap-3 rounded-xl border border-amber-200/70 bg-white p-3 text-left hover:border-amber-300 hover:bg-amber-50">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-[10px] font-black text-white">{candidate.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-xs font-bold text-slate-900">{candidate.name}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${match.confidence === 'high' ? 'bg-rose-50 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>{match.confidence === 'high' ? 'High confidence' : 'Possible match'}</span></div><p className="mt-0.5 text-[10px] text-slate-500">{candidate.profession} · {candidate.reference}</p><div className="mt-2 flex flex-wrap gap-1.5">{match.reasons.map((reason) => <span key={reason} className="rounded-md bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-600">{reason}</span>)}</div></div><Icon name="chevron-right" size={15} className="mt-2 shrink-0 text-amber-400" />
              </button>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
