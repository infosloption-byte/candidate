export interface JobInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  openings?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

export const validateJobInput = (input: JobInput, mode: 'create' | 'update'): string[] => {
  const errors: string[] = [];

  if (mode === 'create' && !input.title?.trim()) {
    errors.push('Job title is required.');
  }
  if (input.title !== undefined && input.title.trim().length < 3) {
    errors.push('Job title must be at least 3 characters.');
  }
  if (input.openings !== undefined && (!Number.isInteger(input.openings) || input.openings < 1 || input.openings > 1000)) {
    errors.push('Openings must be a whole number between 1 and 1000.');
  }
  if (input.status !== undefined && !['DRAFT', 'PUBLISHED', 'CLOSED'].includes(input.status)) {
    errors.push('Job status must be DRAFT, PUBLISHED, or CLOSED.');
  }

  return errors;
};
