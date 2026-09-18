import type { Candidate } from '../../candidates/types/candidate';
import type { CandidateDocument, DocumentType } from '../types/documents';

const STORAGE_KEY = 'buildhire.documents';

const labelFor: Record<DocumentType, string> = {
  passport: 'Passport',
  cv: 'CV / Resume',
  tradeCertificate: 'Trade certificate',
};

const seedForCandidate = (candidate: Candidate): CandidateDocument[] =>
  (Object.keys(labelFor) as DocumentType[]).map((type) => ({
    id: candidate.id + '-' + type,
    candidateId: candidate.id,
    type,
    fileName: candidate.documents[type] === 'missing' ? '' : labelFor[type].replaceAll(' ', '_').toLowerCase() + '.pdf',
    sizeLabel: candidate.documents[type] === 'missing' ? '' : 'Stored',
    status: candidate.documents[type],
    reviewerNote: candidate.documents[type] === 'needs-review' ? 'Awaiting recruiter verification.' : undefined,
  }));

export const loadDocuments = (candidates: Candidate[]): CandidateDocument[] => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return candidates.flatMap(seedForCandidate);
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CandidateDocument[] : candidates.flatMap(seedForCandidate);
  } catch {
    return candidates.flatMap(seedForCandidate);
  }
};

export const saveDocuments = (documents: CandidateDocument[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
};

export const documentLabel = (type: DocumentType): string => labelFor[type];
