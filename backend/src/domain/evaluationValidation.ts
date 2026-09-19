export type Recommendation = 'RECOMMENDED' | 'MAYBE' | 'NOT_RECOMMENDED';

export interface EvaluationInput {
  rating?: number;
  recommendation?: Recommendation;
  comments?: string | null;
}

export const validateEvaluationInput = (input: EvaluationInput): string[] => {
  const errors: string[] = [];

  if (!Number.isInteger(input.rating) || (input.rating ?? 0) < 1 || (input.rating ?? 0) > 5) {
    errors.push('Rating must be a whole number between 1 and 5.');
  }
  if (input.recommendation !== undefined && !['RECOMMENDED', 'MAYBE', 'NOT_RECOMMENDED'].includes(input.recommendation)) {
    errors.push('Invalid recommendation.');
  }
  if (input.comments !== undefined && input.comments !== null && input.comments.trim().length > 4000) {
    errors.push('Evaluation comments must be 4000 characters or fewer.');
  }

  return errors;
};

export const resolveApplicationStatus = (
  recommendations: Recommendation[],
): 'INTERVIEW' | 'SELECTED' | 'REJECTED' => {
  const recommended = recommendations.filter((item) => item === 'RECOMMENDED').length;
  const notRecommended = recommendations.filter((item) => item === 'NOT_RECOMMENDED').length;

  if (recommended > notRecommended) return 'SELECTED';
  if (notRecommended > recommended) return 'REJECTED';
  return 'INTERVIEW';
};
