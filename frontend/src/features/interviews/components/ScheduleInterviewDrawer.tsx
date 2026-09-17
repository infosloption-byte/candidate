import { useEffect, useRef } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { useInterviewForm } from '../hooks/useInterviewForm';
import type { Candidate } from '../../candidates/types/candidate';
import type { Interview, InterviewType, Interviewer } from '../types/interview';

interface ScheduleInterviewDrawerProps {
  open: boolean;
  candidates: Candidate[];
  interviewers: Interviewer[];
  onClose: () => void;
  onCreate: (interview: Interview) => void;
}

const types: InterviewType[] = ['Screening', 'Technical', 'Practical', 'Client', 'Final'];

export const ScheduleInterviewDrawer = ({ open, candidates, interviewers, onClose, onCreate }: ScheduleInterviewDrawerProps) => {
  const form = useInterviewForm({ candidates, interviewers, onCreate, onClose });
  const drawerRef = useFocusTrap({ enabled: open, onEscape: onClose });
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    form.reset();
  }, [open, form.reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="schedule-interview-title">
      <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Close schedule interview form" onClick={onClose}/>
      <aside ref={drawerRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl sm:rounded-l-3xl">
        <header className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">New interview</p>
              <h2 id="schedule-interview-title" className="mt-1 text-xl font-black tracking-tight text-slate-950">Schedule an interview</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Set the appointment once. The scorecard and practical test will be prepared automatically from the trade.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><Icon name="x" size={18}/></button>
          </div>
        </header>

        <form id="schedule-interview-form" onSubmit={(event) => { event.preventDefault(); form.submit(); }} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {form.error && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"><Icon name="alert" size={15}/>{form.error}</div>}

          <section aria-labelledby="schedule-candidate-title">
            <h3 id="schedule-candidate-title" className="text-sm font-black text-slate-900">Candidate</h3>
            <label className="mt-3 block"><span className="field-label">Select candidate <span className="text-rose-500">*</span></span><select autoFocus value={form.draft.candidateId} onChange={(event) => form.updateField('candidateId', event.target.value)} className="field-input"><option value="">Choose a candidate…</option>{candidates.filter((candidate) => candidate.status !== 'rejected').map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.profession} · {candidate.reference}</option>)}</select></label>
            {form.selectedCandidate && <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-cyan-950">{form.selectedCandidate.name}</p><p className="mt-1 text-[11px] text-cyan-800/75">{form.selectedCandidate.profession} · {form.selectedCandidate.experienceYears} years · {form.selectedCandidate.location}</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-cyan-700">{form.selectedCandidate.fitScore ? `${form.selectedCandidate.fitScore}% fit` : 'Fit not assessed'}</span></div></div>}
          </section>

          <section className="mt-6" aria-labelledby="schedule-type-title">
            <h3 id="schedule-type-title" className="text-sm font-black text-slate-900">Interview type</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{types.map((type) => <button key={type} type="button" aria-pressed={form.draft.type === type} onClick={() => form.updateField('type', type)} className={`rounded-xl border px-2 py-3 text-[10px] font-bold sm:text-xs ${form.draft.type === type ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{type}</button>)}</div>
          </section>

          <section className="mt-6" aria-labelledby="schedule-time-title">
            <h3 id="schedule-time-title" className="text-sm font-black text-slate-900">When and where</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-3"><label><span className="field-label">Date</span><input type="date" value={form.draft.date} onChange={(event) => form.updateField('date', event.target.value)} className="field-input"/></label><label><span className="field-label">Start time</span><input type="time" value={form.draft.time} onChange={(event) => form.updateField('time', event.target.value)} className="field-input"/></label><label><span className="field-label">Duration</span><select value={form.draft.durationMinutes} onChange={(event) => form.updateField('durationMinutes', event.target.value)} className="field-input"><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label></div>
            <label className="mt-4 block"><span className="field-label">Location</span><input value={form.draft.location} onChange={(event) => form.updateField('location', event.target.value)} className="field-input" placeholder="Interview room, practical yard, or online link"/></label>
          </section>

          <section className="mt-6" aria-labelledby="schedule-interviewer-title">
            <div className="flex items-end justify-between gap-3"><div><h3 id="schedule-interviewer-title" className="text-sm font-black text-slate-900">Interviewers</h3><p className="mt-1 text-[11px] text-slate-500">Assign one or more people. Their specialties are shown to help with the choice.</p></div><span className="text-[10px] font-bold text-slate-400">{form.draft.interviewerIds.length} selected</span></div>
            <div className="mt-3 space-y-2">{interviewers.filter((person) => person.active).map((person) => { const selected = form.draft.interviewerIds.includes(person.id); return <button key={person.id} type="button" aria-pressed={selected} onClick={() => form.toggleInterviewer(person.id)} className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left ${selected ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-black ${selected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-800">{person.name}</span><span className="mt-0.5 block text-[10px] text-slate-500">{person.role}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{person.specialties.join(' · ')}</span></span></button>; })}</div>
          </section>
        </form>

        <footer className="safe-bottom flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" form="schedule-interview-form" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800">Schedule interview<Icon name="check" size={15}/></button></footer>
      </aside>
    </div>
  );
};
