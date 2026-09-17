import type { Dispatch } from 'react';

export type SelectionTab = 'recommended' | 'selected' | 'reserve' | 'rejected';
export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'returned';
export type SelectionDecision = 'recommended' | 'selected' | 'reserve' | 'rejected';
export type SelectionHistoryAction = 'decision_changed' | 'reassigned' | 'approval_changed';

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

export interface SelectionHistoryEntry {
  candidateId: string | null;
  jobId: string;
  relatedJobId?: string;
  action: SelectionHistoryAction;
  fromDecision?: SelectionDecision | null;
  toDecision?: SelectionDecision | null;
  reason: string;
  note: string;
  occurredAt: string;
  occurredBy: string;
}

export interface SelectionScoringWeights {
  experience: number;
  skills: number;
  interview: number;
  documents: number;
  readiness: number;
  communication: number;
}

export const defaultSelectionScoringWeights: SelectionScoringWeights = {
  experience: 25,
  skills: 25,
  interview: 25,
  documents: 10,
  readiness: 10,
  communication: 5,
};

export interface SelectionState {
  loadState: 'loading' | 'error' | 'success';
  errorMessage: string | null;
  loadAttempt: number;
  jobs: SelectionJob[];
  records: SelectionRecord[];
  history: SelectionHistoryEntry[];
  scoringByJob: Record<string, SelectionScoringWeights>;
  activeJobId: string | null;
  activeTab: SelectionTab;
  selectedCandidateId: string | null;
  approvalByJob: Record<string, SelectionApproval>;
}

export type SelectionAction =
  | { type: 'HYDRATE'; jobs: SelectionJob[]; records: SelectionRecord[]; history: SelectionHistoryEntry[]; approvalByJob: Record<string, SelectionApproval>; scoringByJob: Record<string, SelectionScoringWeights> }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'RETRY_LOAD' }
  | { type: 'SET_JOB'; jobId: string }
  | { type: 'SET_TAB'; tab: SelectionTab }
  | { type: 'SELECT_CANDIDATE'; candidateId: string | null }
  | { type: 'SAVE_DECISION'; record: SelectionRecord }
  | { type: 'BULK_SAVE_DECISIONS'; records: SelectionRecord[] }
  | { type: 'REASSIGN_CANDIDATES'; candidateIds: string[]; fromJobId: string; toJobId: string; reason: string; note: string; occurredAt: string; occurredBy: string }
  | { type: 'SET_APPROVAL'; jobId: string; status: ApprovalStatus; note: string; changedAt: string; changedBy: string }
  | { type: 'SET_SCORING_WEIGHTS'; jobId: string; weights: SelectionScoringWeights };

export interface SelectionContextValue {
  state: SelectionState;
  dispatch: Dispatch<SelectionAction>;
}
