import type { SelectionJob } from '../../selection/types/selection';

export interface JobDraft {
  title: string;
  project: string;
  location: string;
  client: string;
  profession: string;
  openings: string;
  requiredExperience: string;
  requiredSkills: string;
  preferredSkills: string;
  startDate: string;
  deadline: string;
  status: NonNullable<SelectionJob['status']>;
}
