import { Icon } from '../../../shared/components/Icon';
import type { BulkInterviewScheduleEdit, BulkInterviewScheduleSlot, Interviewer } from '../types/interview';

interface BulkScheduleEditPanelProps {
  slot: BulkInterviewScheduleSlot | null;
  draft: BulkInterviewScheduleEdit | null;
  interviewers: Interviewer[];
  error: string | null;
  onFieldChange: <K extends keyof BulkInterviewScheduleEdit>(field: K, value: BulkInterviewScheduleEdit[K]) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const BulkScheduleEditPanel = ({ slot, draft, interviewers, error, onFieldChange, onSave, onCancel }: BulkScheduleEditPanelProps) => {
  if (!slot || !draft) return null;
  return (
    <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm" aria-label={`Edit schedule for ${slot.candidateName}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Icon name="calendar" size={15} className="text-cyan-700"/><h3 className="truncate text-sm font-black text-slate-900">Edit planned interview</h3></div><p className="mt-1 text-[10px] text-slate-500">{slot.candidateName} · {slot.profession}</p></div><button type="button" onClick={onCancel} aria-label="Cancel schedule edit" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Icon name="x" size={15}/></button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label><span className="field-label">Date</span><input type="date" value={draft.isoDate} onChange={(event) => onFieldChange('isoDate', event.target.value)} className="field-input"/></label>
        <label><span className="field-label">Start time</span><input type="time" value={draft.time} onChange={(event) => onFieldChange('time', event.target.value)} className="field-input"/></label>
        <label><span className="field-label">Interviewer</span><select value={draft.interviewerId} onChange={(event) => onFieldChange('interviewerId', event.target.value)} className="field-input"><option value="">Choose interviewer</option>{interviewers.filter((person) => person.active).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold leading-4 text-rose-700">{error}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl px-3 py-2 text-[10px] font-black text-slate-500 hover:bg-slate-100">Cancel</button><button type="button" onClick={onSave} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black text-white hover:bg-slate-800"><Icon name="check" size={12}/>Save change</button></div>
    </section>
  );
};
