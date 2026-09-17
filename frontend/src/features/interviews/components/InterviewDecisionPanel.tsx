import type { Interview, Decision } from '../types/interview';
import { useInterviewDecisionForm } from '../hooks/useInterviewDecisionForm';
import { Icon } from '../../../shared/components/Icon';

interface InterviewDecisionPanelProps {
  interview: Interview;
  canComplete: boolean;
  validationMessage: string | null;
  onSubmit: (decision: Decision, reason: string, note: string) => void;
}

const decisionOptions: Array<{ value: Exclude<Decision, 'pending'>; label: string; description: string }> = [
  { value: 'selected', label: 'Select', description: 'Move the candidate to the selected shortlist.' },
  { value: 'reserve', label: 'Reserve', description: 'Keep the candidate available as a backup.' },
  { value: 'rejected', label: 'Reject', description: 'Record a documented rejection decision.' },
];

export const InterviewDecisionPanel = ({ interview, canComplete, validationMessage, onSubmit }: InterviewDecisionPanelProps) => {
  const form = useInterviewDecisionForm({ interview, canComplete, onSubmit });
  const currentDecision = interview.decision.decision !== 'pending' ? interview.decision.decision : form.decision;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="decision-title">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon name="check" size={16}/></div><div><h2 id="decision-title" className="text-sm font-black text-slate-900">Final decision</h2><p className="mt-0.5 text-[11px] text-slate-500">Finish the evidence first, then record the decision.</p></div></div></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{interview.decision.decision === 'pending' ? 'Pending' : interview.decision.decision}</span></div>

      {validationMessage && interview.decision.decision === 'pending' && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><Icon name="alert" size={15}/><span>{validationMessage}</span></div>}
      {form.error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700"><Icon name="alert" size={15}/><span>{form.error}</span></div>}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">{decisionOptions.map((option) => <button key={option.value} type="button" aria-pressed={currentDecision === option.value} disabled={interview.decision.decision !== 'pending'} onClick={() => form.changeDecision(option.value)} className={`rounded-2xl border p-3 text-left transition disabled:cursor-default ${currentDecision === option.value ? option.value === 'rejected' ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50 disabled:hover:bg-white'}`}><span className={`block text-xs font-black ${currentDecision === option.value ? option.value === 'rejected' ? 'text-rose-700' : 'text-emerald-700' : 'text-slate-800'}`}>{option.label}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{option.description}</span></button>)}</div>

      {interview.decision.decision === 'pending' && <form onSubmit={(event) => { event.preventDefault(); form.submit(); }} className="mt-4 space-y-4">
        <label><span className="field-label">Decision reason</span><select value={form.reason} onChange={(event) => form.setReason(event.target.value)} className="field-input" disabled={!canComplete}><option value="">Choose a reason…</option>{form.reasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label>
        <label><span className="field-label">Decision note {form.decision === 'rejected' ? <span className="text-rose-500">*</span> : <span className="font-normal text-slate-400">(recommended)</span>}</span><textarea rows={4} value={form.note} onChange={(event) => form.setNote(event.target.value)} className="field-input resize-none" placeholder={form.decision === 'rejected' ? 'Describe the observed gap and why the requirement was not met.' : 'Add context for the selection decision.'} disabled={!canComplete}/></label>
        <button type="submit" disabled={!canComplete} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">Record final decision</button>
      </form>}

      {interview.decision.decision !== 'pending' && <div className="mt-4 rounded-2xl bg-slate-50 p-4"><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</p><p className="mt-1 text-xs font-bold text-slate-800">{interview.decision.reason}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Decision note</p><p className="mt-1 text-xs leading-5 text-slate-600">{interview.decision.note || 'No note recorded.'}</p></div></div></div>}
    </section>
  );
};
