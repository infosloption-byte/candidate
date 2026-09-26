export interface CandidateInput {
  agencyRegisterNo?: string | null;
  firstName?: string;
  lastName?: string;
  birthdate?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  requestedProfession?: string;
  onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
  source?: 'AGENCY_ADDED' | 'SELF_ONBOARDED' | 'BULK_IMPORTED';
  status?: 'POOL' | 'READY_FOR_INTERVIEW' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'PASSED' | 'REJECTED' | 'ON_HOLD' | 'HIRED' | 'INACTIVE';
  statusReason?: string | null;
  agencyId?: string;
}

const validateRequiredText = (value: string | null | undefined, label: string, max: number, errors: string[]) => {
  if (!value?.trim()) {
    errors.push(label + ' is required.');
    return;
  }
  if (value.trim().length > max) errors.push(label + ' must be ' + max + ' characters or fewer.');
};

export const validateCandidateInput = (
  input: CandidateInput,
  mode: 'create' | 'update' | 'self',
): string[] => {
  const errors: string[] = [];
  const requireIntake = mode === 'create';

  if (requireIntake) {
    validateRequiredText(input.agencyRegisterNo, 'Agency register number', 60, errors);
    validateRequiredText(input.firstName, 'First name', 100, errors);
    validateRequiredText(input.lastName, 'Last name', 100, errors);
    validateRequiredText(input.birthdate, 'Birth date', 10, errors);
    validateRequiredText(input.passportNumber, 'Passport number', 60, errors);
    validateRequiredText(input.passportExpiry, 'Passport expiry date', 10, errors);
    validateRequiredText(input.requestedProfession, 'Requested profession', 120, errors);
  } else if (mode === 'self') {
    validateRequiredText(input.firstName, 'First name', 100, errors);
    validateRequiredText(input.lastName, 'Last name', 100, errors);
    validateRequiredText(input.birthdate, 'Birth date', 10, errors);
    validateRequiredText(input.passportNumber, 'Passport number', 60, errors);
    validateRequiredText(input.passportExpiry, 'Passport expiry date', 10, errors);
    validateRequiredText(input.requestedProfession, 'Requested profession', 120, errors);
  }

  for (const [field, label, max] of [
    ['agencyRegisterNo', 'Agency register number', 60],
    ['firstName', 'First name', 100],
    ['lastName', 'Last name', 100],
    ['requestedProfession', 'Requested profession', 120],
    ['passportNumber', 'Passport number', 60],
  ] as const) {
    const value = input[field];
    if (value !== undefined && value !== null && value.trim().length > max) {
      errors.push(label + ' must be ' + max + ' characters or fewer.');
    }
  }

  if (input.birthdate !== undefined && input.birthdate !== null && input.birthdate.trim()) {
    const birthdate = Date.parse(input.birthdate);
    if (Number.isNaN(birthdate)) errors.push('Birth date is invalid.');
    else if (birthdate > Date.now()) errors.push('Birth date cannot be in the future.');
  }

  if (input.passportExpiry !== undefined && input.passportExpiry !== null && input.passportExpiry.trim() && Number.isNaN(Date.parse(input.passportExpiry))) {
    errors.push('Passport expiry date is invalid.');
  }

  if (input.onboardingStatus !== undefined && !['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'].includes(input.onboardingStatus)) {
    errors.push('Invalid onboarding status.');
  }
  if (input.status !== undefined && !['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'].includes(input.status)) {
    errors.push('Invalid candidate status.');
  }

  return errors;
};
