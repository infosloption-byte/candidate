export type InterviewType = 'SCREENING' | 'TECHNICAL' | 'PRACTICAL' | 'FINAL';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface InterviewInput {
  type?: InterviewType;
  status?: InterviewStatus;
  scheduledAt?: string;
  durationMins?: number;
  location?: string | null;
  notes?: string | null;
  interviewerIds?: string[];
}

export const validateInterviewInput = (input: InterviewInput, mode: 'create' | 'update'): string[] => {
  const errors: string[] = [];

  if (mode === 'create' && !input.type) errors.push('Interview type is required.');
  if (input.type !== undefined && !['SCREENING', 'TECHNICAL', 'PRACTICAL', 'FINAL'].includes(input.type)) {
    errors.push('Invalid interview type.');
  }
  if (input.status !== undefined && !['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(input.status)) {
    errors.push('Invalid interview status.');
  }
  if (mode === 'create' && !input.scheduledAt) errors.push('Interview date and time are required.');
  if (input.scheduledAt !== undefined && Number.isNaN(Date.parse(input.scheduledAt))) {
    errors.push('Interview date and time is invalid.');
  }
  if (
    input.durationMins !== undefined
    && (!Number.isInteger(input.durationMins) || input.durationMins < 15 || input.durationMins > 480)
  ) {
    errors.push('Interview duration must be a whole number between 15 and 480 minutes.');
  }
  if (mode === 'create' && (!input.interviewerIds?.length)) {
    errors.push('At least one interviewer is required.');
  }
  if (input.interviewerIds !== undefined && (
    !Array.isArray(input.interviewerIds)
    || input.interviewerIds.length > 10
    || input.interviewerIds.some((id) => typeof id !== 'string' || !id.trim())
  )) {
    errors.push('Interview panel must contain between 1 and 10 valid interviewer IDs.');
  }

  return errors;
};

export const rangesOverlap = (
  firstStart: Date,
  firstDurationMins: number,
  secondStart: Date,
  secondDurationMins: number,
): boolean => {
  const firstEnd = firstStart.getTime() + firstDurationMins * 60_000;
  const secondEnd = secondStart.getTime() + secondDurationMins * 60_000;
  return firstStart.getTime() < secondEnd && secondStart.getTime() < firstEnd;
};
