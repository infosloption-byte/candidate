import { useRejectionForm, rejectionReasonOptions } from '../hooks/useRejectionForm';
import { Icon } from '../../../shared/components/Icon';

interface RejectCandidateDialogProps {
  open: boolean;
  candidateName: string;
  onClose: () => void;
  onReject: (reason: string, note: string) => void;
}

export const RejectCandidateDialog = ({ open, candidateName, onClose, onReject }: RejectCandidateDialogProps) => {
  const form = useRejectionForm(onReject);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
      <button type="button" aria-label="Close rejection dialog" onClick={onClose} className="absolute inset-0 bg-slate-950/45" />
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Icon name="shield" size={18} /></div><h2 id="reject-title" className="text-lg font-bold text-slate-950">Record rejection reason</h2><p className="mt-1 text-sm text-slate-500">This note stays on {candidateName}'s history so the decision is never lost.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><Icon name="x" /></button></div>
        <div className="mt-6 space-y-4"><label><span className="field-label">Reason</span><select value={form.reason} onChange={(event) => form.setReason(event.target.value)} className="field-input">{rejectionReasonOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label><span className="field-label">Interviewer's note</span><textarea value={form.note} onChange={(event) => form.setNote(event.target.value)} rows={4} className="field-input resize-none" placeholder="What specifically caused the decision?" /></label></div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Keep candidate</button><button type="button" onClick={form.submit} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Save rejection</button></div>
      </div>
    </div>
  );
};
