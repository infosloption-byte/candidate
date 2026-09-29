import assert from 'node:assert/strict';
import test from 'node:test';
import { buildJobComparison, type ComparisonCandidate, type ComparisonInterview } from './candidateComparison.js';

const candidate = (id: string, name: string): ComparisonCandidate => ({
  id, name, reference: 'CA-' + id, requestedProfession: 'Welder', agencyId: 'agency-1', poolStatus: 'INTERVIEW_COMPLETED',
});

const groupA = { id: 'g-skills', name: 'Skills' };
const groupB = { id: 'g-personal', name: 'Personal' };

const interview = (
  id: string,
  candidateId: string,
  evaluations: Array<{ interviewerId: string; skills: number; personal: number }>,
  overrides: Partial<ComparisonInterview> = {},
  maxSkills = 10,
): ComparisonInterview => ({
  id,
  candidateId,
  type: 'TECHNICAL',
  status: 'COMPLETED',
  scheduledAt: '2026-09-01T09:00:00.000Z',
  panelSize: evaluations.length,
  criterionAssignments: [
    { criterionId: 'c-skills', maxPoints: maxSkills, responseType: 'SCORE', groupId: groupA.id, group: groupA },
    { criterionId: 'c-personal', maxPoints: 10, responseType: 'SCORE', groupId: groupB.id, group: groupB },
    { criterionId: 'c-notes', maxPoints: 0, responseType: 'TEXT', groupId: groupB.id, group: groupB },
  ],
  evaluations: evaluations.map((item) => ({
    interviewerId: item.interviewerId,
    status: 'SUBMITTED' as const,
    interviewer: { id: item.interviewerId, name: 'Panelist ' + item.interviewerId },
    scores: [
      { criterionId: 'c-skills', points: item.skills },
      { criterionId: 'c-personal', points: item.personal },
    ],
  })),
  ...overrides,
});

test('candidates are ranked by average percentage across the panel', () => {
  const result = buildJobComparison(
    [candidate('a', 'Alice'), candidate('b', 'Bob')],
    [
      interview('i1', 'a', [{ interviewerId: 'p1', skills: 10, personal: 10 }, { interviewerId: 'p2', skills: 8, personal: 8 }]),
      interview('i2', 'b', [{ interviewerId: 'p1', skills: 5, personal: 5 }, { interviewerId: 'p2', skills: 7, personal: 7 }]),
    ],
  );
  assert.deepEqual(result.rows.map((row) => [row.name, row.rank, row.averagePercentage]), [['Alice', 1, 90], ['Bob', 2, 60]]);
  assert.equal(result.rows[0].interviews[0].interviewerTotals.length, 2);
});

test('scores are normalised so interviews with different criteria stay comparable', () => {
  const result = buildJobComparison(
    [candidate('a', 'Alice'), candidate('b', 'Bob')],
    [
      // Alice: 20/20 on a 20-point form = 100%
      interview('i1', 'a', [{ interviewerId: 'p1', skills: 10, personal: 10 }]),
      // Bob: 25/30 on a 30-point form (skills out of 20) = 83.33%
      interview('i2', 'b', [{ interviewerId: 'p1', skills: 15, personal: 10 }], {}, 20),
    ],
  );
  assert.equal(result.rows[0].averagePercentage, 100);
  assert.equal(result.rows[1].averagePercentage, 83.33);
});

test('ties share a rank and unscored candidates are listed last without a rank', () => {
  const result = buildJobComparison(
    [candidate('a', 'Alice'), candidate('b', 'Bob'), candidate('c', 'Cara'), candidate('d', 'Dan')],
    [
      interview('i1', 'a', [{ interviewerId: 'p1', skills: 8, personal: 8 }]),
      interview('i2', 'b', [{ interviewerId: 'p1', skills: 8, personal: 8 }]),
      interview('i3', 'c', [{ interviewerId: 'p1', skills: 5, personal: 5 }]),
      interview('i4', 'd', [{ interviewerId: 'p1', skills: 9, personal: 9 }], { status: 'SCHEDULED', evaluations: [] }),
    ],
  );
  assert.deepEqual(result.rows.map((row) => [row.name, row.rank]), [['Alice', 1], ['Bob', 1], ['Cara', 3], ['Dan', null]]);
  assert.equal(result.rows[3].pendingInterviews, 1);
});

test('only COMPLETED interviews are ranked and cancelled ones are ignored', () => {
  const result = buildJobComparison(
    [candidate('a', 'Alice')],
    [
      interview('i1', 'a', [{ interviewerId: 'p1', skills: 10, personal: 10 }], { status: 'IN_PROGRESS' }),
      interview('i2', 'a', [{ interviewerId: 'p1', skills: 0, personal: 0 }], { status: 'CANCELLED' }),
    ],
  );
  assert.equal(result.rows[0].averagePercentage, null);
  assert.equal(result.rows[0].pendingInterviews, 1);
});

test('multiple completed interviews are averaged and group scores are reported', () => {
  const result = buildJobComparison(
    [candidate('a', 'Alice')],
    [
      interview('i1', 'a', [{ interviewerId: 'p1', skills: 10, personal: 6 }]),
      interview('i2', 'a', [{ interviewerId: 'p1', skills: 6, personal: 10 }]),
    ],
  );
  const row = result.rows[0];
  assert.equal(row.scoredInterviews, 2);
  assert.equal(row.averagePercentage, 80);
  assert.deepEqual(row.groupScores.map((item) => [item.groupName, item.percentage]).sort(), [['Personal', 80], ['Skills', 80]]);
  assert.deepEqual(result.groups.map((item) => item.groupName).sort(), ['Personal', 'Skills']);
});
