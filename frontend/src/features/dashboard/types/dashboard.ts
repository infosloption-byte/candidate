import type { Candidate } from '../../candidates/types/candidate';
import type { Interview } from '../../interviews/types/interview';

export interface DashboardPipelineItem {
  status: Candidate['status'];
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardAction {
  id: string;
  title: string;
  description: string;
  count: number;
  target: 'candidates' | 'interviews' | 'selection' | 'reports';
}

export interface DashboardSnapshot {
  totals: {
    candidates: number;
    availableNow: number;
    interviewsToday: number;
    selected: number;
    onboardingActive: number;
    documentsAttention: number;
  };
  pipeline: DashboardPipelineItem[];
  actions: DashboardAction[];
  interviewLoad: {
    scheduled: number;
    evaluation: number;
    completed: number;
    needsDecision: number;
  };
  recentCandidates: Candidate[];
  todayInterviews: Interview[];
}
