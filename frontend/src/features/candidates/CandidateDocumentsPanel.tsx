import { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiDownload, apiFetch } from '../../shared/lib/api';
import type { CandidateDocument } from '../../domain/types';

interface CandidateDocumentsPanelProps {
  candidateId: string;
  apiEnabled: boolean;
  readOnly?: boolean;
}

const maxDocumentSizeBytes = 5 * 1024 * 1024;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
};

export const CandidateDocumentsPanel = ({ candidateId, apiEnabled, readOnly = false }: CandidateDocumentsPanelProps) => {
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [loading, setLoading] = useState(apiEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    if (!apiEnabled) return;
    setLoading(true);
    setError('');
    try {
      setDocuments(await apiFetch<CandidateDocument[]>('/candidates/' + candidateId + '/documents'));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, [candidateId, apiEnabled]);

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      if (file.size > maxDocumentSizeBytes) {
        throw new Error('Documents must be 5 MB or smaller.');
      }

      const supportedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
      if (!supportedTypes.has(file.type)) {
        throw new Error('Only PDF, JPEG, and PNG documents are supported.');
      }

      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          const commaIndex = result.indexOf(',');
          if (commaIndex < 0) {
            reject(new Error('Unable to read the selected document.'));
            return;
          }
          resolve(result.slice(commaIndex + 1));
        };
        reader.onerror = () => reject(new Error('Unable to read the selected document.'));
        reader.readAsDataURL(file);
      });

      await apiFetch<CandidateDocument>('/candidates/' + candidateId + '/documents', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          contentBase64,
        }),
      });

      setSuccess('Document uploaded successfully.');
      await loadDocuments();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to upload the document.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (document: CandidateDocument) => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await apiFetch('/candidates/' + candidateId + '/documents/' + document.id, { method: 'DELETE' });
      setSuccess('Document deleted.');
      await loadDocuments();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete the document.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (document: CandidateDocument) => {
    try {
      const blob = await apiDownload('/candidates/' + candidateId + '/documents/' + document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to download the document.');
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-950">Documents</h2>
          <p className="mt-1 text-xs text-slate-500">{readOnly ? 'Supporting files attached to this candidate profile.' : 'Optional supporting files for onboarding. PDF, JPEG, or PNG up to 5 MB.'}</p>
        </div>
        {!readOnly && (
          <Button
            variant="secondary"
            disabled={!apiEnabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Working…' : 'Upload document'}
          </Button>
        )}
      </div>

      {!readOnly && (
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept=".pdf,image/jpeg,image/png"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      )}

      {!apiEnabled && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-500">
          Document storage is available when the application is connected to the backend API.
        </div>
      )}

      {loading && <div className="mt-4"><StateMessage kind="loading" title="Loading documents" description="Fetching candidate documents." /></div>}
      {error && <div className="mt-4"><StateMessage kind="error" title="Document action failed" description={error} /></div>}
      {success && <div className="mt-4"><StateMessage kind="success" title="Saved" description={success} /></div>}

      {!loading && apiEnabled && documents.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
          No documents uploaded yet.
        </div>
      )}

      {documents.length > 0 && (
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100">
          {documents.map((document) => (
            <div key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{document.originalName}</p>
                <p className="mt-1 text-xs text-slate-400">{formatBytes(document.sizeBytes)} · {new Date(document.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" className="px-3 py-1.5" onClick={() => void download(document)}>Download</Button>
                {!readOnly && <Button variant="ghost" className="px-3 py-1.5 text-rose-600" disabled={busy} onClick={() => void remove(document)}>Delete</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
