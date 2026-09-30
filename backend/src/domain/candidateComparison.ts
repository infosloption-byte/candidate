/**
 * Cross-candidate comparison for a single job.
 *
 * Every interview snapshots its own criteria (InterviewCriterionAssignment), so raw
 * points are NOT comparable between candidates. Everything here is normalised to a
 * percentage of the maximum points available in that interview.
 *
 * Only COMPLETED interviews (all panelists submitted) are ranked, so a candidate is
 * never ranked on a partial panel.
 */

export interface ComparisonAssignment {
  criterionId: string;
  maxPoints: number;
  responseType: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
}

export interface ComparisonEvaluation {
  interviewerId: string;
  status: 'DRAFT' | 'SUBMITTED';
  interviewer: { id: string; name: string } | null;
  scores: Array<{ criterionId: string; points: number }>;
}

export interface ComparisonInterview {
  id: string;
  candidateId: string;
  type: string;
  status: string;
  scheduledAt: Date | string;
  panelSize: number;
  criterionAssignments: ComparisonAssignment[];
  evaluations: ComparisonEvaluation[];
}

export interface ComparisonCandidate {
  id: string;
  name: string;
  reference: string;
  requestedProfession: string;
  agencyId: string;
  poolStatus: string;
}

export interface GroupScore {
  groupId: string;
  groupName: string;
  percentage: number;
}

export interface InterviewScoreSummary {
  interviewId: string;
  type: string;
  scheduledAt: string;
  percentage: number;
  submittedInterviewers: number;
  requiredInterviewers: number;
  interviewerTotals: Array<{ interviewerId: string; name: string; percentage: number }>;
}

export interface CandidateComparisonRow {
  rank: number | null;
  /** True when the candidate's rank falls inside the position's required headcount. */
  withinOpenings: boolean;
  candidateId: string;
  name: string;
  reference: string;
  requestedProfession: string;
  agencyId: string;
  poolStatus: string;
  averagePercentage: number | null;
  scoredInterviews: number;
  pendingInterviews: number;
  groupScores: GroupScore[];
  interviews: InterviewScoreSummary[];
}

export interface PositionComparison {
  groups: Array<{ groupId: string; groupName: string }>;
  rows: CandidateComparisonRow[];
}

export interface ComparisonPosition {
  id: string;
  position: string;
  requiredCount: number;
}

/** One ranked table per position. positionId is null for the "unmatched profession" bucket. */
export interface PositionSection extends PositionComparison {
  positionId: string | null;
  position: string;
  requiredCount: number | null;
}

export interface JobComparison {
  sections: PositionSection[];
}

export const NO_GROUP_ID = '__ungrouped__';

const round2 = (value: number): number => Math.round(value * 100) / 100;
const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Only SCORE criteria carry points; TEXT / SELECT / BOOLEAN criteria are ignored. */
const scoredAssignments = (interview: ComparisonInterview): ComparisonAssignment[] =>
  interview.criterionAssignments.filter((item) => item.responseType === 'SCORE' && item.maxPoints > 0);

const evaluationPoints = (evaluation: ComparisonEvaluation, allowed: Set<string>): number =>
  evaluation.scores.reduce((sum, score) => sum + (allowed.has(score.criterionId) ? score.points : 0), 0);

export const summarizeInterview = (
  interview: ComparisonInterview,
): { summary: InterviewScoreSummary; groupPercentages: Map<string, { name: string; values: number[] }> } | null => {
  const assignments = scoredAssignments(interview);
  const maxPoints = assignments.reduce((sum, item) => sum + item.maxPoints, 0);
  const submitted = interview.evaluations.filter((item) => item.status === 'SUBMITTED');
  if (!maxPoints || !submitted.length) return null;

  const allowed = new Set(assignments.map((item) => item.criterionId));
  const interviewerTotals = submitted.map((evaluation) => ({
    interviewerId: evaluation.interviewerId,
    name: evaluation.interviewer?.name ?? 'Interviewer',
    percentage: round2((evaluationPoints(evaluation, allowed) / maxPoints) * 100),
  }));

  // Per-group percentage, averaged over panelists.
  const groupPercentages = new Map<string, { name: string; values: number[] }>();
  const groupBuckets = new Map<string, { name: string; criterionIds: Set<string>; max: number }>();
  for (const assignment of assignments) {
    const id = assignment.group?.id ?? assignment.groupId ?? NO_GROUP_ID;
    const bucket = groupBuckets.get(id) ?? { name: assignment.group?.name ?? 'General', criterionIds: new Set<string>(), max: 0 };
    bucket.criterionIds.add(assignment.criterionId);
    bucket.max += assignment.maxPoints;
    groupBuckets.set(id, bucket);
  }
  for (const [groupId, bucket] of groupBuckets) {
    const values = submitted.map((evaluation) => (evaluationPoints(evaluation, bucket.criterionIds) / bucket.max) * 100);
    groupPercentages.set(groupId, { name: bucket.name, values: [mean(values)] });
  }

  return {
    summary: {
      interviewId: interview.id,
      type: interview.type,
      scheduledAt: new Date(interview.scheduledAt).toISOString(),
      percentage: round2(mean(interviewerTotals.map((item) => item.percentage))),
      submittedInterviewers: submitted.length,
      requiredInterviewers: interview.panelSize,
      interviewerTotals,
    },
    groupPercentages,
  };
};

