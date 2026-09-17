import type { Candidate } from '../../candidates/types/candidate';
import type { Interview } from '../../interviews/types/interview';
import type { DashboardPipelineItem, DashboardSnapshot } from '../types/dashboard';

const statusLabels: Record<Candidate['status'], string> = {
  new: 'New',
  screening: 'Screening',
  interview: 'Interview',
  selected: 'Selected',
  reserve: 'Reserve',
  rejected: 'Rejected',
};

const parseDate = (value: string): Date | null => {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!match) return null;
  const parsed = new Date(match[2] + ' ' + match[1] + ', ' + match[3]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const buildPipeline = (candidates: Candidate[]): DashboardPipelineItem[] => {
  const statuses: Candidate['status'][] = ['new', 'screening', 'interview', 'selected', 'reserve', 'rejected'];
  const denominator = Math.max(candidates.length, 1);
  return statuses.map((status) => {
    const count = candidates.filter((candidate) => candidate.status === status).length;
    return {
      status,
      label: statusLabels[status],
      count,
      percentage: Math.round((count / denominator) * 100),
    };
  });
};

export const buildDashboardSnapshot = (
  candidates: Candidate[],
  interviews: Interview[],
  now = new Date(),
): DashboardSnapshot => {
  const todayInterviews = interviews
    .filter((interview) => {
      const date = parseDate(interview.date);
      return date ? sameDay(date, now) : false;
    })
    .sort((left, right) => left.time.localeCompare(right.time));

  const onboardingActive = candidates.filter((candidate) =>
    ['invited', 'in-progress', 'submitted', 'needs-changes'].includes(candidate.onboarding?.status ?? ''),
  ).length;

  const documentsAttention = candidates.filter((candidate) =>
    Object.values(candidate.documents).some((status) => status !== 'verified'),
  ).length;

  const needsDecision = interviews.filter((interview) =>
    interview.decision.decision === 'pending'
    && (interview.status === 'evaluation' || interview.status === 'in-progress'),
  ).length;

  return {
    totals: {
      candidates: candidates.length,
      availableNow: candidates.filter((candidate) => candidate.availability === 'Available now').length,
      interviewsToday: todayInterviews.length,
      selected: candidates.filter((candidate) => candidate.status === 'selected').length,
      onboardingActive,
      documentsAttention,
    },
    pipeline: buildPipeline(candidates),
    actions: [
      {
        id: 'onboarding',
        title: 'Onboarding needs attention',
        description: 'Candidates waiting for completion or recruiter review.',
        count: onboardingActive,
        target: 'candidates',
      },
      {
        id: 'documents',
        title: 'Document follow-up',
        description: 'Profiles with at least one unverified document.',
        count: documentsAttention,
        target: 'candidates',
      },
      {
        id: 'interviews',
        title: 'Interviews needing a decision',
        description: 'Evaluation-stage interviews without a final decision.',
        count: needsDecision,
        target: 'interviews',
      },
    ],
    interviewLoad: {
      scheduled: interviews.filter((interview) => interview.status === 'scheduled').length,
      evaluation: interviews.filter((interview) => interview.status === 'evaluation' || interview.status === 'in-progress').length,
      completed: interviews.filter((interview) => interview.status === 'completed').length,
      needsDecision,
    },
    recentCandidates: [...candidates].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 5),
    todayInterviews,
  };
};
