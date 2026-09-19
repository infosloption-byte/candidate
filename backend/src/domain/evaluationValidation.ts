export interface EvaluationScoreInput {
  criterionId: string;
  points: number;
}

export interface EvaluationInput {
  scores?: EvaluationScoreInput[];
  comments?: string | null;
}

export const validateEvaluationInput = (input: EvaluationInput): string[] => {
  const errors: string[] = [];

  if (!Array.isArray(input.scores) || input.scores.length === 0) {
    errors.push('At least one interview criterion score is required.');
  } else {
    if (input.scores.length > 50) errors.push('An evaluation can contain at most 50 criterion scores.');
    const seen = new Set<string>();
    input.scores.forEach((score, index) => {
      if (typeof score.criterionId !== 'string' || !score.criterionId.trim()) {
        errors.push('Score ' + (index + 1) + ' must include a valid criterion ID.');
      } else if (seen.has(score.criterionId)) {
        errors.push('Each interview criterion can be scored only once.');
      } else {
        seen.add(score.criterionId);
      }
      if (!Number.isInteger(score.points) || score.points < 0) {
        errors.push('Score ' + (index + 1) + ' must be a whole number of points greater than or equal to 0.');
      }
    });
  }

  if (input.comments !== undefined && input.comments !== null && input.comments.trim().length > 4000) {
    errors.push('Evaluation comments must be 4000 characters or fewer.');
  }

  return errors;
};

export const calculateEvaluationTotal = (scores: Array<{ points: number }>): number =>
  scores.reduce((total, score) => total + score.points, 0);
