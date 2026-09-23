export interface EvaluationScoreInput {
  criterionId: string;
  points: number;
}

export interface EvaluationResponseInput {
  criterionId: string;
  textValue?: string | null;
  selectedOptions?: string[] | null;
}

export interface EvaluationInput {
  scores?: EvaluationScoreInput[];
  responses?: EvaluationResponseInput[];
  comments?: string | null;
}

export const validateEvaluationInput = (input: EvaluationInput, options?: { allowEmptyScores?: boolean }): string[] => {
  const allowEmptyScores = options?.allowEmptyScores ?? false;
  const scores = input.scores ?? [];
  const responses = input.responses ?? [];
  const errors: string[] = [];

  if (!Array.isArray(scores) || !Array.isArray(responses)) {
    errors.push('Evaluation responses are invalid.');
    return errors;
  }
  if (!allowEmptyScores && scores.length === 0 && responses.length === 0) {
    errors.push('At least one interview criterion response is required.');
  }
  if (scores.length + responses.length > 50) errors.push('An evaluation can contain at most 50 criterion responses.');

  const seen = new Set<string>();
  scores.forEach((score, index) => {
    if (typeof score.criterionId !== 'string' || !score.criterionId.trim()) {
      errors.push('Score ' + (index + 1) + ' must include a valid criterion ID.');
    } else if (seen.has(score.criterionId)) {
      errors.push('Each interview criterion can only be answered once.');
    } else {
      seen.add(score.criterionId);
    }
    if (!Number.isInteger(score.points) || score.points < 0) {
      errors.push('Score ' + (index + 1) + ' must be a whole number of points greater than or equal to 0.');
    }
  });
  responses.forEach((response, index) => {
    if (typeof response.criterionId !== 'string' || !response.criterionId.trim()) {
      errors.push('Response ' + (index + 1) + ' must include a valid criterion ID.');
    } else if (seen.has(response.criterionId)) {
      errors.push('Each interview criterion can only be answered once.');
    } else {
      seen.add(response.criterionId);
    }
    if (response.textValue !== undefined && response.textValue !== null && typeof response.textValue !== 'string') {
      errors.push('Response ' + (index + 1) + ' text value is invalid.');
    }
    if (response.selectedOptions !== undefined && response.selectedOptions !== null && (!Array.isArray(response.selectedOptions) || response.selectedOptions.some((value) => typeof value !== 'string'))) {
      errors.push('Response ' + (index + 1) + ' selected options are invalid.');
    }
  });

  if (input.comments !== undefined && input.comments !== null && input.comments.trim().length > 4000) {
    errors.push('Evaluation comments must be 4000 characters or fewer.');
  }
  return errors;
};

export const calculateEvaluationTotal = (scores: Array<{ points: number }>): number =>
  scores.reduce((total, score) => total + score.points, 0);
