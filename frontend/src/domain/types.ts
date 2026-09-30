export interface CandidateComparisonGroupScore {
  groupId: string;
  groupName: string;
  percentage: number;
}

export interface CandidateComparisonInterview {
  interviewId: string;
  type: InterviewType;
  scheduledAt: string;
  percentage: number;
  submittedInterviewers: number;
  requiredInterviewers: number;
  interviewerTotals: Array<{ interviewerId: string; name: string; percentage: number }>;
}

export interface CandidateComparisonRow {
  rank: number | null;
  withinOpenings: boolean;
  candidateId: string;
  name: string;
  reference: string;
  requestedProfession: string;
  agencyId: string;
  poolStatus: JobCandidateStatus;
  averagePercentage: number | null;
  scoredInterviews: number;
  pendingInterviews: number;
  groupScores: CandidateComparisonGroupScore[];
  interviews: CandidateComparisonInterview[];
}

export interface PositionComparisonSection {
  positionId: string | null;
  position: string;
  requiredCount: number | null;
  groups: Array<{ groupId: string; groupName: string }>;
  rows: CandidateComparisonRow[];
}

export interface JobComparison {
  sections: PositionComparisonSection[];
}
