import type { Candidate } from '../../candidates/types/candidate';
import type { Interview } from '../../interviews/types/interview';
import type { ReportBucket, ReportFilters, ReportProfession, ReportRange, ReportSnapshot } from '../types/reports';

const parseDate = (value: string): Date | null => {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!match) return null;
  const parsed = new Date(match[2] + ' ' + match[1] + ', ' + match[3]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinRange = (value: string, range: ReportRange, now: Date): boolean => {
  if (range === 'all') return true;
  const parsed = parseDate(value);
  if (!parsed) return true;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - days);
  return parsed >= threshold && parsed <= now;
};

const rangeLabel = (range: ReportRange): string => ({
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All available data',
}[range]);

const toBuckets = (entries: Array<[string, number]>): ReportBucket[] => {
  const total = entries.reduce((sum, entry) => sum + entry[1], 0);
  return entries.map(([label, value]) => ({
    label,
    value,
    percentage: total > 0 ? Math.round((value / total) * 100) : 0,
  }));
};

export const buildReportSnapshot = (
  candidates: Candidate[],
  interviews: Interview[],
  filters: ReportFilters,
  now = new Date(),
): ReportSnapshot => {
  const filteredCandidates = candidates
    .filter((candidate) => isWithinRange(candidate.createdAt, filters.range, now))
    .filter((candidate) => filters.profession === 'all' || candidate.profession === filters.profession);

  const candidateIds = new Set(filteredCandidates.map((candidate) => candidate.id));
  const filteredInterviews = interviews.filter((interview) => candidateIds.has(interview.candidateId));
  const forwardInterviews = filteredInterviews.filter((interview) => interview.decision.decision === 'selected' || interview.decision.decision === 'reserve');

  const professions = Array.from(new Set(filteredCandidates.map((candidate) => candidate.profession))).sort();
  const professionBreakdown: ReportProfession[] = professions.map((profession) => {
    const groupCandidates = filteredCandidates.filter((candidate) => candidate.profession === profession);
    const groupInterviews = filteredInterviews.filter((interview) => interview.profession === profession);
    const groupForward = groupInterviews.filter((interview) => interview.decision.decision === 'selected' || interview.decision.decision === 'reserve');
    const groupCompleted = groupInterviews.filter((interview) => interview.status === 'completed' && interview.decision.decision !== 'pending');
    const scoreValues = groupCompleted
      .map((interview) => filteredCandidates.find((candidate) => candidate.id === interview.candidateId)?.lastInterview?.score ?? 0);
    const averageScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length)
      : 0;

    return {
      profession,
      candidates: groupCandidates.length,
      interviewed: groupInterviews.length,
      passed: groupForward.length,
      selected: groupCandidates.filter((candidate) => candidate.status === 'selected').length,
      averageScore,
    };
  }).sort((left, right) => right.candidates - left.candidates);

  const onboardingStatuses = ['not-started', 'invited', 'in-progress', 'submitted', 'needs-changes', 'completed'] as const;
  const onboardingLabels: Record<(typeof onboardingStatuses)[number], string> = {
    'not-started': 'Not started',
    invited: 'Invited',
    'in-progress': 'In progress',
    submitted: 'Submitted',
    'needs-changes': 'Needs changes',
    completed: 'Completed',
  };

  return {
    rangeLabel: rangeLabel(filters.range),
    totalCandidates: filteredCandidates.length,
    newCandidates: filteredCandidates.filter((candidate) => candidate.status === 'new').length,
    availableNow: filteredCandidates.filter((candidate) => candidate.availability === 'Available now').length,
    screened: filteredCandidates.filter((candidate) => candidate.status !== 'new').length,
    interviewed: filteredInterviews.length,
    interviewPassRate: filteredInterviews.length > 0 ? Math.round((forwardInterviews.length / filteredInterviews.length) * 100) : 0,
    selected: filteredCandidates.filter((candidate) => candidate.status === 'selected').length,
    rejected: filteredCandidates.filter((candidate) => candidate.status === 'rejected').length,
    onboardingActive: filteredCandidates.filter((candidate) => ['invited', 'in-progress', 'submitted', 'needs-changes'].includes(candidate.onboarding?.status ?? '')).length,
    documentsAttention: filteredCandidates.filter((candidate) => Object.values(candidate.documents).some((status) => status !== 'verified')).length,
    sourceBreakdown: toBuckets(Array.from(new Set(filteredCandidates.map((candidate) => candidate.source))).sort().map((source) => [source, filteredCandidates.filter((candidate) => candidate.source === source).length])),
    pipelineBreakdown: toBuckets((['new', 'screening', 'interview', 'selected', 'reserve', 'rejected'] as const).map((status) => [status.replace('-', ' '), filteredCandidates.filter((candidate) => candidate.status === status).length])),
    onboardingBreakdown: toBuckets(onboardingStatuses.map((status) => [onboardingLabels[status], filteredCandidates.filter((candidate) => candidate.onboarding?.status === status).length])),
    interviewOutcomeBreakdown: toBuckets([
      ['Pending', filteredInterviews.filter((interview) => interview.decision.decision === 'pending').length],
      ['Selected', filteredInterviews.filter((interview) => interview.decision.decision === 'selected').length],
      ['Reserve', filteredInterviews.filter((interview) => interview.decision.decision === 'reserve').length],
      ['Rejected', filteredInterviews.filter((interview) => interview.decision.decision === 'rejected').length],
    ]),
    rejectionBreakdown: toBuckets(
      Array.from(new Set(filteredCandidates.filter((candidate) => candidate.rejectionReason).map((candidate) => candidate.rejectionReason as string)))
        .sort()
        .map((reason) => [reason, filteredCandidates.filter((candidate) => candidate.rejectionReason === reason).length]),
    ),
    professionBreakdown,
  };
};

export const reportToCsv = (snapshot: ReportSnapshot): string => {
  const rows: string[][] = [
    ['Metric', 'Value'],
    ['Range', snapshot.rangeLabel],
    ['Total candidates', String(snapshot.totalCandidates)],
    ['New candidates', String(snapshot.newCandidates)],
    ['Available now', String(snapshot.availableNow)],
    ['Screened / progressed', String(snapshot.screened)],
    ['Interviews', String(snapshot.interviewed)],
    ['Interview pass rate', String(snapshot.interviewPassRate) + '%'],
    ['Selected', String(snapshot.selected)],
    ['Rejected', String(snapshot.rejected)],
    ['Active onboarding', String(snapshot.onboardingActive)],
    ['Documents needing attention', String(snapshot.documentsAttention)],
    [],
    ['Profession', 'Candidates', 'Interviews', 'Passed / forward', 'Selected', 'Average score'],
    ...snapshot.professionBreakdown.map((row) => [row.profession, String(row.candidates), String(row.interviewed), String(row.passed), String(row.selected), String(row.averageScore)]),
    [],
    ['Rejection reason', 'Count'],
    ...snapshot.rejectionBreakdown.map((row) => [row.label, String(row.value)]),
  ];

  return rows
    .map((row) => row.map((cell) => '"' + cell.replace(/"/g, '""') + '"').join(','))
    .join('\n');
};
