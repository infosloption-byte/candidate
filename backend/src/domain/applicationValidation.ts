import type { ApplicationStatus } from '../generated/prisma/enums.js';

const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: ['SCREENING', 'WITHDRAWN'],
  SCREENING: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: [],
  SELECTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export const canTransitionApplication = (
  current: ApplicationStatus,
  next: ApplicationStatus,
): boolean => current === next || transitions[current].includes(next);

export const validateApplicationStatus = (
  current: ApplicationStatus,
  next: ApplicationStatus,
): string | null => {
  if (!canTransitionApplication(current, next)) {
    return `Application cannot move from ${current} to ${next}. Final interview decisions must be recorded through the evaluation workflow.`;
  }

  return null;
};
