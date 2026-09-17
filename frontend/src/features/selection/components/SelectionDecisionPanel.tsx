import { useSelectionDecisionForm } from '../hooks/useSelectionDecisionForm';
import type { SelectionCandidateRow } from '../hooks/useSelectionWorkspace';
import type { SelectionDecision, SelectionJob } from '../types/selection';
import { Icon } from '../../../shared/components/Icon';

interface SelectionDecisionPanelProps {
  row: SelectionCandidateRow | null;
  job: SelectionJob | null;
  selectedCount: number;
  onSubmit: (decision: SelectionDecision, reason: string, note: string) => void;
}

const decisionButtons: Array<{ value: SelectionDecision; label: string }> = [
  { value: 'selected', label: 'Select' },
  { value: 'reserve', label: 'Reserve' },
  { value: 'rejected', label: 'Reject' },
  { value: 'recommended', label: 'Keep recommended' },
];

export const SelectionDecisionPanel = ({ row, job, selectedCount, onSubmit }: SelectionDecisionPanelProps) => {
  const form = useSelectionDecisionForm({ job, selectedCount, currentDecision: row?.record?.decision ?? null, onSubmit });

  if (!row || !job) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="selection-decision-title">
      <div className="flex items-start gap-3"><div className="grid size-9 place-items-center rounded-xl bg-slate-900 text-white"><Icon name="target" size={16}/></div><div><h2 id="selection-decision-title" className="text-sm font-black text-slate-900">Decision for {row.candidate.name}</h2><p className="mt-0.5 text-[10px] text-slate-500">Record why this candidate is moving forward, staying as reserve, or being rejected for this requirement.</p></div></div>

      <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Selection decision">
        {decisionButtons.map((option) => <button key={option.value} type="button" role="radio" aria-checked={form.decision === option.value} onClick={() => form.changeDecision(option.value)} className={`rounded-xl border px-3 py-2.5 text-[10px] font-black ${form.decision === option.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{option.label}</button>)}
      </div>

      <label className="mt-4 block"><span className="field-label">Reason</span><select value={form.reason} onChange={(event) => form.setReason(event.target.value)} className="field-input bg-white"><option value="">Choose a reason…</option>{form.decisionReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label>
      <label className="mt-3 block"><span className="field-label">Decision note</span><textarea value={form.note} onChange={(event) => form.setNote(event.target.value)} rows={4} className="field-input min-h-24 resize-y bg-white" placeholder="Summarize the evidence behind this decision…"/></label>

      {form.error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-bold text-rose-700" role="alert">{form.error}</p>}
      <button type="button" onClick={form.submit} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-xs font-black text-white hover:bg-cyan-700"><Icon name="check" size={14}/> Save decision</button>
    </section>
  );
};
