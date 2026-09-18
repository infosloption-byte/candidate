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
  threshold.setHours(0, 0, 0, 0);
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

const candidateDocumentReady = (candidate: Candidate): boolean =>
  Object.values(candidate.documents).every((status) => status === 'verified');

const currentInterviewScore = (candidate: Candidate): number =>
  typeof candidate.lastInterview?.score === 'number' ? candidate.lastInterview.score : 0;

export const buildReportSnapshot = (
  candidates: Candidate[],
  interviews: Interview[],
  filters: ReportFilters,
  now = new Date(),
): ReportSnapshot => {
  const filteredCandidates = candidates
    .filter((candidate) => isWithinRange(candidate.createdAt, filters.range, now))
    .filter((candidate) => filters.profession === 'all' || candidate.profession === filters.profession);

  const filteredCandidateIds = new Set(filteredCandidates.map((candidate) => candidate.id));
  const filteredInterviews = interviews
    .filter((interview) => isWithinRange(interview.date, filters.range, now))
    .filter((interview) => filteredCandidateIds.has(interview.candidateId))
    .filter((interview) => filters.profession === 'all' || interview.profession === filters.profession);

  const forwardInterviews = filteredInterviews.filter((interview) =>
    interview.decision.decision === 'selected' || interview.decision.decision === 'reserve',
  );

  const professions = Array.from(new Set(filteredCandidates.map((candidate) => candidate.profession))).sort();
  const professionBreakdown: ReportProfession[] = professions.map((profession) => {
    const groupCandidates = filteredCandidates.filter((candidate) => candidate.profession === profession);
    const groupInterviews = filteredInterviews.filter((interview) => interview.profession === profession);
    const groupForward = groupInterviews.filter((interview) =>
      interview.decision.decision === 'selected' || interview.decision.decision === 'reserve',
    );
    const scoreValues = groupCandidates
      .filter((candidate) => groupInterviews.some((interview) => interview.candidateId === candidate.id))
      .map(currentInterviewScore)
      .filter((score) => score > 0);

    return {
      profession,
      candidates: groupCandidates.length,
      interviews: groupInterviews.length,
      forwardDecisions: groupForward.length,
      selected: groupCandidates.filter((candidate) => candidate.status === 'selected').length,
      averageScore: scoreValues.length > 0
        ? Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length)
        : 0,
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

  const onboardingCompleted = filteredCandidates.filter(
    (candidate) => candidate.onboarding?.status === 'completed',
  ).length;

  const documentsReady = filteredCandidates.filter(candidateDocumentReady).length;

  return {
    rangeLabel: rangeLabel(filters.range),
    scopeNote: 'Candidate metrics use candidate creation date; interview metrics use interview date within the same candidate cohort.',
    totalCandidates: filteredCandidates.length,
    newCandidates: filteredCandidates.filter((candidate) => candidate.status === 'new').length,
    availableNow: filteredCandidates.filter((candidate) => candidate.availability === 'Available now').length,
    progressedCandidates: filteredCandidates.filter((candidate) => candidate.status !== 'new').length,
    interviewed: filteredInterviews.length,
    interviewCoverage: filteredCandidates.length > 0 ? Math.round((filteredInterviews.length / filteredCandidates.length) * 100) : 0,
    interviewPassRate: filteredInterviews.length > 0 ? Math.round((forwardInterviews.length / filteredInterviews.length) * 100) : 0,
    selected: filteredCandidates.filter((candidate) => candidate.status === 'selected').length,
    rejected: filteredCandidates.filter((candidate) => candidate.status === 'rejected').length,
    onboardingActive: filteredCandidates.filter((candidate) => ['invited', 'in-progress', 'submitted', 'needs-changes'].includes(candidate.onboarding?.status ?? '')).length,
    onboardingCompleted,
    onboardingCompletionRate: filteredCandidates.length > 0 ? Math.round((onboardingCompleted / filteredCandidates.length) * 100) : 0,
    documentsReady,
    documentsAttention: filteredCandidates.length - documentsReady,
    sourceBreakdown: toBuckets(
      Array.from(new Set(filteredCandidates.map((candidate) => candidate.source))).sort()
        .map((source) => [source, filteredCandidates.filter((candidate) => candidate.source === source).length]),
    ),
    pipelineBreakdown: toBuckets(
      (['new', 'screening', 'interview', 'selected', 'reserve', 'rejected'] as const)
        .map((status) => [status.replace('-', ' '), filteredCandidates.filter((candidate) => candidate.status === status).length]),
    ),
    onboardingBreakdown: toBuckets(
      onboardingStatuses.map((status) => [onboardingLabels[status], filteredCandidates.filter((candidate) => candidate.onboarding?.status === status).length]),
    ),
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
    ['Scope', snapshot.scopeNote],
    ['Total candidates', String(snapshot.totalCandidates)],
    ['New candidates', String(snapshot.newCandidates)],
    ['Available now', String(snapshot.availableNow)],
    ['Progressed beyond New', String(snapshot.progressedCandidates)],
    ['Interviews in range', String(snapshot.interviewed)],
    ['Interview coverage', String(snapshot.interviewCoverage) + '%'],
    ['Interview pass / forward rate', String(snapshot.interviewPassRate) + '%'],
    ['Selected', String(snapshot.selected)],
    ['Rejected', String(snapshot.rejected)],
    ['Active onboarding', String(snapshot.onboardingActive)],
    ['Onboarding completed', String(snapshot.onboardingCompleted)],
    ['Onboarding completion rate', String(snapshot.onboardingCompletionRate) + '%'],
    ['Documents ready', String(snapshot.documentsReady)],
    ['Documents needing attention', String(snapshot.documentsAttention)],
    [],
    ['Profession', 'Candidates', 'Interviews', 'Passed / forward', 'Selected', 'Average score'],
    ...snapshot.professionBreakdown.map((row) => [
      row.profession,
      String(row.candidates),
      String(row.interviews),
      String(row.forwardDecisions),
      String(row.selected),
      row.averageScore > 0 ? String(row.averageScore) + '%' : '',
    ]),
    [],
    ['Rejection reason', 'Count'],
    ...snapshot.rejectionBreakdown.map((row) => [row.label, String(row.value)]),
  ];

  return rows
    .map((row) => row.map((cell) => '"' + cell.replace(/"/g, '""') + '"').join(','))
    .join('\n');
};
