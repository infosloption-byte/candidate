export interface InterviewCriterionGroupInput {
  name?: string;
  category?: string | null;
  description?: string | null;
  criterionIds?: string[];
  active?: boolean;
}

export const validateInterviewCriterionGroupInput = (
  input: InterviewCriterionGroupInput,
  mode: 'create' | 'update',
): string[] => {
  const errors: string[] = [];

  if ((mode === 'create' || input.name !== undefined) && (!input.name || input.name.trim().length < 2)) {
    errors.push('Criteria group name must contain at least 2 characters.');
  }
  if (input.name !== undefined && input.name.trim().length > 160) errors.push('Criteria group name must be 160 characters or fewer.');
  if (input.category !== undefined && input.category !== null && input.category.trim().length > 120) errors.push('Criteria group category must be 120 characters or fewer.');
  if (input.description !== undefined && input.description !== null && input.description.trim().length > 500) errors.push('Criteria group description must be 500 characters or fewer.');

  if (input.criterionIds !== undefined) {
    if (!Array.isArray(input.criterionIds) || input.criterionIds.length < 1 || input.criterionIds.length > 50) {
      errors.push('A criteria group must contain between 1 and 50 criteria.');
    } else {
      const seen = new Set<string>();
      input.criterionIds.forEach((id) => {
        if (typeof id !== 'string' || !id.trim()) errors.push('Every selected criterion must have a valid ID.');
        else if (seen.has(id)) errors.push('Each criterion can appear only once in a criteria group.');
        else seen.add(id);
      });
    }
  } else if (mode === 'create') {
    errors.push('Select at least one criterion for the group.');
  }

  if (input.active !== undefined && typeof input.active !== 'boolean') errors.push('Criteria group active state is invalid.');
  return errors;
};
