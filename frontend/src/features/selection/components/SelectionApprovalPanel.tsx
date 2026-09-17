import { Icon } from '../../../shared/components/Icon';
import { useSelectionApprovalForm } from '../hooks/useSelectionApprovalForm';
import type { ApprovalStatus, SelectionJob } from '../types/selection';

interface SelectionApprovalPanelProps {
  job: SelectionJob;
  selectedCount: number;
  reserveCount: number;
  approvalStatus: ApprovalStatus;
  approvalNote: string;
  approvalReady: boolean;
  onSetApproval: (status: ApprovalStatus, note: string) => void;
}

const statusLabel: Record<ApprovalStatus, string> = { draft: 'Draft', pending: 'Pending approval', approved: 'Approved', returned: 'Returned for review' };
const statusClass: Record<ApprovalStatus, string> = { draft: 'bg-slate-100 text-slate-600', pending: 'bg-amber-50 text-amber-700', approved: 'bg-emerald-50 text-emerald-700', returned: 'bg-rose-50 text-rose-700' };

export const SelectionApprovalPanel = ({ job, selectedCount, reserveCount, approvalStatus, approvalNote, approvalReady, onSetApproval }: SelectionApprovalPanelProps) => {
  const form = useSelectionApprovalForm({ status: approvalStatus, note: approvalNote, ready: approvalReady, onSubmit: onSetApproval });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="approval-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="flex items-center gap-2"><div className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon name="check" size={16}/></div><div><h2 id="approval-title" className="text-sm font-black text-slate-900">Management approval</h2><p className="mt-0.5 text-[10px] text-slate-500">Submit the selected shortlist for management review without hiding the decision evidence.</p></div></div></div>
        <span className={`rounded-full px-2.5 py-1.5 text-[9px] font-black ${statusClass[approvalStatus]}`}>{statusLabel[approvalStatus]}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Selected</p><p className="mt-1 text-lg font-black text-emerald-800">{selectedCount}/{job.openings}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Reserve</p><p className="mt-1 text-lg font-black text-amber-800">{reserveCount}</p></div></div>

      <label className="mt-4 block"><span className="field-label">Approval note</span><textarea value={form.approvalNote} onChange={(event) => form.setApprovalNote(event.target.value)} rows={3} className="field-input min-h-20 resize-y bg-white" placeholder="Message for management or approval context…"/></label>

      {!approvalReady && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] font-bold text-amber-800" role="status">Select at least one candidate and keep the selected count within the open positions before requesting approval.</p>}
      {form.error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] font-bold text-rose-700" role="alert">{form.error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {approvalStatus === 'draft' || approvalStatus === 'returned' ? <button type="button" onClick={form.submitForApproval} disabled={!approvalReady} className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Submit for approval</button> : null}
        {approvalStatus === 'pending' ? <><button type="button" onClick={form.approve} className="rounded-xl bg-emerald-600 px-3.5 py-2.5 text-[10px] font-black text-white hover:bg-emerald-700">Approve shortlist</button><button type="button" onClick={form.returnToRecruiter} className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[10px] font-black text-rose-700">Return for review</button></> : null}
        {approvalStatus === 'approved' ? <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[10px] font-black text-emerald-700"><Icon name="check" size={13}/> Shortlist approved</span> : null}
      </div>
    </section>
  );
};