/** Ranks candidates against each other. Callers must only pass candidates for ONE position. */
export const buildPositionComparison = (
  candidates: ComparisonCandidate[],
  interviews: ComparisonInterview[],
): PositionComparison => {
  const groupOrder = new Map<string, string>();

  const rows: CandidateComparisonRow[] = candidates.map((candidate) => {
    const candidateInterviews = interviews.filter((item) => item.candidateId === candidate.id && item.status !== 'CANCELLED');
    const completed = candidateInterviews.filter((item) => item.status === 'COMPLETED');
    const summaries = completed
      .map(summarizeInterview)
      .filter((item): item is NonNullable<ReturnType<typeof summarizeInterview>> => item !== null);

    const groupAccumulator = new Map<string, { name: string; values: number[] }>();
    for (const item of summaries) {
      for (const [groupId, group] of item.groupPercentages) {
        groupOrder.set(groupId, group.name);
        const bucket = groupAccumulator.get(groupId) ?? { name: group.name, values: [] };
        bucket.values.push(...group.values);
        groupAccumulator.set(groupId, bucket);
      }
    }

    return {
      rank: null,
      withinOpenings: false,
      candidateId: candidate.id,
      name: candidate.name,
      reference: candidate.reference,
      requestedProfession: candidate.requestedProfession,
      agencyId: candidate.agencyId,
      poolStatus: candidate.poolStatus,
      averagePercentage: summaries.length ? round2(mean(summaries.map((item) => item.summary.percentage))) : null,
      scoredInterviews: summaries.length,
      pendingInterviews: candidateInterviews.length - summaries.length,
      groupScores: [...groupAccumulator].map(([groupId, group]) => ({
        groupId,
        groupName: group.name,
        percentage: round2(mean(group.values)),
      })),
      interviews: summaries.map((item) => item.summary),
    };
  });

  // Standard competition ranking (1,2,2,4): ties share a rank. Unscored candidates are unranked.
  const scored = rows
    .filter((row) => row.averagePercentage !== null)
    .sort((a, b) => (b.averagePercentage as number) - (a.averagePercentage as number) || a.name.localeCompare(b.name));
  scored.forEach((row, index) => {
    const previous = scored[index - 1];
    row.rank = previous && previous.averagePercentage === row.averagePercentage ? (previous.rank as number) : index + 1;
  });

  const unscored = rows.filter((row) => row.averagePercentage === null).sort((a, b) => a.name.localeCompare(b.name));

  return {
    groups: [...groupOrder].map(([groupId, groupName]) => ({ groupId, groupName })),
    rows: [...scored, ...unscored],
  };
};

/** Case/spacing-insensitive key so "Welder ", "welder" and "WELDER" match the same position. */
export const normalizePosition = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Splits the job pool into one comparison per position.
 *
 * Candidates carry a free-text requestedProfession (there is no FK to JobPosition), so they are
 * matched to a position by normalised name. Candidates that match no position land in a trailing
 * "unmatched" section instead of being silently dropped. Jobs with 0 or 1 positions have nothing
 * to disambiguate, so every candidate goes into a single section.
 */
export const buildJobComparison = (
  jobTitle: string,
  positions: ComparisonPosition[],
  candidates: ComparisonCandidate[],
  interviews: ComparisonInterview[],
): JobComparison => {
  const finish = (
    base: { positionId: string | null; position: string; requiredCount: number | null },
    pool: ComparisonCandidate[],
  ): PositionSection => {
    const ids = new Set(pool.map((item) => item.id));
    const comparison = buildPositionComparison(pool, interviews.filter((item) => ids.has(item.candidateId)));
    if (base.requiredCount !== null) {
      for (const row of comparison.rows) row.withinOpenings = row.rank !== null && row.rank <= (base.requiredCount as number);
    }
    return { ...base, ...comparison };
  };

  if (positions.length <= 1) {
    const only = positions[0];
    return {
      sections: [finish({ positionId: only?.id ?? null, position: only?.position ?? jobTitle, requiredCount: only?.requiredCount ?? null }, candidates)],
    };
  }

  const byPosition = new Map<string, ComparisonCandidate[]>(positions.map((item) => [item.id, []]));
  const keyToId = new Map<string, string>();
  for (const item of positions) {
    const key = normalizePosition(item.position);
    if (!keyToId.has(key)) keyToId.set(key, item.id);
  }
  const unmatched: ComparisonCandidate[] = [];
  for (const candidate of candidates) {
    const id = keyToId.get(normalizePosition(candidate.requestedProfession));
    if (id) byPosition.get(id)!.push(candidate);
    else unmatched.push(candidate);
  }

  const sections = positions.map((item) =>
    finish({ positionId: item.id, position: item.position, requiredCount: item.requiredCount }, byPosition.get(item.id)!),
  );
  if (unmatched.length) sections.push(finish({ positionId: null, position: 'Other / profession not matched', requiredCount: null }, unmatched));
  return { sections };
};
