import { useEffect, useMemo, useState } from 'react';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { documentLabel, loadDocuments, saveDocuments } from '../services/documentRepository';
import type { CandidateDocument, DocumentType } from '../types/documents';

const nowLabel = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const useDocumentsWorkspace = () => {
  const { state: candidateState, actions: candidateActions } = useCandidateWorkspace();
  const [documents, setDocuments] = useState<CandidateDocument[]>(() => loadDocuments(candidateState.candidates));
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(candidateState.candidates[0]?.id ?? null);

  useEffect(() => {
    if (candidateState.candidates.length === 0) return;
    setDocuments((current) => {
      const known = new Set(current.map((item) => item.candidateId + ':' + item.type));
      const additions = candidateState.candidates.flatMap((candidate) =>
        (['passport', 'cv', 'tradeCertificate'] as DocumentType[])
          .filter((type) => !known.has(candidate.id + ':' + type))
          .map((type) => ({ id: candidate.id + '-' + type, candidateId: candidate.id, type, fileName: '', sizeLabel: '', status: candidate.documents[type] })),
      );
      return additions.length === 0 ? current : [...current, ...additions];
    });
    if (!selectedCandidateId || !candidateState.candidates.some((candidate) => candidate.id === selectedCandidateId)) {
      setSelectedCandidateId(candidateState.candidates[0]?.id ?? null);
    }
  }, [candidateState.candidates, selectedCandidateId]);

  useEffect(() => saveDocuments(documents), [documents]);

  const selectedCandidate = useMemo(
    () => candidateState.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [candidateState.candidates, selectedCandidateId],
  );

  const selectedDocuments = useMemo(
    () => documents.filter((document) => document.candidateId === selectedCandidateId),
    [documents, selectedCandidateId],
  );

  const updateCandidateDocumentState = (candidateId: string) => {
    const next = documents.filter((document) => document.candidateId === candidateId);
    const source = next.reduce((result, document) => ({ ...result, [document.type]: document.status }), {} as typeof selectedCandidate extends null ? never : NonNullable<typeof selectedCandidate>['documents']);
    const candidateDocuments = {
      passport: source.passport ?? 'missing',
      cv: source.cv ?? 'missing',
      tradeCertificate: source.tradeCertificate ?? 'missing',
    };
    candidateActions.updateDocuments(candidateId, candidateDocuments, {
      id: 'document-' + Date.now(),
      date: nowLabel(),
      title: 'Documents updated',
      detail: 'Document status was updated in the document workspace.',
      tone: Object.values(candidateDocuments).every((status) => status === 'verified') ? 'positive' : 'warning',
    });
  };

  const upload = (type: DocumentType, file: File) => {
    if (!selectedCandidateId) return;
    setDocuments((current) => current.map((document) => document.candidateId === selectedCandidateId && document.type === type
      ? { ...document, fileName: file.name, sizeLabel: Math.max(1, Math.round(file.size / 1024)) + ' KB', status: 'needs-review', uploadedAt: nowLabel(), reviewerNote: 'Uploaded and awaiting verification.' }
      : document,
    ));
    window.setTimeout(() => {
      setDocuments((current) => {
        const next = current.map((document) => document.candidateId === selectedCandidateId && document.type === type ? document : document);
        return next;
      });
    }, 0);
  };

  const verify = (documentId: string) => {
    let candidateId = '';
    setDocuments((current) => current.map((document) => {
      if (document.id !== documentId) return document;
      candidateId = document.candidateId;
      return { ...document, status: 'verified', reviewedAt: nowLabel(), reviewerNote: 'Verified by recruiter.' };
    }));
    if (candidateId) window.setTimeout(() => updateCandidateDocumentState(candidateId), 0);
  };

  const requestChanges = (documentId: string, note: string) => {
    let candidateId = '';
    setDocuments((current) => current.map((document) => {
      if (document.id !== documentId) return document;
      candidateId = document.candidateId;
      return { ...document, status: 'needs-review', reviewedAt: nowLabel(), reviewerNote: note.trim() || 'Please upload a clearer document.' };
    }));
    if (candidateId) window.setTimeout(() => updateCandidateDocumentState(candidateId), 0);
  };

  return {
    candidates: candidateState.candidates,
    selectedCandidate,
    selectedDocuments,
    actions: {
      setSelectedCandidateId,
      upload,
      verify,
      requestChanges,
    },
    documentLabel,
  };
};
