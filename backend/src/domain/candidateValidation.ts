export interface CandidateInput {
  name?: string;
  birthdate?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  country?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  currentLocation?: string | null;
  availability?: string | null;
  visaStatus?: string | null;
  profession?: string | null;
  experienceYears?: number | null;
  skills?: string[];
  onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
  source?: 'AGENCY_ADDED' | 'SELF_ONBOARDED' | 'BULK_IMPORTED';
  status?: 'POOL' | 'READY_FOR_INTERVIEW' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'PASSED' | 'REJECTED' | 'ON_HOLD' | 'HIRED' | 'INACTIVE';
  statusReason?: string | null;
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
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) errors.push('Candidate name must be at least 2 characters.');
    if (name.length > 160) errors.push('Candidate name must be 160 characters or fewer.');
  }
  if (input.email) {
    const email = input.email.trim();
    if (!emailPattern.test(email)) errors.push('Candidate email is invalid.');
    if (email.length > 191) errors.push('Candidate email must be 191 characters or fewer.');
  }
  if (input.phone !== undefined && input.phone !== null && input.phone.trim().length > 60) {
    errors.push('Candidate phone must be 60 characters or fewer.');
  }
  if (input.alternatePhone !== undefined && input.alternatePhone !== null && input.alternatePhone.trim().length > 60) {
    errors.push('Candidate alternate phone must be 60 characters or fewer.');
  }
  for (const [field, max, message] of [
    ['country', 100, 'Candidate country'],
    ['passportNumber', 60, 'Candidate passport number'],
    ['currentLocation', 160, 'Candidate current location'],
    ['availability', 80, 'Candidate availability'],
    ['visaStatus', 80, 'Candidate visa status'],
  ] as const) {
    const value = input[field];
    if (value !== undefined && value !== null && value.trim().length > max) {
      errors.push(message + ' must be ' + max + ' characters or fewer.');
    }
  }
  if (input.birthdate !== undefined && input.birthdate !== null && input.birthdate.trim()) {
    const birthdate = Date.parse(input.birthdate);
    if (Number.isNaN(birthdate)) errors.push('Candidate birthdate is invalid.');
    else if (birthdate > Date.now()) errors.push('Candidate birthdate cannot be in the future.');
  }
  if (input.passportExpiry !== undefined && input.passportExpiry !== null && input.passportExpiry.trim() && Number.isNaN(Date.parse(input.passportExpiry))) {
    errors.push('Candidate passport expiry date is invalid.');
  }
  if (input.profession !== undefined && input.profession !== null && input.profession.trim().length > 120) {
    errors.push('Candidate profession must be 120 characters or fewer.');
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
  if (input.status !== undefined && !['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'].includes(input.status)) {
    errors.push('Invalid candidate status.');
  }
  if (input.statusReason !== undefined && input.statusReason !== null && input.statusReason.trim().length > 500) {
    errors.push('Candidate status reason must be 500 characters or fewer.');
  }

  return errors;
};
