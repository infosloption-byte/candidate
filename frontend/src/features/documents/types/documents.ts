import type { CandidateDocumentSummary } from '../../candidates/types/candidate';

export type DocumentType = keyof CandidateDocumentSummary;

export interface CandidateDocument {
  id: string;
  candidateId: string;
  type: DocumentType;
  fileName: string;
  sizeLabel: string;
  status: 'needs-review' | 'verified' | 'missing';
  uploadedAt?: string;
  reviewedAt?: string;
  reviewerNote?: string;
}
