import { useMemo, useState } from 'react';
import type { Candidate } from '../../domain/types';

interface AgencyOption {
  id: string;
  name: string;
}

interface Props {
  candidates: Candidate[];
  agencyOptions: AgencyOption[];
  activeAgencyId: string;
  selectedIds: string[];
  search: string;
  editingCandidateId?: string;
  onAgencyChange: (agencyId: string) => void;
  onSearchChange: (value: string) => void;
  onToggle: (candidateId: string) => void;
  onRemove: (candidateId: string) => void;
  onClear: () => void;
}

const terminalStatuses = new Set(['PASSED', 'REJECTED', 'HIRED', 'INACTIVE']);

export const CandidateMultiSelect = ({
  candidates,
  agencyOptions,
  activeAgencyId,
  selectedIds,
  search,
  editingCandidateId,
  onAgencyChange,
  onSearchChange,
  onToggle,
  onRemove,
  onClear,
}: Props) => {
  const [selectedSearch, setSelectedSearch] = useState('');

  const agencyName = (agencyId: string): string =>
    agencyOptions.find((agency) => agency.id === agencyId)?.name ?? agencyId;

  const query = search.trim().toLowerCase();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const available = useMemo(() => candidates.filter((candidate) => {
    if (terminalStatuses.has(candidate.status)) return false;
    if (candidate.agencyId !== activeAgencyId) return false;
    if (editingCandidateId && candidate.id === editingCandidateId) return false;
    if (selectedSet.has(candidate.id)) return false;
    if (!query) return true;
    return [candidate.name, candidate.reference, candidate.passportNumber ?? '', candidate.profession ?? '', candidate.email ?? '', candidate.phone ?? '']
      .some((value) => value.toLowerCase().includes(query));
  }), [activeAgencyId, candidates, editingCandidateId, query, selectedSet]);

  const selectedQuery = selectedSearch.trim().toLowerCase();
  const selected = useMemo(() => selectedIds
    .map((id) => candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is Candidate => Boolean(candidate))
    .filter((candidate) => {
      if (!selectedQuery) return true;
      return [candidate.name, candidate.reference, agencyName(candidate.agencyId)]
        .some((value) => value.toLowerCase().includes(selectedQuery));
    }), [candidates, selectedIds, selectedQuery]);

  const addAllVisible = () => available.forEach((candidate) => onToggle(candidate.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50/70 p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.7fr)]">
          <div>
            <label className="field-label">Browse agency</label>
            <select
              className="field-input mt-1 h-10"
              value={activeAgencyId}
              onChange={(event) => onAgencyChange(event.target.value)}
              aria-label="Browse candidates by agency"
            >
              <option value="">Select an agency</option>
              {agencyOptions.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Search candidates</label>
            <input
              className="field-input mt-1 h-10"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name, reference, passport…"
            />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 md:grid-cols-2">
        <section className="min-w-0 border-b border-slate-100 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div>
              <p className="text-xs font-extrabold text-slate-800">Available candidates</p>
              <p className="text-[10px] text-slate-400">{activeAgencyId ? agencyName(activeAgencyId) : 'Choose an agency'}</p>
            </div>
            <button
              type="button"
              className="text-[10px] font-extrabold text-cyan-700 hover:text-cyan-800 disabled:text-slate-300"
              disabled={!available.length}
              onClick={addAllVisible}
            >
              Add visible
            </button>
          </div>

          <div className="max-h-52 overflow-y-auto p-2">
            {available.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-cyan-50"
                onClick={() => onToggle(candidate.id)}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-black text-cyan-700">+</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800">{candidate.name}</span>
                  <span className="block truncate text-[10px] text-slate-400">{candidate.reference} · {candidate.profession ?? 'Profession not set'}</span>
                </span>
              </button>
            ))}
            {!activeAgencyId ? (
              <p className="p-4 text-center text-xs text-slate-400">Select an agency to browse candidates.</p>
            ) : !available.length ? (
              <p className="p-4 text-center text-xs text-slate-400">No available candidates match your search.</p>
            ) : null}
          </div>
        </section>

        <section className="min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div>
              <p className="text-xs font-extrabold text-slate-800">Selected candidates</p>
              <p className="text-[10px] text-slate-400">{selectedIds.length} selected across all agencies</p>
            </div>
            <button
              type="button"
              className="text-[10px] font-extrabold text-slate-500 hover:text-slate-800 disabled:text-slate-300"
              disabled={!selectedIds.length}
              onClick={onClear}
            >
              Clear all
            </button>
          </div>

          <div className="border-b border-slate-100 px-3 py-2">
            <input
              className="field-input h-9 w-full"
              value={selectedSearch}
              onChange={(event) => setSelectedSearch(event.target.value)}
              placeholder="Search selected…"
              aria-label="Search selected candidates"
            />
          </div>

          <div className="max-h-52 overflow-y-auto p-2">
            {selected.map((candidate) => (
              <div key={candidate.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-2.5 py-2 mb-1.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-50 text-[10px] font-black text-cyan-700">✓</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800">{candidate.name}</span>
                  <span className="block truncate text-[10px] text-slate-400">{agencyName(candidate.agencyId)} · {candidate.reference}</span>
                </span>
                <button
                  type="button"
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title={`Remove ${candidate.name}`}
                  aria-label={`Remove ${candidate.name}`}
                  onClick={() => onRemove(candidate.id)}
                >
                  ×
                </button>
              </div>
            ))}
            {!selected.length && <p className="p-4 text-center text-xs text-slate-400">Click a candidate on the left to add them here.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};
