import type { Candidate } from '../../candidates/types/candidate';

export type ReportRange = '7d' | '30d' | '90d' | 'all';

export interface ReportBucket {
  label: string;
  value: number;
  percentage: number;
}

export interface ReportProfession {
  profession: string;
  candidates: number;
  interviews: number;
  forwardDecisions: number;
  selected: number;
  averageScore: number;
}

export interface ReportSnapshot {
  rangeLabel: string;
  scopeNote: string;
  totalCandidates: number;
  newCandidates: number;
  availableNow: number;
  progressedCandidates: number;
  interviewed: number;
  interviewCoverage: number;
  interviewPassRate: number;
  selected: number;
  rejected: number;
  onboardingActive: number;
  onboardingCompleted: number;
  onboardingCompletionRate: number;
  documentsReady: number;
  documentsAttention: number;
  sourceBreakdown: ReportBucket[];
  pipelineBreakdown: ReportBucket[];
  onboardingBreakdown: ReportBucket[];
  interviewOutcomeBreakdown: ReportBucket[];
  rejectionBreakdown: ReportBucket[];
  professionBreakdown: ReportProfession[];
}

export interface ReportFilters {
  range: ReportRange;
  profession: Candidate['profession'] | 'all';
}
