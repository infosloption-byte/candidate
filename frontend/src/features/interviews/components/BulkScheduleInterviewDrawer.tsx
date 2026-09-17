import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { Icon } from '../../../shared/components/Icon';
import { BulkScheduleEditPanel } from './BulkScheduleEditPanel';
import { BulkScheduleWorkloadPanel } from './BulkScheduleWorkloadPanel';
import type { Candidate } from '../../candidates/types/candidate';
import type { BulkInterviewScheduleConfig, BulkInterviewScheduleEdit, BulkInterviewSchedulePlan, BulkInterviewScheduleSlot, Interviewer, InterviewType } from '../types/interview';

interface BulkScheduleInterviewDrawerProps {
  open: boolean;
  candidates: Candidate[];
  interviewers: Interviewer[];
  pageCandidates: Candidate[];
  filteredCount: number;
  page: number;
  pageCount: number;
  selectedIds: string[];
  allFilteredSelected: boolean;
  query: string;
  config: BulkInterviewScheduleConfig;
  plan: BulkInterviewSchedulePlan | null;
  error: string | null;
  editingSlot: BulkInterviewScheduleSlot | null;
  editDraft: BulkInterviewScheduleEdit | null;
  editError: string | null;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onPageChange: (value: number) => void;
  onToggleCandidate: (candidateId: string) => void;
  onToggleAllFiltered: () => void;
  onConfigField: <K extends keyof BulkInterviewScheduleConfig>(field: K, value: BulkInterviewScheduleConfig[K]) => void;
  onToggleInterviewer: (interviewerId: string) => void;
  onGenerate: () => void;
  onRebalance: () => void;
  onApply: () => void;
  onReset: () => void;
  onStartEdit: (candidateId: string) => void;
  onEditField: <K extends keyof BulkInterviewScheduleEdit>(field: K, value: BulkInterviewScheduleEdit[K]) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

const types: InterviewType[] = ['Screening', 'Technical', 'Practical', 'Client', 'Final'];
const firstIndex = (page: number, size: number): number => (page - 1) * size + 1;

export const BulkScheduleInterviewDrawer = ({ open, candidates, interviewers, pageCandidates, filteredCount, page, pageCount, selectedIds, allFilteredSelected, query, config, plan, error, editingSlot, editDraft, editError, onClose, onQueryChange, onPageChange, onToggleCandidate, onToggleAllFiltered, onConfigField, onToggleInterviewer, onGenerate, onRebalance, onApply, onReset, onStartEdit, onEditField, onSaveEdit, onCancelEdit }: BulkScheduleInterviewDrawerProps) => {
  const drawerRef = useFocusTrap({ enabled: open, onEscape: onClose });
  if (!open) return null;
  const selectedSet = new Set(selectedIds);
  const activeInterviewers = interviewers.filter((person) => person.active);
  const scheduledCount = plan?.slots.length ?? 0;
  const unscheduledCount = plan?.unscheduled.length ?? 0;
  const estimatedDays = config.startDate && config.endDate ? Math.max(1, Math.round((new Date(`${config.endDate}T12:00:00`).getTime() - new Date(`${config.startDate}T12:00:00`).getTime()) / 86400000) + 1) : 0;
  const selectableCount = candidates.length;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="bulk-schedule-title">
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" aria-label="Close bulk schedule" onClick={onClose}/>
      <aside ref={drawerRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-7xl flex-col bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Batch interview planner</p><h2 id="bulk-schedule-title" className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Schedule many candidates at once</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Select a large candidate group, balance workload across interviewers, edit individual planned slots, preview capacity, then commit the batch.</p></div>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><Icon name="x" size={18}/></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1.5 text-[9px] font-black text-slate-600">{selectedIds.length} selected</span><span className="rounded-full bg-cyan-50 px-2.5 py-1.5 text-[9px] font-black text-cyan-700">{selectableCount} eligible</span>{plan && <><span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-[9px] font-black text-emerald-700">{scheduledCount} planned</span><span className="rounded-full bg-amber-50 px-2.5 py-1.5 text-[9px] font-black text-amber-700">{unscheduledCount} unscheduled</span></>}</div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(330px,0.8fr)_minmax(520px,1.2fr)]">
          <section className="min-h-0 border-b border-slate-200 bg-white lg:border-b-0 lg:border-r" aria-label="Candidate selection">
            <div className="border-b border-slate-200 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-black text-slate-900">Candidate pool</h3><p className="mt-1 text-[10px] text-slate-500">Showing {filteredCount === 0 ? 0 : firstIndex(page, 40)}–{Math.min(page * 40, filteredCount)} of {filteredCount} filtered candidates.</p></div><span className="text-[10px] font-bold text-slate-400">Selection survives page changes</span></div><label className="relative mt-3 block"><span className="sr-only">Search candidates</span><Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search name, reference, trade or skill…" className="field-input bg-slate-50 pl-9"/></label><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={onToggleAllFiltered} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50"><span className={`grid size-4 place-items-center rounded border text-[9px] ${allFilteredSelected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>{allFilteredSelected ? 'Clear filtered' : `Select all ${filteredCount}`}</button><span className="text-[10px] font-semibold text-slate-400">Page {page} / {pageCount}</span></div></div>
            <div className="scrollbar-thin min-h-0 max-h-[38dvh] overflow-y-auto p-3 sm:p-4 lg:h-full lg:max-h-none"><div className="space-y-2">{pageCandidates.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center"><Icon name="users" size={22} className="mx-auto text-slate-300"/><p className="mt-2 text-xs font-bold text-slate-500">No eligible candidates match this search.</p></div> : pageCandidates.map((candidate) => { const selected = selectedSet.has(candidate.id); return <button key={candidate.id} type="button" onClick={() => onToggleCandidate(candidate.id)} aria-pressed={selected} className={`w-full rounded-2xl border p-3 text-left transition ${selected ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-center gap-3"><span className={`grid size-6 shrink-0 place-items-center rounded-lg border text-[10px] font-black ${selected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black text-slate-900">{candidate.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{candidate.reference} · {candidate.profession} · {candidate.experienceYears} yrs</span></span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{candidate.fitScore}%</span></div></button>; })}</div></div>
            <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 disabled:opacity-40">Previous</button><button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 disabled:opacity-40">Next</button></footer>
          </section>

