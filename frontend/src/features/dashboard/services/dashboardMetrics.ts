import type { Candidate } from '../../candidates/types/candidate';
import type { Interview } from '../../interviews/types/interview';
import type { SelectionJob, SelectionRecord, SelectionApproval } from '../../selection/types/selection';
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

const formatToday = (value: Date): string =>
  value.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const buildDashboardSnapshot = (
  candidates: Candidate[],
  interviews: Interview[],
  selectionJobs: SelectionJob[],
  selectionRecords: SelectionRecord[],
  approvalByJob: Record<string, SelectionApproval>,
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

  const onboardingNeedsChanges = candidates.filter(
    (candidate) => candidate.onboarding?.status === 'needs-changes',
  ).length;

  const documentsAttention = candidates.filter((candidate) =>
    Object.values(candidate.documents).some((status) => status !== 'verified'),
  ).length;

  const needsDecision = interviews.filter((interview) =>
    interview.decision.decision === 'pending'
    && (interview.status === 'evaluation' || interview.status === 'in-progress'),
  ).length;

  const selected = selectionRecords.filter((record) => record.decision === 'selected').length;
  const openings = selectionJobs.reduce((sum, job) => sum + job.openings, 0);
  const approvalsPending = Object.values(approvalByJob).filter((approval) => approval.status === 'pending').length;

  return {
    todayLabel: formatToday(now),
    totals: {
      candidates: candidates.length,
      availableNow: candidates.filter((candidate) => candidate.availability === 'Available now').length,
      interviewsToday: todayInterviews.length,
      selected: candidates.filter((candidate) => candidate.status === 'selected').length,
      onboardingActive,
      onboardingNeedsChanges,
      documentsAttention,
    },
    pipeline: buildPipeline(candidates),
    actions: [
      {
        id: 'onboarding',
        title: 'Onboarding follow-up',
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
        title: 'Interview decisions',
        description: 'Evaluation-stage interviews without a final decision.',
        count: needsDecision,
        target: 'interviews',
      },
      {
        id: 'approval',
        title: 'Selection approvals',
        description: 'Jobs currently waiting for management approval.',
        count: approvalsPending,
        target: 'selection',
      },
    ],
    interviewLoad: {
      scheduled: interviews.filter((interview) => interview.status === 'scheduled').length,
      evaluation: interviews.filter((interview) => interview.status === 'evaluation' || interview.status === 'in-progress').length,
      completed: interviews.filter((interview) => interview.status === 'completed').length,
      needsDecision,
    },
    selection: {
      openings,
      selected,
      remaining: Math.max(openings - selected, 0),
      approvalsPending,
    },
    recentCandidates: [...candidates].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 5),
    todayInterviews,
  };
};
