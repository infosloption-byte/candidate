import type { CandidateDocumentSummary } from '../../candidates/types/candidate';

export type DocumentType = keyof CandidateDocumentSummary;

export interface CandidateDocumentVersion {
  version: number;
  fileName: string;
  sizeLabel: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface CandidateDocument {
  id: string;
  candidateId: string;
  type: DocumentType;
  fileName: string;
  sizeLabel: string;
  status: 'needs-review' | 'verified' | 'missing';
  uploadedAt?: string;
  uploadedBy?: string;
  reviewedAt?: string;
  verifiedBy?: string;
  reviewerNote?: string;
  expiresAt?: string;
  version: number;
  versions: CandidateDocumentVersion[];
}
