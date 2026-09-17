import type { Availability, BooleanFilter, CandidateSmartFilters, DocumentReadinessFilter, EnglishLevel } from '../types/candidate';

interface CandidateSmartFiltersPanelProps {
  filters: CandidateSmartFilters;
  englishLevels: EnglishLevel[];
  availabilities: Availability[];
  skillOptions: string[];
  onChange: (filters: CandidateSmartFilters) => void;
  onToggleSkill: (skill: string) => void;
  onClear: () => void;
}

const booleanOptions: Array<{ value: BooleanFilter; label: string }> = [
  { value: 'all', label: 'Any' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const documentOptions: Array<{ value: DocumentReadinessFilter; label: string }> = [
  { value: 'all', label: 'Any' },
  { value: 'ready', label: 'Ready' },
  { value: 'attention', label: 'Needs attention' },
];

export const CandidateSmartFiltersPanel = ({ filters, englishLevels, availabilities, skillOptions, onChange, onToggleSkill, onClear }: CandidateSmartFiltersPanelProps) => {
  const setExperience = (field: 'minExperience' | 'maxExperience', value: string) => {
    const numericValue = value.trim() === '' ? null : Number(value);
    onChange({ ...filters, [field]: Number.isFinite(numericValue) ? numericValue : null });
  };

  return (
    <section className="border-b border-slate-200 bg-slate-50/90 p-3 sm:p-4" aria-label="Smart candidate filters">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Experience from</span>
          <input type="number" min="0" max="50" value={filters.minExperience ?? ''} onChange={(event) => setExperience('minExperience', event.target.value)} className="field-input bg-white" placeholder="Any" />
        </label>
        <label>
          <span className="field-label">Experience to</span>
          <input type="number" min="0" max="50" value={filters.maxExperience ?? ''} onChange={(event) => setExperience('maxExperience', event.target.value)} className="field-input bg-white" placeholder="Any" />
        </label>
        <label>
          <span className="field-label">English</span>
          <select value={filters.englishLevel} onChange={(event) => onChange({ ...filters, englishLevel: event.target.value as EnglishLevel | 'all' })} className="field-input bg-white">
            <option value="all">Any level</option>
            {englishLevels.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">Availability</span>
          <select value={filters.availability} onChange={(event) => onChange({ ...filters, availability: event.target.value as Availability | 'all' })} className="field-input bg-white">
            <option value="all">Any availability</option>
            {availabilities.map((availability) => <option key={availability} value={availability}>{availability}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">Overseas experience</span>
          <select value={filters.overseasExperience} onChange={(event) => onChange({ ...filters, overseasExperience: event.target.value as BooleanFilter })} className="field-input bg-white">
            {booleanOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">Driving licence</span>
          <select value={filters.drivingLicense} onChange={(event) => onChange({ ...filters, drivingLicense: event.target.value as BooleanFilter })} className="field-input bg-white">
            {booleanOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="field-label">Documents</span>
          <select value={filters.documentReadiness} onChange={(event) => onChange({ ...filters, documentReadiness: event.target.value as DocumentReadinessFilter })} className="field-input bg-white">
            {documentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold text-slate-800">Skills</p><p className="mt-0.5 text-[11px] text-slate-500">Match every selected skill.</p></div>
          <button type="button" onClick={onClear} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-white hover:text-slate-800">Clear all</button>
        </div>
        <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {skillOptions.length === 0 ? <span className="text-[11px] text-slate-400">No skills are available yet.</span> : skillOptions.map((skill) => {
            const selected = filters.skills.includes(skill);
            return <button key={skill} type="button" aria-pressed={selected} onClick={() => onToggleSkill(skill)} className={`rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition ${selected ? 'border-cyan-200 bg-cyan-100 text-cyan-800' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}>{skill}</button>;
          })}
        </div>
      </div>
    </section>
  );
};
