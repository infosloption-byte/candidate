import { useState } from 'react';

interface UseSavedFilterFormProps {
  onSave: (name: string) => void;
}

export const useSavedFilterForm = ({ onSave }: UseSavedFilterFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setIsOpen(true);
    setError(null);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give this search a short name so you can find it later.');
      return;
    }
    onSave(trimmed);
    setName('');
    setError(null);
    setIsOpen(false);
  };

  const cancel = () => {
    setName('');
    setError(null);
    setIsOpen(false);
  };

  return { isOpen, name, error, setName, open, submit, cancel };
};
