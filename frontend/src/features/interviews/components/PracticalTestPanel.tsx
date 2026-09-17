import { Icon } from '../../../shared/components/Icon';
import type { Interview, PracticalResult } from '../types/interview';

interface PracticalTestPanelProps {
  interview: Interview;
  editable: boolean;
  onResult: (itemId: string, result: PracticalResult) => void;
  onNote: (itemId: string, note: string) => void;
}

const resultOptions: Array<{ value: Exclude<PracticalResult, 'not-started'>; label: string; className: string }> = [
  { value: 'passed', label: 'Pass', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'failed', label: 'Fail', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  { value: 'pending', label: 'Pending', className: 'border-amber-200 bg-amber-50 text-amber-700' },
];

export const PracticalTestPanel = ({ interview, editable, onResult, onNote }: PracticalTestPanelProps) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="practical-test-title">
    <div className="flex items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon name="briefcase" size={16}/></div><div><h2 id="practical-test-title" className="text-sm font-black text-slate-900">Practical test</h2><p className="mt-0.5 text-[11px] text-slate-500">Record what the candidate demonstrated on each task.</p></div></div></div>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">{interview.practicalTest.length === 0 ? 'Not required for this stage' : 'Required tasks must be decided'}</span>
    </div>

    {interview.practicalTest.length === 0 ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No practical assessment is required for a {interview.type.toLowerCase()} interview.</div> : <>
      {!editable && <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500">Practical-test editing opens when the interview is in progress or evaluation mode.</div>}
      <div className="mt-5 space-y-3">
        {interview.practicalTest.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-2.5"><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${item.result === 'passed' ? 'bg-emerald-100 text-emerald-700' : item.result === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-400'}`}><Icon name={item.result === 'passed' ? 'check' : item.result === 'failed' ? 'x' : 'briefcase'} size={13}/></span><div className="min-w-0"><h3 className="text-xs font-black text-slate-800">{item.label}</h3><p className="mt-1 text-[10px] text-slate-400">{item.required ? 'Required' : 'Optional'} · {item.result === 'not-started' ? 'Not started' : item.result === 'pending' ? 'Pending' : item.result === 'passed' ? 'Passed' : 'Failed'}</p></div></div>
              <div className="flex flex-wrap gap-1.5">{resultOptions.map((option) => <button key={option.value} type="button" aria-pressed={item.result === option.value} disabled={!editable} onClick={() => onResult(item.id, option.value)} className={`rounded-xl border px-3 py-2 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${item.result === option.value ? option.className : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{option.label}</button>)}</div>
            </div>
            <label className="mt-3 block"><span className="field-label">Observation <span className="font-normal text-slate-400">(recommended)</span></span><input value={item.note} disabled={!editable} onChange={(event) => onNote(item.id, event.target.value)} className="field-input bg-white disabled:cursor-not-allowed disabled:opacity-60" placeholder="e.g. Clean alignment, safe tool handling, slow execution…"/></label>
          </article>
        ))}
      </div>
    </>}
  </section>
);
