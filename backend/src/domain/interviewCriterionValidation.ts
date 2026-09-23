export type InterviewCriterionResponseType = 'SCORE' | 'TEXT' | 'MULTI_SELECT';

export interface InterviewCriterionInput {
  name?: string;
  description?: string | null;
  maxPoints?: number;
  responseType?: InterviewCriterionResponseType;
  required?: boolean;
  options?: string[] | null;
  active?: boolean;
}

export const validateInterviewCriterionInput = (
  input: InterviewCriterionInput,
  mode: 'create' | 'update',
): string[] => {
  const errors: string[] = [];
  const responseType = input.responseType ?? 'SCORE';

  if (mode === 'create' && !input.name?.trim()) errors.push('Criterion name is required.');
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) errors.push('Criterion name must be at least 2 characters.');
    if (name.length > 120) errors.push('Criterion name must be 120 characters or fewer.');
  }
  if (input.description !== undefined && input.description !== null && input.description.trim().length > 500) {
    errors.push('Criterion description must be 500 characters or fewer.');
  }
  if (!['SCORE', 'TEXT', 'MULTI_SELECT'].includes(responseType)) {
    errors.push('Invalid criterion response type.');
  }
  if (responseType === 'SCORE') {
    const maxPoints = input.maxPoints ?? (mode === 'create' ? 5 : undefined);
    if (maxPoints !== undefined && (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 100)) {
      errors.push('Maximum points must be a whole number between 1 and 100.');
    }
  } else if (input.maxPoints !== undefined && input.maxPoints !== 0) {
    errors.push('Non-scoring criteria must have maximum points set to 0.');
  }
  if (input.required !== undefined && typeof input.required !== 'boolean') {
    errors.push('Criterion required flag must be true or false.');
  }
  if (input.options !== undefined && input.options !== null) {
    const options = input.options.filter((option) => typeof option === 'string' && option.trim()).map((option) => option.trim());
    if (!Array.isArray(input.options) || options.length > 50 || options.some((option) => option.length > 120)) {
      errors.push('Criterion options must contain up to 50 non-empty labels of 120 characters or fewer.');
    }
  }
  // Multiple-tag criteria may have optional suggested tags, but the interviewer can always enter free-form tags.
  if (input.active !== undefined && typeof input.active !== 'boolean') {
    errors.push('Criterion active flag must be true or false.');
  }

  return errors;
};
