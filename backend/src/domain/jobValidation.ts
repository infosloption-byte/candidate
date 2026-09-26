export interface JobPositionInput {
  position?: string;
  requiredCount?: number;
}

export interface JobInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  openings?: number;
  positions?: JobPositionInput[];
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

export const validateJobInput = (input: JobInput, mode: 'create' | 'update'): string[] => {
  const errors: string[] = [];

  if (mode === 'create' && !input.title?.trim()) errors.push('Job title is required.');
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length < 3) errors.push('Job title must be at least 3 characters.');
    if (title.length > 160) errors.push('Job title must be 160 characters or fewer.');
  }
  if (input.description !== undefined && input.description !== null && input.description.length > 20000) {
    errors.push('Job note must be 20,000 characters or fewer.');
  }
  if (input.location !== undefined && input.location !== null && input.location.trim().length > 160) {
    errors.push('Job location must be 160 characters or fewer.');
  }
  if (input.openings !== undefined && (!Number.isInteger(input.openings) || input.openings < 1 || input.openings > 1000)) {
    errors.push('Required worker count must be a whole number between 1 and 1000.');
  }

  if (mode === 'create' && !Array.isArray(input.positions)) errors.push('At least one job position is required.');
  if (input.positions !== undefined) {
    if (!Array.isArray(input.positions) || input.positions.length < 1 || input.positions.length > 100) {
      errors.push('A job must contain between 1 and 100 position rows.');
    } else {
      const seen = new Set<string>();
      let total = 0;
      input.positions.forEach((item, index) => {
        const position = item.position?.trim() ?? '';
        const count = item.requiredCount;
        if (!position) errors.push('Position row ' + (index + 1) + ': position is required.');
        else if (position.length > 160) errors.push('Position row ' + (index + 1) + ': position must be 160 characters or fewer.');
        const key = position.toLowerCase();
        if (key && seen.has(key)) errors.push('Position row ' + (index + 1) + ': duplicate position.');
        if (key) seen.add(key);
        if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 1000) {
          errors.push('Position row ' + (index + 1) + ': required count must be a whole number between 1 and 1000.');
        } else {
          total += count as number;
        }
      });
      if (total < 1 || total > 1000) errors.push('Total required workers across positions must be between 1 and 1000.');
    }
  }

  if (input.status !== undefined && !['DRAFT', 'PUBLISHED', 'CLOSED'].includes(input.status)) {
    errors.push('Job status must be DRAFT, PUBLISHED, or CLOSED.');
  }
  return errors;
};