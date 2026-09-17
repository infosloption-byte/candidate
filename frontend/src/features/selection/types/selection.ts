import type { Dispatch } from 'react';

export type SelectionTab = 'recommended' | 'selected' | 'reserve' | 'rejected';
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'returned';
export type SelectionDecision = 'recommended' | 'selected' | 'reserve' | 'rejected';

export interface SelectionJob {
  id: string;
  title: string;
  project: string;
  location: string;
  openings: number;
  profession: string;
  requiredExperience: number;
  requiredSkills: string[];
  client: string;
}

export interface SelectionRecord {
  candidateId: string;
  jobId: string;
  decision: SelectionDecision;
  reason: string;
  note: string;
  decidedAt: string;
  decidedBy: string;
}

export interface SelectionApproval {
  status: ApprovalStatus;
  note: string;
}

export interface SelectionState {
  loadState: 'loading' | 'error' | 'success';
  errorMessage: string | null;
  loadAttempt: number;
  jobs: SelectionJob[];
  records: SelectionRecord[];
  activeJobId: string | null;
  activeTab: SelectionTab;
  selectedCandidateId: string | null;
  approvalByJob: Record<string, SelectionApproval>;
}

export type SelectionAction =
  | { type: 'HYDRATE'; jobs: SelectionJob[]; records: SelectionRecord[]; approvalByJob: Record<string, SelectionApproval> }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'RETRY_LOAD' }
  | { type: 'SET_JOB'; jobId: string }
  | { type: 'SET_TAB'; tab: SelectionTab }
  | { type: 'SELECT_CANDIDATE'; candidateId: string | null }
  | { type: 'SAVE_DECISION'; record: SelectionRecord }
  | { type: 'SET_APPROVAL'; jobId: string; status: ApprovalStatus; note: string };

export interface SelectionContextValue {
  state: SelectionState;
  dispatch: Dispatch<SelectionAction>;
}
