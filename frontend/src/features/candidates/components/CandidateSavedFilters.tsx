import { useSavedFilterForm } from '../hooks/useSavedFilterForm';
import type { CandidateFilters, CandidateSavedFilter, CandidateSmartFilters } from '../types/candidate';
import { Icon } from '../../../shared/components/Icon';

interface CandidateSavedFiltersProps {
  filters: CandidateFilters;
  smartFilters: CandidateSmartFilters;
  savedFilters: CandidateSavedFilter[];
  activeSavedFilterId: string | null;
  onSave: (name: string) => void;
  onApply: (filter: CandidateSavedFilter) => void;
  onDelete: (filterId: string) => void;
}

export const CandidateSavedFilters = ({ filters, smartFilters, savedFilters, activeSavedFilterId, onSave, onApply, onDelete }: CandidateSavedFiltersProps) => {
  const form = useSavedFilterForm({ onSave });
  const hasCurrentCriteria = Boolean(
    filters.search.trim()
    || filters.status !== 'all'
    || filters.profession !== 'all'
    || smartFilters.minExperience !== null
    || smartFilters.maxExperience !== null
    || smartFilters.englishLevel !== 'all'
    || smartFilters.availability !== 'all'
    || smartFilters.overseasExperience !== 'all'
    || smartFilters.drivingLicense !== 'all'
    || smartFilters.documentReadiness !== 'all'
    || smartFilters.skills.length > 0,
  );

  return (
    <section className="mt-4 border-t border-slate-200 pt-4" aria-labelledby="saved-filters-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 id="saved-filters-title" className="text-xs font-black text-slate-800">Saved searches</h3>
          <p className="mt-0.5 text-[10px] text-slate-400">Save a useful candidate search for one-tap reuse.</p>
        </div>
        {hasCurrentCriteria && <button type="button" onClick={() => form.setName('')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold text-cyan-700 hover:bg-cyan-50"><Icon name="plus" size={12}/>Save current</button>}
      </div>

      {hasCurrentCriteria && form.name !== undefined && (form.name.length > 0 || form.error !== null) && <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3">
        <label className="block"><span className="field-label">Search name</span><input autoFocus value={form.name} onChange={(event) => { form.setName(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); form.submit(); } if (event.key === 'Escape') form.cancel(); }} className="field-input bg-white" placeholder="e.g. Ready mason shortlist" /></label>
        {form.error && <p role="alert" className="mt-2 text-[10px] font-semibold text-rose-600">{form.error}</p>}
        <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={form.cancel} className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-white">Cancel</button><button type="button" onClick={form.submit} className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white">Save search</button></div>
      </div>}

      <div className="mt-3 space-y-2">
        {savedFilters.length === 0 ? <div className="rounded-xl bg-white px-3 py-2.5 text-[10px] leading-5 text-slate-400 ring-1 ring-slate-200">No saved searches yet. Apply a few useful filters, then save them here.</div> : savedFilters.slice(0, 5).map((filter) => (
          <div key={filter.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${activeSavedFilterId === filter.id ? 'border-cyan-200 bg-cyan-50/60' : 'border-slate-200 bg-white'}`}>
            <button type="button" onClick={() => onApply(filter)} className="min-w-0 flex-1 text-left"><p className="truncate text-[11px] font-bold text-slate-800">{filter.name}</p><p className="mt-0.5 truncate text-[9px] text-slate-400">Saved search · {filter.smartFilters.skills.length ? `${filter.smartFilters.skills.length} skills` : 'Mixed criteria'}</p></button>
            <button type="button" onClick={() => onDelete(filter.id)} aria-label={`Delete saved search ${filter.name}`} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><span aria-hidden="true">×</span></button>
          </div>
        ))}
      </div>
    </section>
  );
};
