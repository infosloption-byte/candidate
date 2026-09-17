import { Icon } from '../../../shared/components/Icon';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { useInterviewForm } from '../hooks/useInterviewForm';
import type { Candidate } from '../../candidates/types/candidate';
import type { Interview, InterviewType, Interviewer } from '../types/interview';

interface ScheduleInterviewDrawerContentProps {
  candidates: Candidate[];
  interviews: Interview[];
  interviewers: Interviewer[];
  onClose: () => void;
  onCreate: (interview: Interview) => void;
}

const types: InterviewType[] = ['Screening', 'Technical', 'Practical', 'Client', 'Final'];

export const ScheduleInterviewDrawerContent = ({ candidates, interviews, interviewers, onClose, onCreate }: ScheduleInterviewDrawerContentProps) => {
  const form = useInterviewForm({ candidates, interviews, interviewers, onCreate, onClose });
  const drawerRef = useFocusTrap({ enabled: true, onEscape: onClose });
  const hasStarted = Boolean(form.draft.candidateId) || form.draft.interviewerIds.length > 0 || Boolean(form.error);
  const availableInterviewerCount = form.interviewerAvailability.filter((availability) => availability.status === 'available').length;
  const busyInterviewerCount = form.interviewerAvailability.filter((availability) => availability.status === 'busy').length;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="schedule-interview-title">
      <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Close schedule interview form" title="Close scheduling without saving" onClick={onClose}/>
      <aside ref={drawerRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl sm:rounded-l-3xl">
        <header className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">New interview</p>
              <h2 id="schedule-interview-title" className="mt-1 text-xl font-black tracking-tight text-slate-950">Schedule an interview</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Set the appointment once. Availability and conflict checks run before the schedule is created.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" title="Close scheduling" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><Icon name="x" size={18}/></button>
          </div>
        </header>

        <form id="schedule-interview-form" onSubmit={(event) => { event.preventDefault(); form.submit(); }} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" title="Complete all required scheduling fields. Availability updates as the date, time, and duration change.">
          {form.error && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"><Icon name="alert" size={15}/><span>{form.error}</span></div>}

          <section aria-labelledby="schedule-candidate-title">
            <h3 id="schedule-candidate-title" className="text-sm font-black text-slate-900">Candidate</h3>
            <label className="mt-3 block"><span className="field-label">Select candidate <span className="text-rose-500">*</span></span><select autoFocus required aria-required="true" title="Choose the candidate for this interview. Rejected candidates are excluded." value={form.draft.candidateId} onChange={(event) => form.updateField('candidateId', event.target.value)} className="field-input"><option value="">Choose a candidate…</option>{candidates.filter((candidate) => candidate.status !== 'rejected').map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.profession} · {candidate.reference}</option>)}</select></label>
            {form.selectedCandidate && <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4" title="Candidate details used for the scheduling and specialty checks"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-cyan-950">{form.selectedCandidate.name}</p><p className="mt-1 text-[11px] text-cyan-800/75">{form.selectedCandidate.profession} · {form.selectedCandidate.experienceYears} years · {form.selectedCandidate.location}</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-cyan-700">{form.selectedCandidate.fitScore ? `${form.selectedCandidate.fitScore}% fit` : 'Fit not assessed'}</span></div></div>}
          </section>

          <section className="mt-6" aria-labelledby="schedule-type-title">
            <h3 id="schedule-type-title" className="text-sm font-black text-slate-900">Interview type</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{types.map((type) => <button key={type} type="button" aria-pressed={form.draft.type === type} title={`Use ${type} interview workflow`} onClick={() => form.updateField('type', type)} className={`rounded-xl border px-2 py-3 text-[10px] font-bold sm:text-xs ${form.draft.type === type ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{type}</button>)}</div>
          </section>

          <section className="mt-6" aria-labelledby="schedule-time-title">
            <h3 id="schedule-time-title" className="text-sm font-black text-slate-900">When and where</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3"><label><span className="field-label">Date <span className="text-rose-500">*</span></span><input required aria-required="true" title="Choose the interview date. Interviewer availability is recalculated for this day." type="date" value={form.draft.date} onChange={(event) => form.updateField('date', event.target.value)} className="field-input"/></label><label><span className="field-label">Start time <span className="text-rose-500">*</span></span><input required aria-required="true" title="Choose when the interview starts. Busy interviewers are detected against this time." type="time" value={form.draft.time} onChange={(event) => form.updateField('time', event.target.value)} className="field-input"/></label><label><span className="field-label">Duration <span className="text-rose-500">*</span></span><select required aria-required="true" title="Choose the expected interview duration. A longer duration can make a previously free interviewer unavailable." value={form.draft.durationMinutes} onChange={(event) => form.updateField('durationMinutes', event.target.value)} className="field-input"><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label></div>
            <label className="mt-4 block"><span className="field-label">Location or meeting link <span className="text-rose-500">*</span></span><input required aria-required="true" title="Enter the interview room, practical yard, workstation, or online meeting link. Room conflicts are checked before creation." value={form.draft.location} onChange={(event) => form.updateField('location', event.target.value)} className="field-input" placeholder="Interview room, practical yard, workstation, or online link"/></label>
          </section>

          <section className="mt-6" aria-labelledby="schedule-interviewer-title">
            <div className="flex items-end justify-between gap-3"><div><h3 id="schedule-interviewer-title" className="text-sm font-black text-slate-900">Interviewers <span className="text-rose-500">*</span></h3><p className="mt-1 text-[11px] text-slate-500">Availability is shown for the exact date, start time, and duration above. Existing active appointments are counted for the day.</p></div><span className="text-[10px] font-bold text-slate-400" title="Number of active interviewers currently assigned to this appointment">{form.draft.interviewerIds.length} selected</span></div>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Interviewer availability summary" aria-live="polite">
              <span title="Interviewers with no overlapping active appointment for the requested slot" className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{availableInterviewerCount} available</span>
              <span title="Interviewers with an overlapping active appointment for the requested slot" className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700">{busyInterviewerCount} busy</span>
            </div>
            <div className="mt-3 space-y-2">{interviewers.filter((person) => person.active).map((person) => {
              const selected = form.draft.interviewerIds.includes(person.id);
              const availability = form.interviewerAvailability.find((item) => item.interviewerId === person.id);
              const isBusy = availability?.status === 'busy';
              return (
                <button key={person.id} type="button" aria-pressed={selected} title={isBusy ? `${person.name} is busy for ${availability?.requestedSlotLabel ?? 'the requested slot'}. Existing appointment: ${availability?.conflict?.candidateName ?? 'another candidate'} at ${availability?.conflict?.time ?? 'the selected time'}.` : `${selected ? 'Remove' : 'Assign'} ${person.name}. Available for ${availability?.requestedSlotLabel ?? 'the requested slot'}.`} onClick={() => form.toggleInterviewer(person.id)} className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left ${selected ? 'border-cyan-300 bg-cyan-50' : isBusy ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-black ${selected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-slate-800">{person.name}</span><span title={isBusy ? 'An active appointment overlaps the requested time.' : 'No active appointment overlaps the requested time.'} className={`rounded-full px-2 py-0.5 text-[9px] font-black ${isBusy ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{isBusy ? 'Busy' : 'Available'}</span></span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">{person.role}</span>
                    <span className="mt-1 block truncate text-[10px] text-slate-400">{person.specialties.join(' · ')}</span>
                    <span className={`mt-2 block text-[10px] font-semibold ${isBusy ? 'text-rose-700' : 'text-emerald-700'}`} title="Live availability for the exact requested date, start time, and duration">{isBusy ? `Busy ${availability?.conflict?.time ?? ''}–${availability?.conflict?.endTime ?? ''} · ${availability?.conflict?.candidateName ?? 'existing appointment'}` : `Available ${availability?.requestedSlotLabel ?? 'for the requested slot'}`}</span>
                    <span className="mt-1 block text-[10px] text-slate-400" title="Active appointments and booked minutes for this interviewer on the selected date">{availability?.dayAppointmentCount ?? 0} appointment{availability?.dayAppointmentCount === 1 ? '' : 's'} today · {availability?.bookedLabel ?? '0m'} booked</span>
                    {availability?.nextAppointment && <span className="mt-1 block text-[10px] text-slate-400" title="Next active appointment after the requested slot">Next: {availability.nextAppointment.time}–{availability.nextAppointment.endTime} · {availability.nextAppointment.candidateName}</span>}
                  </span>
                </button>
              );
            })}</div>
          </section>

          <section className="mt-6" aria-labelledby="schedule-check-title" title="Live validation combines candidate, interviewer, room, and specialty checks.">
            <div className="flex items-start justify-between gap-3"><div><h3 id="schedule-check-title" className="text-sm font-black text-slate-900">Scheduling check</h3><p className="mt-1 text-[11px] text-slate-500">The form checks candidate, interviewer, room and appointment overlaps before creation.</p></div><span title="Live validation status" className={`rounded-full px-2 py-1 text-[10px] font-black ${form.validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{form.validation.valid ? 'Ready' : hasStarted ? 'Review' : 'Waiting'}</span></div>
            {!hasStarted && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500">Select a candidate and interviewer to run the live conflict check.</p>}
            {hasStarted && !form.validation.valid && <div className="mt-3 space-y-2">{form.validation.reasons.map((reason) => <div key={reason} role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-semibold leading-5 text-rose-700"><Icon name="alert" size={14}/><span>{reason}</span></div>)}</div>}
            {hasStarted && form.validation.valid && <div className="mt-3 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] font-semibold leading-5 text-emerald-700"><Icon name="check" size={14}/><span>No candidate, interviewer, or room conflict was found for this slot.</span></div>}
            {hasStarted && form.validation.warnings.length > 0 && <div className="mt-2 space-y-2">{form.validation.warnings.map((warning) => <div key={warning} role="status" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-semibold leading-5 text-amber-800"><Icon name="alert" size={14}/><span>{warning}</span></div>)}</div>}
          </section>
        </form>

        <footer className="safe-bottom flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" onClick={onClose} title="Discard this scheduling form and return to Interviews" className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" form="schedule-interview-form" disabled={!form.validation.valid} title={form.validation.valid ? 'Create the interview with the selected details' : 'Complete the required fields and resolve scheduling conflicts before creating the interview'} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45">Schedule interview<Icon name="check" size={15}/></button></footer>
      </aside>
    </div>
  );
};
