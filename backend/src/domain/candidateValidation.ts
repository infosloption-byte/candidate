export interface CandidateInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
  experienceYears?: number | null;
  skills?: string[];
  onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
  source?: 'AGENCY_ADDED' | 'SELF_ONBOARDED' | 'BULK_IMPORTED';
  agencyId?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateCandidateInput = (
  input: CandidateInput,
  mode: 'create' | 'update' | 'self',
): string[] => {
  const errors: string[] = [];

  if ((mode === 'create' || mode === 'self') && !input.name?.trim()) {
    errors.push('Candidate name is required.');
  }
  if (input.name !== undefined && input.name.trim().length < 2) {
    errors.push('Candidate name must be at least 2 characters.');
  }
  if (input.email && !emailPattern.test(input.email.trim())) {
    errors.push('Candidate email is invalid.');
  }
  if (
    input.experienceYears !== undefined
    && input.experienceYears !== null
    && (!Number.isInteger(input.experienceYears) || input.experienceYears < 0 || input.experienceYears > 60)
  ) {
    errors.push('Experience years must be a whole number between 0 and 60.');
  }
  if (input.skills !== undefined && (
    !Array.isArray(input.skills)
    || input.skills.length > 30
    || input.skills.some((skill) => typeof skill !== 'string' || skill.trim().length === 0 || skill.trim().length > 80)
  )) {
    errors.push('Skills must contain at most 30 non-empty values.');
  }
  if (input.onboardingStatus !== undefined && !['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'].includes(input.onboardingStatus)) {
    errors.push('Invalid onboarding status.');
  }

  return errors;
};
