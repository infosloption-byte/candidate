import type { Candidate } from '../../candidates/types/candidate';
import type { SelectionJob, SelectionRecord } from '../../selection/types/selection';
import type { AllocationRow } from '../types/allocation';

const matchesProfession = (candidate: Candidate, job: SelectionJob): boolean => {
  const left = candidate.profession.toLowerCase();
  const right = job.profession.toLowerCase();
  return left === right || left.includes(right) || right.includes(left);
};

const matchesSkills = (candidate: Candidate, job: SelectionJob): boolean => {
  if (job.requiredSkills.length === 0) return true;
  const skills = new Set(candidate.secondarySkills.map((value) => value.toLowerCase()));
  return job.requiredSkills.some((skill) => skills.has(skill.toLowerCase()));
};

export const buildAllocationRows = (
  candidates: Candidate[],
  jobs: SelectionJob[],
  records: SelectionRecord[],
  targetJobId: string,
): AllocationRow[] => {
  const target = jobs.find((job) => job.id === targetJobId);
  if (!target) return [];
  return candidates
    .filter((candidate) => candidate.status !== 'rejected')
    .map((candidate) => {
      const matchingJobs = jobs.filter((job) => (job.status ?? 'open') === 'open' && matchesProfession(candidate, job) && matchesSkills(candidate, job));
      const alreadyInTarget = records.some((record) => record.candidateId === candidate.id && record.jobId === targetJobId);
      const reasons: string[] = [];
      if (!matchesProfession(candidate, target)) reasons.push('Different profession');
      if (!matchesSkills(candidate, target)) reasons.push('Required skills need review');
      if (candidate.experienceYears < target.requiredExperience) reasons.push('Below minimum experience');
      if (candidate.locationReady === false) reasons.push('Relocation readiness not confirmed');
      return { candidate, selected: false, matchingJobs, alreadyInTarget, reason: reasons.length > 0 ? reasons.join(' · ') : 'Matches the current job requirement' };
    })
    .filter((row) => row.matchingJobs.some((job) => job.id === targetJobId));
};
