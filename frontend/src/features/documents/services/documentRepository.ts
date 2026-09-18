import type { Candidate } from '../../candidates/types/candidate';
import type { CandidateDocument, CandidateDocumentVersion, DocumentType } from '../types/documents';

const STORAGE_KEY = 'buildhire.documents';

const labelFor: Record<DocumentType, string> = {
  passport: 'Passport',
  cv: 'CV / Resume',
  tradeCertificate: 'Trade certificate',
  visa: 'Visa / work permit',
};

const defaultVersion = (candidate: Candidate, type: DocumentType): CandidateDocumentVersion[] => {
  if (candidate.documents[type] === 'missing') return [];
  return [{
    version: 1,
    fileName: labelFor[type].replaceAll(' ', '_').toLowerCase() + '.pdf',
    sizeLabel: 'Stored',
    uploadedAt: candidate.createdAt,
    uploadedBy: 'Imported record',
  }];
};

const seedForCandidate = (candidate: Candidate): CandidateDocument[] =>
  (Object.keys(labelFor) as DocumentType[]).map((type) => ({
    id: candidate.id + '-' + type,
    candidateId: candidate.id,
    type,
    fileName: candidate.documents[type] === 'missing' ? '' : labelFor[type].replaceAll(' ', '_').toLowerCase() + '.pdf',
    sizeLabel: candidate.documents[type] === 'missing' ? '' : 'Stored',
    status: candidate.documents[type] ?? 'missing',
    uploadedAt: candidate.documents[type] === 'missing' ? undefined : candidate.createdAt,
    uploadedBy: candidate.documents[type] === 'missing' ? undefined : 'Imported record',
    reviewedAt: candidate.documents[type] === 'verified' ? candidate.createdAt : undefined,
    verifiedBy: candidate.documents[type] === 'verified' ? 'Imported record' : undefined,
    reviewerNote: candidate.documents[type] === 'needs-review' ? 'Awaiting recruiter verification.' : undefined,
    expiresAt: type === 'passport' ? candidate.passportExpiry : undefined,
    version: 1,
    versions: defaultVersion(candidate, type),
  }));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const asString = (value: unknown): string => typeof value === 'string' ? value : '';
const asNumber = (value: unknown, fallback = 1): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asStatus = (value: unknown): CandidateDocument['status'] => value === 'verified' || value === 'needs-review' ? value : 'missing';
const isDocumentType = (value: unknown): value is DocumentType => typeof value === 'string' && value in labelFor;

const normalizeStoredDocument = (value: unknown): CandidateDocument | null => {
  if (!isRecord(value)) return null;
  const candidateId = asString(value.candidateId);
  const type = value.type;
  if (!candidateId || !isDocumentType(type)) return null;
  const version = Math.max(1, Math.floor(asNumber(value.version)));
  const versions = Array.isArray(value.versions) ? value.versions.filter(isRecord).map((item) => ({
    version: Math.max(1, Math.floor(asNumber(item.version))),
    fileName: asString(item.fileName),
    sizeLabel: asString(item.sizeLabel),
    uploadedAt: asString(item.uploadedAt),
    uploadedBy: asString(item.uploadedBy) || 'Unknown',
  })) : [];
  return {
    id: asString(value.id) || candidateId + '-' + String(type),
    candidateId,
    type,
    fileName: asString(value.fileName),
    sizeLabel: asString(value.sizeLabel),
    status: asStatus(value.status),
    uploadedAt: asString(value.uploadedAt) || undefined,
    uploadedBy: asString(value.uploadedBy) || undefined,
    reviewedAt: asString(value.reviewedAt) || undefined,
    verifiedBy: asString(value.verifiedBy) || undefined,
    reviewerNote: asString(value.reviewerNote) || undefined,
    expiresAt: asString(value.expiresAt) || undefined,
    version,
    versions,
  };
};

export const loadDocuments = (candidates: Candidate[]): CandidateDocument[] => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return candidates.flatMap(seedForCandidate);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return candidates.flatMap(seedForCandidate);
    const stored = parsed.map(normalizeStoredDocument).filter((item): item is CandidateDocument => item !== null);
    const known = new Set(stored.map((item) => item.candidateId + ':' + item.type));
    const missing = candidates.flatMap((candidate) => seedForCandidate(candidate)).filter((item) => !known.has(item.candidateId + ':' + item.type));
    return [...stored, ...missing];
  } catch {
    return candidates.flatMap(seedForCandidate);
  }
};

export const saveDocuments = (documents: CandidateDocument[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
};

export const documentLabel = (type: DocumentType): string => labelFor[type];
