import { useState } from 'react';

interface UseSavedFilterFormProps {
  onSave: (name: string) => void;
}

export const useSavedFilterForm = ({ onSave }: UseSavedFilterFormProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give this search a short name so you can find it later.');
      return;
    }
    onSave(trimmed);
    setName('');
    setError(null);
  };

  const cancel = () => {
    setName('');
    setError(null);
  };

  return { name, error, setName, submit, cancel };
};
