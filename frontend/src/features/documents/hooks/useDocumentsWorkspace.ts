import { useEffect, useMemo, useState } from 'react';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { documentLabel, loadDocuments, saveDocuments } from '../services/documentRepository';
import type { Candidate } from '../../candidates/types/candidate';
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

  const syncCandidateDocumentState = (candidateId: string, nextDocuments: CandidateDocument[]) => {
    const source = nextDocuments
      .filter((document) => document.candidateId === candidateId)
      .reduce((result, document) => ({ ...result, [document.type]: document.status }), {} as Record<DocumentType, CandidateDocument['status']>);
    const candidateDocuments: Candidate['documents'] = {
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
    const next = documents.map((document) => document.candidateId === selectedCandidateId && document.type === type
      ? { ...document, fileName: file.name, sizeLabel: Math.max(1, Math.round(file.size / 1024)) + ' KB', status: 'needs-review' as const, uploadedAt: nowLabel(), reviewerNote: 'Uploaded and awaiting verification.' }
      : document);
    setDocuments(next);
    syncCandidateDocumentState(selectedCandidateId, next);
  };

  const verify = (documentId: string) => {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;
    const next = documents.map((document) => document.id === documentId
      ? { ...document, status: 'verified' as const, reviewedAt: nowLabel(), reviewerNote: 'Verified by recruiter.' }
      : document);
    setDocuments(next);
    syncCandidateDocumentState(target.candidateId, next);
  };

  const requestChanges = (documentId: string, note: string) => {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;
    const next = documents.map((document) => document.id === documentId
      ? { ...document, status: 'needs-review' as const, reviewedAt: nowLabel(), reviewerNote: note.trim() || 'Please upload a clearer or correct document.' }
      : document);
    setDocuments(next);
    syncCandidateDocumentState(target.candidateId, next);
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
