import { useEffect } from 'react';
import { useCandidateContext } from '../context/CandidateContext';
import { useCandidateForm } from '../hooks/useCandidateForm';
import type { Candidate, CandidateSource } from '../types/candidate';
import { Icon } from '../../../shared/components/Icon';

interface AddCandidateDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreate: (candidate: Candidate) => void;
}

export const AddCandidateDrawer = ({ open, onClose, onCreate }: AddCandidateDrawerProps) => {
  const { state } = useCandidateContext();
  const form = useCandidateForm(onCreate, onClose);

  useEffect(() => {
    if (!open) form.reset();
  }, [open]);

  if (!open) return null;

  const professions = Array.from(new Set(state.candidates.map((candidate) => candidate.profession))).sort();
  const sources: CandidateSource[] = ['Walk-in', 'Referral', 'Agency', 'Existing database'];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="add-candidate-title">
      <button type="button" aria-label="Close add candidate drawer" onClick={onClose} className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" />
      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6"><div><h2 id="add-candidate-title" className="text-lg font-bold text-slate-950">Add candidate</h2><p className="mt-1 text-xs text-slate-500">Capture the minimum information needed to start the workflow.</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Icon name="x" /></button></header>
        <form className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); form.submit(); }}>
          <div className="space-y-5">
            {form.error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{form.error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="field-label">Full name<span className="text-rose-500"> *</span></span><input value={form.draft.name} onChange={(event) => form.updateField('name', event.target.value)} className="field-input" placeholder="e.g. Kasun Perera" autoFocus /></label>
              <label><span className="field-label">Profession<span className="text-rose-500"> *</span></span><input list="candidate-professions" value={form.draft.profession} onChange={(event) => form.updateField('profession', event.target.value)} className="field-input" placeholder="Mason" /><datalist id="candidate-professions">{professions.map((profession) => <option key={profession} value={profession} />)}</datalist></label>
              <label><span className="field-label">Experience (years)<span className="text-rose-500"> *</span></span><input type="number" min="0" max="50" value={form.draft.experienceYears} onChange={(event) => form.updateField('experienceYears', event.target.value)} className="field-input" placeholder="5" /></label>
              <label><span className="field-label">Phone<span className="text-rose-500"> *</span></span><input value={form.draft.phone} onChange={(event) => form.updateField('phone', event.target.value)} className="field-input" placeholder="+94 77..." /></label>
              <label><span className="field-label">Location</span><input value={form.draft.location} onChange={(event) => form.updateField('location', event.target.value)} className="field-input" placeholder="Colombo" /></label>
              <label className="sm:col-span-2"><span className="field-label">Other skills</span><input value={form.draft.secondarySkills} onChange={(event) => form.updateField('secondarySkills', event.target.value)} className="field-input" placeholder="Tile, Putty, Plaster" /><span className="mt-1 block text-[11px] text-slate-400">Separate skills with commas.</span></label>
              <label className="sm:col-span-2"><span className="field-label">Source</span><select value={form.draft.source} onChange={(event) => form.setSource(event.target.value as CandidateSource)} className="field-input">{sources.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
            </div>
          </div>
        </form>
        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" form="candidate-add-form" onClick={form.submit} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Icon name="user-plus" size={16} /> Create candidate</button></footer>
      </aside>
    </div>
  );
};
