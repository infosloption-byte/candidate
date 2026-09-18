import { useMemo, useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useDocumentsWorkspace } from '../hooks/useDocumentsWorkspace';

const documentTypes = ['passport', 'cv', 'tradeCertificate', 'visa'] as const;

export const DocumentsPage = () => {
  const { can } = usePermissions();
  const { candidates, selectedCandidate, selectedDocuments, selectedDocumentIds, actions, documentLabel } = useDocumentsWorkspace();
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [bulkNote, setBulkNote] = useState('Please upload a current, clear copy of the selected documents.');
  const canManage = can('document.manage');
  const canBulkFollowUp = can('document.bulk-follow-up');

  const attentionCount = useMemo(() => candidates.filter((candidate) => Object.values(candidate.documents).some((status) => status !== 'verified')).length, [candidates]);
  const summary = selectedDocuments.map((document) => ({ ...document, expired: actions.isExpired(document), expiryWarning: actions.isExpiryWarning(document) }));
  const visibleDocuments = selectedOnly ? summary.filter((document) => selectedDocumentIds.includes(document.id)) : summary;

  if (candidates.length === 0) return <section className="mx-auto max-w-3xl p-6"><div className="rounded-3xl border border-slate-200 bg-white p-8 text-center"><Icon name="file" size={30} className="mx-auto text-slate-400"/><h1 className="mt-4 text-xl font-black">No candidates to review</h1><p className="mt-2 text-sm text-slate-500">Candidate documents will appear here after candidates are added.</p></div></section>;

  return <section className="mx-auto max-w-7xl p-4 sm:p-6">
    <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Document control</p>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Control document readiness, expiry and verification.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Review files, maintain document versions, record verification ownership, and follow up missing or rejected documents in one workspace.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] uppercase text-slate-400">Candidates</p><p className="text-lg font-black text-slate-900">{candidates.length}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-[9px] uppercase text-amber-600">Attention</p><p className="text-lg font-black text-amber-800">{attentionCount}</p></div><div className="rounded-xl bg-cyan-50 p-3"><p className="text-[9px] uppercase text-cyan-600">Selected docs</p><p className="text-lg font-black text-cyan-800">{selectedDocumentIds.length}</p></div></div>
      </div>
    </header>

    <div className="mt-4 grid gap-4 xl:grid-cols-[300px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="field-label px-2 py-1">Candidate</label>
        <div className="mt-1 max-h-[62dvh] overflow-y-auto">{candidates.map((candidate) => <button key={candidate.id} type="button" onClick={() => { actions.setSelectedCandidateId(candidate.id); setPreviewDocumentId(null); }} title={'Open documents for ' + candidate.name} className={'w-full rounded-xl p-3 text-left ' + (selectedCandidate?.id === candidate.id ? 'bg-slate-950 text-white' : 'hover:bg-slate-50')}><p className="truncate text-xs font-bold">{candidate.name}</p><p className={'mt-1 text-[10px] ' + (selectedCandidate?.id === candidate.id ? 'text-slate-300' : 'text-slate-500')}>{candidate.reference} · {candidate.profession}</p></button>)}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Selected candidate</p><h2 className="mt-1 text-xl font-black text-slate-950">{selectedCandidate?.name}</h2><p className="mt-1 text-xs text-slate-500">{selectedCandidate?.profession} · {selectedCandidate?.location}</p></div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><span className="font-black">{selectedDocuments.filter((document) => document.status === 'verified').length}</span> / {selectedDocuments.length} verified</div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {documentTypes.map((type) => { const document = selectedDocuments.find((item) => item.type === type); const status = document?.status ?? 'missing'; return <div key={type} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">{documentLabel(type)}</p><p className={'mt-1 text-xs font-black ' + (status === 'verified' ? 'text-emerald-700' : status === 'needs-review' ? 'text-amber-700' : 'text-rose-700')}>{status === 'verified' ? 'Verified' : status === 'needs-review' ? 'Needs review' : 'Missing'}</p></div>; })}
        </div>

        {canBulkFollowUp && <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-end"><div className="flex-1"><p className="text-xs font-black text-amber-950">Bulk document follow-up</p><p className="mt-1 text-[11px] leading-5 text-amber-900">Select documents below and send one shared follow-up note. This preview records the review state locally; delivery is a backend responsibility.</p><label className="field-label mt-3 text-amber-950">Follow-up note<textarea value={bulkNote} onChange={(event) => setBulkNote(event.target.value)} className="field-input min-h-16"/></label></div><button type="button" disabled={selectedDocumentIds.length === 0 || !canManage} onClick={() => actions.bulkRequestChanges(bulkNote)} title={canManage ? 'Request updates for selected documents' : 'Document updates are restricted for this role'} className="rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">Request changes ({selectedDocumentIds.length})</button></div></div>}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setSelectedOnly((current) => !current)} aria-pressed={selectedOnly} title="Toggle between all documents and selected documents" className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700">{selectedOnly ? 'Show all documents' : 'Show selected only'}</button>
          {selectedDocumentIds.length > 0 && <button type="button" onClick={() => setSelectedOnly(false)} title="Show all documents after selection" className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500">Clear view</button>}
        </div>

        <div className="mt-4 space-y-3">
          {visibleDocuments.map((document) => <article key={document.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={selectedDocumentIds.includes(document.id)} onChange={() => actions.toggleDocument(document.id)} disabled={!canManage} title="Select document for bulk follow-up"/><span className="sr-only">Select {documentLabel(document.type)}</span></label>
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-slate-600"><Icon name="file" size={18}/></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black text-slate-900">{documentLabel(document.type)}</p><span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (document.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : document.status === 'needs-review' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500')}>{document.status.replace('-', ' ')}</span>{document.expired && <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">Expired</span>}{!document.expired && document.expiryWarning && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Expiring soon</span>}</div><p className="mt-1 truncate text-[11px] text-slate-500">{document.fileName || 'No file uploaded'} {document.version > 0 ? '· v' + document.version : ''} {document.sizeLabel ? '· ' + document.sizeLabel : ''}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400"><span>{document.uploadedAt ? 'Uploaded ' + document.uploadedAt : 'Not uploaded'}</span><span>{document.uploadedBy ? 'By ' + document.uploadedBy : ''}</span>{document.reviewedAt && <span>Reviewed {document.reviewedAt}</span>}{document.verifiedBy && <span>Verified by {document.verifiedBy}</span>}{document.expiresAt && <span>Expires {document.expiresAt}</span>}</div></div>
              <div className="flex flex-wrap gap-2">
                {canManage && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700"><Icon name="file" size={14}/><span>{document.fileName ? 'Replace' : 'Upload'}</span><input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => { const file = event.target.files?.[0]; if (file) actions.upload(document.type, file); event.currentTarget.value = ''; }}/></label>}
                {actions.preview(document.id) && <button type="button" onClick={() => setPreviewDocumentId(document.id)} title="Preview the currently uploaded document" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700">Preview</button>}
                {actions.preview(document.id) && <button type="button" onClick={() => actions.download(document.id)} title="Download the currently uploaded document" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700">Download</button>}
                {canManage && document.status === 'needs-review' && <button type="button" onClick={() => actions.verify(document.id)} title="Verify this document" className="rounded-lg bg-slate-950 px-3 py-2 text-[11px] font-bold text-white">Verify</button>}
                {canManage && document.status !== 'missing' && document.status !== 'verified' && <button type="button" onClick={() => actions.requestChanges(document.id, 'Please upload a clearer or current document.')} title="Request a replacement document" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">Request changes</button>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
  {canManage ? <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">Expiry <input type="date" value={document.expiresAt ?? ''} onChange={(event) => actions.setExpiry(document.id, event.target.value)} title="Set or change document expiry date" className="rounded-md border border-slate-200 px-2 py-1 text-[10px]" /></label> : document.expiresAt && <span className="text-[10px] font-semibold text-slate-500">Expiry: {document.expiresAt}</span>}
</div>
            {document.reviewerNote && <p className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-[11px] leading-5 text-slate-600"><strong>Review note:</strong> {document.reviewerNote}</p>}
            {document.versions.length > 0 && <details className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2"><summary className="cursor-pointer text-[10px] font-bold text-slate-600">Version history ({document.versions.length})</summary><div className="mt-2 space-y-2">{document.versions.slice().reverse().map((version) => <div key={version.version} className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500"><span><strong className="text-slate-700">v{version.version}</strong> · {version.fileName}</span><span>{version.uploadedAt} · {version.uploadedBy}</span></div>)}</div></details>}
          </article>)}
        </div>
      </section>
    </div>

    {previewDocumentId && actions.preview(previewDocumentId) && <div className="fixed inset-0 z-[80] bg-slate-950/70 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="document-preview-title" onClick={() => setPreviewDocumentId(null)}>
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><h2 id="document-preview-title" className="text-sm font-black text-slate-900">Document preview</h2><p className="text-[10px] text-slate-500">{selectedDocuments.find((document) => document.id === previewDocumentId)?.fileName}</p></div><button type="button" onClick={() => setPreviewDocumentId(null)} title="Close document preview" className="rounded-lg px-3 py-2 text-slate-500">Close</button></header>
        <div className="min-h-0 flex-1 bg-slate-100 p-4">{(() => { const document = selectedDocuments.find((item) => item.id === previewDocumentId); const url = actions.preview(previewDocumentId); if (!document || !url) return null; const isPdf = document.fileName.toLowerCase().endsWith('.pdf'); return isPdf ? <iframe title={document.fileName} src={url} className="size-full rounded-xl bg-white"/> : <div className="grid size-full place-items-center overflow-auto"><img src={url} alt={document.fileName} className="max-h-full max-w-full object-contain"/></div>; })()}</div>
      </div>
    </div>}
  </section>;
};