          <section className="scrollbar-thin min-h-0 overflow-y-auto p-4 sm:p-5" aria-label="Schedule configuration">
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Schedule rules</h3><p className="mt-1 text-[10px] text-slate-500">The planner balances total interviewer workload, then prefers earlier slots.</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{estimatedDays} day window</span></div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{types.map((type) => <button key={type} type="button" aria-pressed={config.type === type} onClick={() => onConfigField('type', type)} className={`rounded-xl border px-2 py-2.5 text-[10px] font-black ${config.type === type ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-500'}`}>{type}</button>)}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="field-label">Start date</span><input type="date" value={config.startDate} onChange={(event) => onConfigField('startDate', event.target.value)} className="field-input"/></label><label><span className="field-label">End date</span><input type="date" value={config.endDate} onChange={(event) => onConfigField('endDate', event.target.value)} className="field-input"/></label><label><span className="field-label">Day starts</span><input type="time" value={config.dayStart} onChange={(event) => onConfigField('dayStart', event.target.value)} className="field-input"/></label><label><span className="field-label">Day ends</span><input type="time" value={config.dayEnd} onChange={(event) => onConfigField('dayEnd', event.target.value)} className="field-input"/></label><label><span className="field-label">Interview duration</span><select value={config.durationMinutes} onChange={(event) => onConfigField('durationMinutes', Number(event.target.value))} className="field-input"><option value="20">20 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select></label><label><span className="field-label">Break between candidates</span><select value={config.breakMinutes} onChange={(event) => onConfigField('breakMinutes', Number(event.target.value))} className="field-input"><option value="0">0 min</option><option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option></select></label></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5"><input type="checkbox" checked={config.includeWeekends} onChange={(event) => onConfigField('includeWeekends', event.target.checked)} className="mt-0.5 size-4 rounded border-slate-300"/><span className="text-[10px] font-bold text-slate-600">Include weekends</span></label><label className="flex items-start gap-2 rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2.5"><input type="checkbox" checked={config.sharedLocation} onChange={(event) => onConfigField('sharedLocation', event.target.checked)} className="mt-0.5 size-4 rounded border-slate-300"/><span><span className="block text-[10px] font-black text-cyan-900">One shared room</span><span className="mt-0.5 block text-[9px] leading-4 text-cyan-800/70">Off allows parallel workstations at the same centre.</span></span></label></div>
                <label className="mt-3 block"><span className="field-label">Interview location / centre</span><input value={config.location} onChange={(event) => onConfigField('location', event.target.value)} className="field-input" placeholder="Interview Centre"/></label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-end justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Interviewer pool</h3><p className="mt-1 text-[10px] text-slate-500">Matching trades stay preferred; workload balancing chooses the lighter available interviewer.</p></div><span className="text-[10px] font-black text-slate-400">{config.interviewerIds.length} selected</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{activeInterviewers.map((person) => { const selected = config.interviewerIds.includes(person.id); return <button key={person.id} type="button" onClick={() => onToggleInterviewer(person.id)} aria-pressed={selected} className={`rounded-2xl border p-3 text-left ${selected ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><div className="flex items-start gap-2"><span className={`mt-0.5 grid size-5 place-items-center rounded-full border text-[9px] font-black ${selected ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span><span className="min-w-0"><span className="block text-xs font-black text-slate-800">{person.name}</span><span className="mt-0.5 block text-[10px] text-slate-500">{person.role}</span><span className="mt-1 block truncate text-[9px] text-slate-400">{person.specialties.join(' · ')}</span></span></div></button>; })}</div></section>

              {plan && <>
                <BulkScheduleWorkloadPanel loads={plan.interviewerLoads}/>
                <BulkScheduleEditPanel slot={editingSlot} draft={editDraft} interviewers={interviewers} error={editError} onFieldChange={onEditField} onSave={onSaveEdit} onCancel={onCancelEdit}/>
                <section className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-white p-3"><p className="text-[9px] font-black uppercase text-slate-400">Requested</p><p className="mt-1 text-lg font-black text-slate-900">{plan.requested}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[9px] font-black uppercase text-slate-400">Capacity</p><p className="mt-1 text-lg font-black text-slate-900">{plan.capacity}</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-[9px] font-black uppercase text-emerald-600">Planned</p><p className="mt-1 text-lg font-black text-emerald-800">{scheduledCount}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] font-black uppercase text-amber-600">Overflow</p><p className="mt-1 text-lg font-black text-amber-800">{unscheduledCount}</p></div></div>
                  <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={onRebalance} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-[10px] font-black text-cyan-700 hover:bg-cyan-100"><Icon name="sparkles" size={12}/>Rebalance workload</button><button type="button" onClick={onGenerate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50"><Icon name="refresh" size={12}/>Regenerate</button></div>
                  {plan.slots.length > 0 && <div className="mt-3 max-h-72 overflow-y-auto rounded-xl bg-white p-2">{plan.slots.slice(0, 120).map((slot) => <div key={`${slot.candidateId}-${slot.isoDate}-${slot.time}`} className={`flex items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-0 ${editingSlot?.candidateId === slot.candidateId ? 'bg-cyan-50' : ''}`}><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black text-slate-700">{slot.candidateName}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">{slot.profession} · {slot.date} · {slot.time} · {slot.interviewer.name}</p></div><button type="button" onClick={() => onStartEdit(slot.candidateId)} className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] font-black text-slate-600 hover:bg-slate-50" aria-label={`Edit schedule for ${slot.candidateName}`}>Edit</button></div>)}{plan.slots.length > 120 && <p className="px-2 py-2 text-center text-[9px] font-bold text-slate-400">Previewing first 120 of {plan.slots.length} planned interviews.</p>}</div>}
                  {unscheduledCount > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-semibold leading-5 text-amber-800">{unscheduledCount} candidate{unscheduledCount === 1 ? '' : 's'} remain unscheduled. Extend the window, add interviewers, reduce duration/break, or edit planned slots before committing.</div>}
                </section>
              </>}

              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
            </div>
          </section>
        </div>

        <footer className="safe-bottom flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"><button type="button" onClick={onReset} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Reset</button><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" disabled={!plan || plan.slots.length === 0} onClick={onApply} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Schedule {scheduledCount} interviews<Icon name="check" size={15}/></button></div></footer>
      </aside>
    </div>
  );
};
