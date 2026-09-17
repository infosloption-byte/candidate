import type { FormEvent } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { useRejectionForm } from '../hooks/useRejectionForm';
import type { RejectionReason } from '../types/candidate';

interface RejectCandidateDialogProps { open: boolean; candidateName: string; onClose: () => void; onReject: (reason: RejectionReason, note: string) => void; }

export const RejectCandidateDialog = ({ open, candidateName, onClose, onReject }: RejectCandidateDialogProps) => {
  const form = useRejectionForm(onReject);
  const dialogRef = useFocusTrap({ enabled: open, onEscape: () => { form.close(); onClose(); } });
  if (!open) return null;

  const submit = (event: FormEvent) => { event.preventDefault(); form.submit(); };
  const close = () => { form.close(); onClose(); };

  return <div className="fixed inset-0 z-[60] grid place-items-end bg-slate-950/45 p-3 sm:place-items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="reject-title">
    <form ref={dialogRef} tabIndex={-1} onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-600">Decision</p><h2 id="reject-title" className="mt-1 text-lg font-black text-slate-950">Reject {candidateName}?</h2><p className="mt-1 text-xs leading-5 text-slate-500">The reason and note stay attached to the candidate timeline.</p></div><button type="button" onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"><Icon name="x" size={17}/></button></header>
      <div className="space-y-4 px-5 py-5">
        {form.error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"><Icon name="alert" size={15}/>{form.error}</div>}
        <label><span className="field-label">Primary reason</span><select value={form.reason} onChange={(event) => form.setReason(event.target.value as RejectionReason)} className="field-input">{form.reasons.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="field-label">Decision note <span className="text-rose-500">*</span></span><textarea rows={4} required value={form.note} onChange={(event) => { form.setNote(event.target.value); }} className="field-input resize-none" placeholder="Explain what was observed and why the candidate did not meet the requirement." /></label>
        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">Good notes describe the observed gap, not only “failed”.</div>
      </div>
      <footer className="safe-bottom flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700">Record rejection</button></footer>
    </form>
  </div>;
};
