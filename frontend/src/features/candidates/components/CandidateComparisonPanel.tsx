import { Icon } from '../../../shared/components/Icon';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { Candidate } from '../types/candidate';

interface CandidateComparisonPanelProps {
  candidates: Candidate[];
  onRemove: (candidateId: string) => void;
  onClear: () => void;
}

interface ComparisonRowProps {
  label: string;
  values: string[];
}

const ComparisonRow = ({ label, values }: ComparisonRowProps) => (
  <div className="grid min-w-[720px] grid-cols-[150px_repeat(4,minmax(140px,1fr))] border-b border-slate-100 last:border-b-0">
    <div className="sticky left-0 z-10 bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-4">{label}</div>
    {values.map((value, index) => <div key={`${label}-${index}`} className="px-3 py-3 text-xs font-semibold text-slate-700 sm:px-4">{value}</div>)}
    {Array.from({ length: Math.max(0, 4 - values.length) }).map((_, index) => <div key={`empty-${label}-${index}`} className="px-3 py-3 sm:px-4" />)}
  </div>
);

export const CandidateComparisonPanel = ({ candidates, onRemove, onClear }: CandidateComparisonPanelProps) => {
  if (candidates.length === 0) return null;

  const values = (selector: (candidate: Candidate) => string) => candidates.map(selector);
  const documents = (candidate: Candidate): string => Object.values(candidate.documents).every((status) => status === 'verified') ? 'Ready' : 'Needs attention';

  return (
    <section className="fixed inset-x-0 bottom-0 z-40 max-h-[72dvh] overflow-hidden border-t border-slate-200 bg-white/95 shadow-[0_-12px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl" aria-label="Candidate comparison">
      <div className="mx-auto flex max-h-[72dvh] max-w-[1500px] flex-col px-3 pb-3 pt-3 sm:px-5 sm:pb-4">
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="flex items-center gap-2"><Icon name="target" size={16} className="text-cyan-600"/><h2 className="text-sm font-black text-slate-900">Compare candidates</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{candidates.length}/4</span></div><p className="mt-0.5 text-[11px] text-slate-500">Use the same criteria to compare candidates side by side.</p></div>
          <button type="button" onClick={onClear} className="self-start rounded-xl px-3 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:self-auto">Clear comparison</button>
        </div>

        {candidates.length < 2 ? <div className="mt-3 shrink-0 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Select at least one more candidate to start the comparison.</div> : <div className="mt-3 min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white overscroll-contain">
          <div className="grid min-w-[720px] grid-cols-[150px_repeat(4,minmax(140px,1fr))] border-b border-slate-200 bg-slate-50">
            <div className="sticky left-0 z-10 bg-slate-50 px-3 py-3 sm:px-4"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidate</span></div>
            {candidates.map((candidate) => <div key={candidate.id} className="min-w-0 px-3 py-3 sm:px-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black text-slate-900">{candidate.name}</p><p className="truncate text-[10px] text-slate-500">{candidate.reference}</p></div><button type="button" onClick={() => onRemove(candidate.id)} aria-label={`Remove ${candidate.name} from comparison`} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><Icon name="x" size={14}/></button></div><div className="mt-2"><StatusBadge status={candidate.status} compact /></div></div>)}
            {Array.from({ length: Math.max(0, 4 - candidates.length) }).map((_, index) => <div key={`empty-header-${index}`} className="px-3 py-3 sm:px-4" />)}
          </div>
          <ComparisonRow label="Job fit" values={values((candidate) => candidate.fitScore ? `${candidate.fitScore}%` : 'Not assessed')} />
          <ComparisonRow label="Profession" values={values((candidate) => candidate.profession)} />
          <ComparisonRow label="Experience" values={values((candidate) => `${candidate.experienceYears} years`)} />
          <ComparisonRow label="Key skills" values={values((candidate) => candidate.secondarySkills.slice(0, 4).join(', ') || 'None recorded')} />
          <ComparisonRow label="Overseas" values={values((candidate) => candidate.overseasCountries.join(', ') || 'None')} />
          <ComparisonRow label="English" values={values((candidate) => candidate.englishLevel)} />
          <ComparisonRow label="Availability" values={values((candidate) => candidate.availability)} />
          <ComparisonRow label="Driving" values={values((candidate) => candidate.drivingLicense ? 'Yes' : 'No')} />
          <ComparisonRow label="Documents" values={values(documents)} />
          <ComparisonRow label="Last interview" values={values((candidate) => candidate.lastInterview ? `${candidate.lastInterview.score}% · ${candidate.lastInterview.result}` : 'Not interviewed')} />
        </div>}
      </div>
    </section>
  );
};
