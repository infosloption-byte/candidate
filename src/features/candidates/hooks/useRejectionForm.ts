import { useState } from 'react';

interface RejectionReasonOption {
  value: string;
  label: string;
}

export const rejectionReasonOptions: RejectionReasonOption[] = [
  { value: 'Technical skill gap', label: 'Technical skill gap' },
  { value: 'Insufficient experience', label: 'Insufficient experience' },
  { value: 'Required skill missing', label: 'Required skill missing' },
  { value: 'Safety concern', label: 'Safety concern' },
  { value: 'Communication', label: 'Communication / English' },
  { value: 'Document issue', label: 'Document issue' },
  { value: 'Availability', label: 'Availability issue' },
  { value: 'Other', label: 'Other' },
];

export const useRejectionForm = (onReject: (reason: string, note: string) => void) => {
  const [reason, setReason] = useState('Technical skill gap');
  const [note, setNote] = useState('');

  const submit = () => {
    onReject(reason, note.trim());
    setReason('Technical skill gap');
    setNote('');
  };

  return { reason, note, setReason, setNote, submit };
};
