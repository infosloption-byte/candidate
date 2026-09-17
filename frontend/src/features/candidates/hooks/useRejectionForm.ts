import { useState } from 'react';
import type { RejectionReason } from '../types/candidate';

const reasons: RejectionReason[] = ['Technical skill', 'Experience gap', 'Required skill missing', 'Communication', 'Documents', 'Availability', 'Client requirement', 'Other'];

export const useRejectionForm = (onReject: (reason: RejectionReason, note: string) => void) => {
  const [reason, setReason] = useState<RejectionReason>('Technical skill');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setError('Add a short decision note so the rejection is explainable later.');
      return;
    }
    onReject(reason, trimmed);
    setNote('');
    setError(null);
  };

  const close = () => {
    setNote('');
    setError(null);
  };

  return { reasons, reason, note, error, setReason, setNote, submit, close };
};
