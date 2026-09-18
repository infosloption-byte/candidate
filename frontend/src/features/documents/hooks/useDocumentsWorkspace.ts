import { useEffect, useMemo, useRef, useState } from 'react';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { documentLabel, loadDocuments, saveDocuments } from '../services/documentRepository';
import type { Candidate } from '../../candidates/types/candidate';
import type { CandidateDocument, DocumentType } from '../types/documents';

const nowLabel = () => new Date().toLocaleString('en-GB');
const expiryWindowMs = 30 * 86400000;

export const useDocumentsWorkspace = () => {
  const { state: candidateState, actions: candidateActions } = useCandidateWorkspace();
  const [documents, setDocuments] = useState<CandidateDocument[]>(() => loadDocuments(candidateState.candidates));
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(candidateState.candidates[0]?.id ?? null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (candidateState.candidates.length === 0) return;
    setDocuments((current) => {
      const known = new Set(current.map((item) => item.candidateId + ':' + item.type));
      const additions = candidateState.candidates.flatMap((candidate) =>
        (['passport', 'cv', 'tradeCertificate', 'visa'] as DocumentType[])
          .filter((type) => !known.has(candidate.id + ':' + type))
          .map((type) => ({
            id: candidate.id + '-' + type,
            candidateId: candidate.id,
            type,
            fileName: '',
            sizeLabel: '',
            status: candidate.documents[type] ?? 'missing',
            version: 1,
            versions: [],
          })),
      );
      return additions.length === 0 ? current : [...current, ...additions];
    });
    if (!selectedCandidateId || !candidateState.candidates.some((candidate) => candidate.id === selectedCandidateId)) {
      setSelectedCandidateId(candidateState.candidates[0]?.id ?? null);
    }
  }, [candidateState.candidates, selectedCandidateId]);

  useEffect(() => saveDocuments(documents), [documents]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => {
    return () => Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const selectedCandidate = useMemo(
    () => candidateState.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [candidateState.candidates, selectedCandidateId],
  );

  const selectedDocuments = useMemo(
    () => documents.filter((document) => document.candidateId === selectedCandidateId),
    [documents, selectedCandidateId],
  );

  const syncCandidateDocumentState = (candidateId: string, nextDocuments: CandidateDocument[]) => {
    const candidateDocuments: Candidate['documents'] = {
      passport: nextDocuments.find((document) => document.candidateId === candidateId && document.type === 'passport')?.status ?? 'missing',
      cv: nextDocuments.find((document) => document.candidateId === candidateId && document.type === 'cv')?.status ?? 'missing',
      tradeCertificate: nextDocuments.find((document) => document.candidateId === candidateId && document.type === 'tradeCertificate')?.status ?? 'missing',
      visa: nextDocuments.find((document) => document.candidateId === candidateId && document.type === 'visa')?.status ?? 'missing',
    };
    const allVerified = Object.values(candidateDocuments).every((status) => status === 'verified');
    candidateActions.updateDocuments(candidateId, candidateDocuments, {
      id: 'document-' + Date.now() + '-' + candidateId,
      date: nowLabel(),
      title: 'Documents updated',
      detail: 'Document status was updated in the document workspace.',
      tone: allVerified ? 'positive' : 'warning',
    });
  };

  const upload = (type: DocumentType, file: File) => {
    if (!selectedCandidateId) return;
    const id = selectedCandidateId + '-' + type;
    const current = documents.find((document) => document.id === id);
    const nextVersion = (current?.version ?? 0) + 1;
    const url = URL.createObjectURL(file);
    setPreviewUrls((previous) => {
      const existing = previous[id];
      if (existing) URL.revokeObjectURL(existing);
      return { ...previous, [id]: url };
    });
    const versionEntry = { version: nextVersion, fileName: file.name, sizeLabel: Math.max(1, Math.round(file.size / 1024)) + ' KB', uploadedAt: nowLabel(), uploadedBy: 'Current recruiter' };
    const next = documents.map((document) => document.id === id
      ? {
          ...document,
          fileName: file.name,
          sizeLabel: versionEntry.sizeLabel,
          status: 'needs-review' as const,
          uploadedAt: nowLabel(),
          uploadedBy: 'Current recruiter',
          reviewedAt: undefined,
          verifiedBy: undefined,
          reviewerNote: 'Uploaded and awaiting verification.',
          version: nextVersion,
          versions: [...document.versions, versionEntry],
        }
      : document);
    setDocuments(next);
    syncCandidateDocumentState(selectedCandidateId, next);
  };

  const verify = (documentId: string) => {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;
    const next = documents.map((document) => document.id === documentId
      ? { ...document, status: 'verified' as const, reviewedAt: nowLabel(), verifiedBy: 'Current recruiter', reviewerNote: 'Verified by recruiter.' }
      : document);
    setDocuments(next);
    syncCandidateDocumentState(target.candidateId, next);
  };

  const requestChanges = (documentId: string, note: string) => {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;
    const next = documents.map((document) => document.id === documentId
      ? { ...document, status: 'needs-review' as const, reviewedAt: nowLabel(), verifiedBy: undefined, reviewerNote: note.trim() || 'Please upload a clearer or correct document.' }
      : document);
    setDocuments(next);
    syncCandidateDocumentState(target.candidateId, next);
  };

  const toggleDocument = (documentId: string) => {
    setSelectedDocumentIds((current) => current.includes(documentId) ? current.filter((id) => id !== documentId) : [...current, documentId]);
  };

  const bulkRequestChanges = (note: string) => {
    if (selectedDocumentIds.length === 0) return;
    const ids = new Set(selectedDocumentIds);
    const next = documents.map((document) => ids.has(document.id)
      ? { ...document, status: 'needs-review' as const, reviewedAt: nowLabel(), verifiedBy: undefined, reviewerNote: note.trim() || 'Please update this document.' }
      : document);
    const candidateIds = Array.from(new Set(next.filter((document) => ids.has(document.id)).map((document) => document.candidateId)));
    setDocuments(next);
    candidateIds.forEach((candidateId) => syncCandidateDocumentState(candidateId, next));
    setSelectedDocumentIds([]);
  };

  const setExpiry = (documentId: string, expiresAt: string) => {
    const target = documents.find((document) => document.id === documentId);
    if (!target) return;
    const next = documents.map((document) => document.id === documentId ? { ...document, expiresAt: expiresAt || undefined } : document);
    setDocuments(next);
    syncCandidateDocumentState(target.candidateId, next);
  };

  const preview = (documentId: string) => previewUrls[documentId] ?? null;

  const download = (documentId: string) => {
    const url = previewUrls[documentId];
    if (!url) return false;
    const target = documents.find((document) => document.id === documentId);
    if (!target) return false;
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = target.fileName;
    anchor.click();
    return true;
  };

  const isExpiryWarning = (document: CandidateDocument): boolean => {
    if (!document.expiresAt) return false;
    const expiry = new Date(document.expiresAt).getTime();
    return Number.isFinite(expiry) && expiry <= Date.now() + expiryWindowMs;
  };

  const isExpired = (document: CandidateDocument): boolean => {
    if (!document.expiresAt) return false;
    const expiry = new Date(document.expiresAt).getTime();
    return Number.isFinite(expiry) && expiry < Date.now();
  };

  return {
    candidates: candidateState.candidates,
    selectedCandidate,
    selectedDocuments,
    selectedDocumentIds,
    actions: {
      setSelectedCandidateId,
      upload,
      verify,
      requestChanges,
      toggleDocument,
      bulkRequestChanges,
      preview,
      download,
      setExpiry,
      isExpiryWarning,
      isExpired,
    },
    documentLabel,
  };
};
