import type { JobDraft } from '../types/job';

export const validateJobDraft = (draft: JobDraft): string[] => {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push('Job title is required.');
  if (!draft.project.trim()) errors.push('Project is required.');
  if (!draft.client.trim()) errors.push('Client is required.');
  if (!draft.location.trim()) errors.push('Location is required.');
  if (!draft.profession.trim()) errors.push('Profession is required.');
  const openings = Number(draft.openings);
  if (!Number.isFinite(openings) || openings < 1) errors.push('Openings must be at least 1.');
  const experience = Number(draft.requiredExperience);
  if (!Number.isFinite(experience) || experience < 0 || experience > 50) errors.push('Minimum experience must be between 0 and 50 years.');
  if (draft.startDate && draft.deadline && draft.deadline < draft.startDate) errors.push('Deadline cannot be before the start date.');
  return errors;
};
