import { useEffect, useId, useRef } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { useCandidateBulkImport } from '../hooks/useCandidateBulkImport';
import { candidateImportTemplate } from '../services/candidateImport';
import type { Candidate } from '../types/candidate';

interface CandidateBulkImportDrawerProps {
  open: boolean;
  existingCandidates: Candidate[];
  onClose: () => void;
  onImport: (candidates: Candidate[]) => void;
}

export const CandidateBulkImportDrawer = ({ open, existingCandidates, onClose, onImport }: CandidateBulkImportDrawerProps) => {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importer = useCandidateBulkImport(existingCandidates, onImport, onClose);
  const drawerRef = useFocusTrap({ enabled: open, onEscape: onClose });

  useEffect(() => {
    if (!open) importer.actions.reset();
  }, [importer.actions.reset, open]);

  if (!open) return null;

  const downloadTemplate = () => {
    const blob = new Blob([candidateImportTemplate], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'buildhire-candidate-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" aria-label="Close bulk candidate import" title="Close bulk candidate import" onClick={onClose} />
      <aside ref={drawerRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-5xl flex-col bg-white shadow-2xl sm:rounded-l-3xl">
        <header className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">Candidate acquisition</p>
              <h2 id={titleId} className="mt-1 text-xl font-black tracking-tight text-slate-950">Bulk import candidates</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Recruiters and system administrators can upload a CSV, review validation and duplicate signals, and import clean records together.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" title="Close" className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><Icon name="x" size={18} /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadTemplate} title="Download the candidate CSV template" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Icon name="download" size={15} /> Download template</button>
            <span className="rounded-full bg-cyan-50 px-3 py-2 text-[11px] font-semibold text-cyan-700">Required: Name · Phone · Profession · Experience Years</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <section aria-labelledby={`${titleId}-file`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 id={`${titleId}-file`} className="text-sm font-black text-slate-900">1. Upload source list</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Common recruitment column names are matched automatically. The original spreadsheet row number stays attached to every preview result.</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importer.actions.parseFile(file); event.currentTarget.value = ''; }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importer.parsing} title="Choose a CSV candidate list" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Icon name="file" size={15} />{importer.parsing ? 'Reading…' : importer.fileName ? 'Replace CSV' : 'Choose CSV file'}</button>
            </div>
            {importer.fileName && <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{importer.fileName}</p>}
          </section>

          {importer.error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-700"><Icon name="alert" size={16} />{importer.error}</div>}

          {importer.preview && (
            <section className="mt-4 space-y-4" aria-label="Candidate import preview">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rows</p><p className="mt-1 text-lg font-black text-slate-950">{importer.preview.rows.length}</p></div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Ready</p><p className="mt-1 text-lg font-black text-emerald-800">{importer.importableCount}</p></div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Errors</p><p className="mt-1 text-lg font-black text-rose-800">{importer.preview.errorCount}</p></div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">High duplicates</p><p className="mt-1 text-lg font-black text-amber-800">{importer.preview.highConfidenceDuplicateCount}</p></div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-black text-amber-900">Duplicate protection</p><p className="mt-1 text-[11px] leading-5 text-amber-800">High-confidence matches are excluded by default. Possible matches are importable but remain visible for recruiter review.</p></div>
                  <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-amber-900"><input type="checkbox" checked={importer.includeHighConfidenceDuplicates} onChange={(event) => importer.actions.setIncludeHighConfidenceDuplicates(event.target.checked)} /> Import high-confidence duplicates</label>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Candidate</th><th className="px-3 py-2">Trade</th><th className="px-3 py-2">Experience</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Validation / duplicate review</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {importer.preview.rows.map((row) => {
                        const duplicate = row.duplicates.some((match) => match.confidence === 'high');
                        const possible = !duplicate && row.duplicates.length > 0;
                        return <tr key={row.rowNumber} className="align-top">
                          <td className="px-3 py-3 font-bold text-slate-500">#{row.rowNumber}</td>
                          <td className="px-3 py-3"><p className="font-bold text-slate-900">{row.draft.name || 'Missing name'}</p><p className="mt-0.5 text-[10px] text-slate-400">{row.draft.phone || 'Missing phone'}</p></td>
                          <td className="px-3 py-3 font-semibold text-slate-700">{row.draft.profession || 'Missing profession'}</td>
                          <td className="px-3 py-3 font-semibold text-slate-700">{row.draft.experienceYears || '—'}</td>
                          <td className="px-3 py-3">{row.errors.length > 0 ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">Blocked</span> : duplicate && !importer.includeHighConfidenceDuplicates ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Skipped</span> : duplicate ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Duplicate import</span> : possible ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Possible duplicate</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Ready</span>}</td>
                          <td className="px-3 py-3"><div className="space-y-1.5">{row.errors.map((message) => <p key={message} className="text-[10px] font-semibold text-rose-700">{message}</p>)}{row.warnings.map((message) => <p key={message} className="text-[10px] leading-4 text-amber-700">{message}</p>)}{duplicate && row.duplicates.map((match) => <p key={match.candidateId} className="text-[10px] leading-4 text-slate-600">Matches {match.candidateId}: {match.reasons.join(', ')}</p>)}</div></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-xs leading-5 text-cyan-900">
                <p className="font-black">After import</p>
                <p className="mt-1">Every imported candidate starts in <strong>New</strong> recruitment status and <strong>Not started</strong> onboarding. The recruiter or system administrator can then send the candidate into the onboarding workflow.</p>
              </div>
            </section>
          )}
        </div>

        <footer className="safe-bottom flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <p className="max-w-xl text-[10px] leading-4 text-slate-400">Frontend MVP uses local persistence. Authentication, role enforcement, XLSX processing, file storage, invite delivery and server-side uniqueness rules belong to the backend phase.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} title="Cancel bulk import" className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="button" onClick={importer.actions.importCandidates} disabled={!importer.preview || importer.importableCount === 0 || importer.parsing} title="Import validated candidates into the talent pool" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Icon name="check" size={15} /> Import {importer.importableCount} candidates</button>
          </div>
        </footer>
      </aside>
    </div>
  );
};
