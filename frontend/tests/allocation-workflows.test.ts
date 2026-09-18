import { describe, expect, it } from 'vitest';
import { buildAllocationRows } from '../src/features/allocation/services/allocationService';
import type { SelectionJob, SelectionRecord } from '../src/features/selection/types/selection';
import { makeCandidate } from './fixtures';

describe('allocation workflow', () => {
  const job: SelectionJob = {
    id: 'job-dubai-mason',
    title: 'Mason — Dubai Tower Project',
    project: 'Dubai Tower Project',
    location: 'Dubai, UAE',
    openings: 2,
    profession: 'Mason',
    requiredExperience: 5,
    requiredSkills: ['Tile', 'Putty'],
    client: 'Gulf Build Contracting',
    status: 'open',
    preferredSkills: ['Plaster'],
  };

  const records: SelectionRecord[] = [];

  it('returns only non-rejected candidates that match the target job', () => {
    const matching = makeCandidate({
      id: 'candidate-match',
      profession: 'Mason',
      experienceYears: 7,
      secondarySkills: ['Tile'],
    });
    const rejected = makeCandidate({
      id: 'candidate-rejected',
      status: 'rejected',
      secondarySkills: ['Tile'],
    });
    const wrongProfession = makeCandidate({
      id: 'candidate-wrong',
      profession: 'Welder',
      secondarySkills: ['Tile'],
    });

    const rows = buildAllocationRows([matching, rejected, wrongProfession], [job], records, job.id);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.candidate.id).toBe(matching.id);
    expect(rows[0]?.alreadyInTarget).toBe(false);
  });

  it('marks candidates already allocated to the target job', () => {
    const candidate = makeCandidate({ id: 'candidate-match' });
    const allocated: SelectionRecord = {
      candidateId: candidate.id,
      jobId: job.id,
      decision: 'selected',
      reason: 'Meets project requirement',
      note: 'Allocated for project.',
      decidedAt: '18 Sep 2026 09:00',
      decidedBy: 'Recruitment team',
    };

    const rows = buildAllocationRows([candidate], [job], [allocated], job.id);

    expect(rows[0]?.alreadyInTarget).toBe(true);
    expect(rows[0]?.reason).toBe('Matches the current job requirement');
  });
});
