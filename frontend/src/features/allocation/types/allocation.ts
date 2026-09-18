import type { Candidate } from '../../candidates/types/candidate';
import type { SelectionJob } from '../../selection/types/selection';

export interface AllocationRow {
  candidate: Candidate;
  selected: boolean;
  matchingJobs: SelectionJob[];
  alreadyInTarget: boolean;
  reason: string;
}
