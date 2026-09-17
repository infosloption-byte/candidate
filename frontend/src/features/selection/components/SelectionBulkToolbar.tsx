import { Icon } from '../../../shared/components/Icon';
import type { SelectionJob } from '../types/selection';

interface SelectionBulkToolbarProps {
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  reason: string;
  note: string;
  targetJobId: string;
  jobs: SelectionJob[];
  currentJobId: string;
  error: string | null;
  onToggleAll: () => void;
  onClear: () => void;
  onReasonChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onTargetJobChange: (value: string) => void;
  onSelect: () => void;
  onReserve: () => void;
  onReject: () => void;
  onReassign: () => void;
}

export const SelectionBulkToolbar = ({ selectedCount, visibleCount, allVisibleSelected, reason, note, targetJobId, jobs, currentJobId, error, onToggleAll, onClear, onReasonChange, onNoteChange, onTargetJobChange, onSelect, onReserve, onReject, onReassign }: SelectionBulkToolbarProps) => (
  <section className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6" aria-label="Bulk selection actions">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onToggleAll} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 hover:border-slate-300">
          <input type="checkbox" checked={allVisibleSelected} onChange={onToggleAll} onClick={(event) => event.stopPropagation()} aria-label="Select all visible candidates" className="size-4 rounded border-slate-300" />
          {allVisibleSelected ? 'Clear visible' : 'Select visible'}
        </button>
        <span className="rounded-xl bg-white px-3 py-2 text-[10px] font-black text-slate-500">{selectedCount} selected · {visibleCount} visible</span>
        {selectedCount > 0 && <button type="button" onClick={onClear} className="rounded-xl px-3 py-2 text-[10px] font-black text-slate-500 hover:bg-white hover:text-slate-800">Clear selection</button>}
      </div>

      {selectedCount > 0 && (
        <div className="grid gap-2 xl:min-w-[700px] xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_auto]">
          <label className="min-w-0">
            <span className="sr-only">Bulk decision reason</span>
            <input value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Reason for bulk action" className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-cyan-400" />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Bulk decision note</span>
            <input value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Written note for audit trail" className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-cyan-400" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onSelect} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-700"><Icon name="check" size={12}/>Select</button>
            <button type="button" onClick={onReserve} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[10px] font-black text-white hover:bg-amber-600"><Icon name="clock" size={12}/>Reserve</button>
            <button type="button" onClick={onReject} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white hover:bg-rose-700"><Icon name="x" size={12}/>Reject</button>
          </div>
        </div>
      )}
    </div>

    {selectedCount > 0 && (
      <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 px-2"><Icon name="briefcase" size={13}/><span className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Reassign selected</span></div>
        <select value={targetJobId} onChange={(event) => onTargetJobChange(event.target.value)} aria-label="Reassign candidates to job" className="min-h-10 min-w-0 flex-1 rounded-xl border border-cyan-100 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-cyan-400">
          <option value="">Choose target job</option>
          {jobs.filter((job) => job.id !== currentJobId).map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select>
        <button type="button" onClick={onReassign} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-[10px] font-black text-cyan-700 hover:bg-cyan-100"><Icon name="arrow-right" size={12}/>Reassign</button>
      </div>
    )}

    {error && <p role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">{error}</p>}
  </section>
);
