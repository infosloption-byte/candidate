import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { Icon } from '../../../shared/components/Icon';
import type { Interview, InterviewRescheduleAlternative, InterviewRescheduleDraft, Interviewer } from '../types/interview';

interface RescheduleInterviewDialogProps {
  open: boolean;
  interview: Interview | null;
  interviewers: Interviewer[];
  draft: InterviewRescheduleDraft | null;
  error: string | null;
  alternatives: InterviewRescheduleAlternative[];
  onClose: () => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onToggleInterviewer: (interviewerId: string) => void;
  onReasonChange: (value: string) => void;
  onUseAlternative: (alternative: InterviewRescheduleAlternative) => void;
  onSave: () => void;
}

export const RescheduleInterviewDialog = ({ open, interview, interviewers, draft, error, alternatives, onClose, onDateChange, onTimeChange, onToggleInterviewer, onReasonChange, onUseAlternative, onSave }: RescheduleInterviewDialogProps) => {
  const dialogRef = useFocusTrap({ enabled: open, onEscape: onClose });
  if (!open || !interview || !draft) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="reschedule-interview-title">
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" aria-label="Close reschedule interview dialog" onClick={onClose}/>
      <aside ref={dialogRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-l-3xl">
        <header className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">Change appointment</p><h2 id="reschedule-interview-title" className="mt-1 text-xl font-black tracking-tight text-slate-950">Reschedule interview</h2><p className="mt-1 text-xs leading-5 text-slate-500">Move {interview.candidateName} without silently creating an interviewer or room conflict.</p></div><button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><Icon name="x" size={18}/></button></div>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"><Icon name="alert" size={15}/><span>{error}</span></div>}
          <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="reschedule-current-title"><h3 id="reschedule-current-title" className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current appointment</h3><p className="mt-2 text-sm font-black text-slate-900">{interview.date} at {interview.time}</p><p className="mt-1 text-[11px] text-slate-500">{interview.interviewers.map((person) => person.name).join(', ') || 'No interviewer'} · {interview.location}</p></section>

          <section className="mt-5" aria-labelledby="reschedule-target-title"><div><h3 id="reschedule-target-title" className="text-sm font-black text-slate-900">New appointment</h3><p className="mt-1 text-[11px] text-slate-500">Drag-and-drop from the calendar changes date and time. This panel also lets you change the interviewer panel.</p></div><div className="mt-3 grid gap-4 sm:grid-cols-2"><label><span className="field-label">Date</span><input type="date" value={draft.date} onChange={(event) => onDateChange(event.target.value)} className="field-input"/></label><label><span className="field-label">Start time</span><input type="time" value={draft.time} onChange={(event) => onTimeChange(event.target.value)} className="field-input"/></label></div></section>

          <fieldset className="mt-5"><legend className="text-sm font-black text-slate-900">Interviewers</legend><p className="mt-1 text-[11px] text-slate-500">Choose the full panel. Inactive interviewers cannot be selected.</p><div className="mt-3 space-y-2">{interviewers.map((person) => { const selected = draft.interviewerIds.includes(person.id); return <label key={person.id} className={`flex items-start gap-3 rounded-2xl border p-3 ${selected ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white'} ${person.active ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'}`}><input type="checkbox" checked={selected} disabled={!person.active} onChange={() => onToggleInterviewer(person.id)} className="mt-1 size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-300"/><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-800">{person.name}</span><span className="mt-0.5 block text-[10px] text-slate-500">{person.role}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{person.specialties.join(' · ')}</span></span>{!person.active && <span className="text-[9px] font-bold text-slate-400">Inactive</span>}</label>; })}</div></fieldset>

          <label className="mt-5 block"><span className="field-label">Reason <span className="text-slate-400">(optional)</span></span><textarea rows={3} value={draft.reason} onChange={(event) => onReasonChange(event.target.value)} className="field-input min-h-20 resize-y" placeholder="Why was this appointment moved?"/></label>

          {alternatives.length > 0 && <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-labelledby="reschedule-alternatives-title"><div className="flex gap-2"><Icon name="alert" size={15} className="mt-0.5 text-amber-700"/><div><h3 id="reschedule-alternatives-title" className="text-xs font-black text-amber-900">Conflict-free alternatives</h3><p className="mt-1 text-[10px] leading-5 text-amber-800/80">Pick an available nearby slot and then save the reschedule.</p><div className="mt-3 grid gap-2">{alternatives.map((alternative) => <button key={`${alternative.date}-${alternative.time}-${alternative.interviewerIds.join('-')}`} type="button" onClick={() => onUseAlternative(alternative)} className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-left text-[10px] font-bold text-amber-900 hover:bg-amber-100">{alternative.label}</button>)}</div></div></div></section>}
        </div>

        <footer className="safe-bottom flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800">Save reschedule<Icon name="check" size={15}/></button></footer>
      </aside>
    </div>
  );
};
