export interface InterviewCriterionInput {
  name?: string;
  description?: string | null;
  maxPoints?: number;
  active?: boolean;
}

export const validateInterviewCriterionInput = (
  input: InterviewCriterionInput,
  mode: 'create' | 'update',
): string[] => {
  const errors: string[] = [];

  if (mode === 'create' && !input.name?.trim()) errors.push('Criterion name is required.');
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) errors.push('Criterion name must be at least 2 characters.');
    if (name.length > 120) errors.push('Criterion name must be 120 characters or fewer.');
  }
  if (input.description !== undefined && input.description !== null && input.description.trim().length > 500) {
    errors.push('Criterion description must be 500 characters or fewer.');
  }
  if (
    input.maxPoints !== undefined
    && (!Number.isInteger(input.maxPoints) || input.maxPoints < 1 || input.maxPoints > 100)
  ) {
    errors.push('Maximum points must be a whole number between 1 and 100.');
  }
  if (input.active !== undefined && typeof input.active !== 'boolean') {
    errors.push('Criterion active flag must be true or false.');
  }

  return errors;
};
