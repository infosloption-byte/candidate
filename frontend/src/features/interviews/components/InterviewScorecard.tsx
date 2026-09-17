import { Icon } from '../../../shared/components/Icon';
import type { Interview } from '../types/interview';
import { scoreLabel } from '../types/interview';

interface InterviewScorecardProps {
  interview: Interview;
  completedCriteria: number;
  totalCriteria: number;
  totalScore: number | null;
  editable: boolean;
  onScore: (criterionId: string, score: number | null) => void;
  onCriterionNote: (criterionId: string, note: string) => void;
}

const scoreValues = [1, 2, 3, 4, 5];

export const InterviewScorecard = ({ interview, completedCriteria, totalCriteria, totalScore, editable, onScore, onCriterionNote }: InterviewScorecardProps) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="scorecard-title">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Icon name="target" size={16}/></div><div><h2 id="scorecard-title" className="text-sm font-black text-slate-900">{interview.profession} scorecard</h2><p className="mt-0.5 text-[11px] text-slate-500">Rate each criterion from 1 to 5. Weights are already applied.</p></div></div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Progress</p><p className="mt-0.5 text-xs font-black text-slate-800">{completedCriteria}/{totalCriteria}</p></div><div className="h-8 w-px bg-slate-200"/><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Weighted score</p><p className="mt-0.5 text-xs font-black text-slate-800">{totalScore === null ? '—' : `${totalScore}%`}</p></div></div>
    </div>

    {!editable && <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500">Scorecard editing opens when the interview is in progress or evaluation mode.</div>}

    <div className="mt-5 space-y-4">
      {interview.scorecard.criteria.map((criterion) => (
        <article key={criterion.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-black text-slate-800">{criterion.label}</h3><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-400">{criterion.weight}% weight</span></div><p className="mt-1 text-[10px] text-slate-400">{criterion.score === null ? 'Not assessed' : scoreLabel(criterion.score)}</p></div>
            <div className="flex gap-1.5" role="radiogroup" aria-label={`${criterion.label} score`}>
              {scoreValues.map((value) => <button key={value} type="button" role="radio" aria-checked={criterion.score === value} aria-label={`${criterion.label}: ${value} out of 5`} disabled={!editable} onClick={() => onScore(criterion.id, value)} className={`grid size-9 place-items-center rounded-xl border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${criterion.score === value ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:text-cyan-700'}`}>{value}</button>)}
              <button type="button" aria-label={`Clear ${criterion.label} score`} disabled={!editable || criterion.score === null} onClick={() => onScore(criterion.id, null)} className="ml-1 grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-40"><Icon name="x" size={14}/></button>
            </div>
          </div>
          <label className="mt-3 block"><span className="field-label">Interviewer note <span className="font-normal text-slate-400">(optional)</span></span><input value={criterion.note} onChange={(event) => onCriterionNote(criterion.id, event.target.value)} disabled={!editable} className="field-input bg-white disabled:cursor-not-allowed disabled:opacity-60" placeholder="What did you observe?"/></label>
        </article>
      ))}
    </div>
  </section>
);
