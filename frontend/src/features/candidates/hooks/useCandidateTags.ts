import { useState } from 'react';

interface UseCandidateTagsProps {
  onAdd: (tag: string) => void;
}

export const useCandidateTags = ({ onAdd }: UseCandidateTagsProps) => {
  const [value, setValue] = useState('');

  const add = () => {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  };

  return { value, setValue, add };
};
