import { Icon } from '../../../shared/components/Icon';
import type { SelectionCandidateRow } from '../hooks/useSelectionWorkspace';
import type { SelectionDecision } from '../types/selection';

interface SelectionCandidateCardProps {
  row: SelectionCandidateRow;
  selected: boolean;
  bulkSelected: boolean;
  onSelect: (candidateId: string) => void;
  onToggleBulk: (candidateId: string) => void;
}

const decisionLabel: Record<SelectionDecision, string> = { recommended: 'Recommended', selected: 'Selected', reserve: 'Reserve', rejected: 'Rejected' };
const decisionClass: Record<SelectionDecision, string> = { recommended: 'bg-cyan-50 text-cyan-700', selected: 'bg-emerald-50 text-emerald-700', reserve: 'bg-amber-50 text-amber-700', rejected: 'bg-rose-50 text-rose-700' };

export const SelectionCandidateCard = ({ row, selected, bulkSelected, onSelect, onToggleBulk }: SelectionCandidateCardProps) => {
  const decision = row.record?.decision ?? 'recommended';
  return (
    <div className={`rounded-2xl border p-3 transition ${selected ? 'border-cyan-400 bg-cyan-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
      <div className="flex items-start gap-2">
        <label className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl bg-slate-50" title={`Select ${row.candidate.name} for bulk action`}>
          <span className="sr-only">Bulk select {row.candidate.name}</span>
          <input type="checkbox" checked={bulkSelected} onChange={() => onToggleBulk(row.candidate.id)} className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-400" aria-label={`Bulk select ${row.candidate.name}`} />
        </label>
        <button type="button" onClick={() => onSelect(row.candidate.id)} className="min-w-0 flex-1 text-left" aria-pressed={selected}>
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-xs font-black text-white">{row.candidate.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5"><h3 className="truncate text-sm font-black text-slate-900">{row.candidate.name}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${decisionClass[decision]}`}>{decisionLabel[decision]}</span></div>
              <p className="mt-1 text-[10px] text-slate-500">{row.candidate.reference} · {row.candidate.location} · {row.candidate.experienceYears} yrs</p>
            </div>
            <div className="text-right"><p className="text-lg font-black text-slate-900">{row.interviewScore ?? row.candidate.fitScore}%</p><p className="text-[9px] font-bold text-slate-400">fit / interview</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold">
            <span className={`rounded-xl px-2.5 py-2 ${row.experienceMeets ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{row.experienceMeets ? '✓ Experience meets' : 'Needs experience'}</span>
            <span className={`rounded-xl px-2.5 py-2 ${row.skillMatchPercent >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{row.skillMatchPercent}% skills matched</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(row.candidate.tags ?? []).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">{tag}</span>)}
            {!row.documentsReady && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700"><Icon name="file" size={10}/> Documents</span>}
            {row.evidenceFlags.length === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700"><Icon name="check" size={10}/> Ready evidence</span>}
          </div>
        </button>
      </div>
    </div>
  );
};
