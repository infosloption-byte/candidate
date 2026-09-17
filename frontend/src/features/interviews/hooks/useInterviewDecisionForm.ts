import { useMemo, useState } from 'react';
import type { Decision, Interview } from '../types/interview';

interface UseInterviewDecisionFormProps {
  interview: Interview | null;
  canComplete: boolean;
  onSubmit: (decision: Decision, reason: string, note: string) => void;
}

const decisionReasons: Record<Exclude<Decision, 'pending'>, string[]> = {
  selected: ['Meets project requirement', 'Strong technical fit', 'Client-ready', 'Other'],
  reserve: ['Good fit but position limited', 'Needs document follow-up', 'Backup option', 'Other'],
  rejected: ['Technical skill', 'Experience gap', 'Required skill missing', 'Safety concern', 'Communication', 'Documents', 'Client requirement', 'Other'],
};

export const useInterviewDecisionForm = ({ interview, canComplete, onSubmit }: UseInterviewDecisionFormProps) => {
  const [decision, setDecisionValue] = useState<Decision>('selected');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reasons = decision === 'pending' ? [] : decisionReasons[decision];

  const changeDecision = (value: Decision) => {
    if (value === 'pending') return;
    setDecisionValue(value);
    setReason('');
    setError(null);
  };

  const submit = () => {
    if (!interview) {
      setError('Select an interview first.');
      return;
    }
    if (!canComplete) {
      setError('Finish the scorecard and required practical tasks before recording the final decision.');
      return;
    }
    if (!reason.trim()) {
      setError('Choose a reason for this decision.');
      return;
    }
    if (decision === 'rejected' && !note.trim()) {
      setError('A rejected interview requires a written decision note describing the observed gap.');
      return;
    }

    onSubmit(decision, reason.trim(), note.trim());
    setError(null);
  };

  const reset = () => {
    setDecisionValue('selected');
    setReason('');
    setNote('');
    setError(null);
  };

  return useMemo(() => ({ decision, reason, note, error, reasons, changeDecision, setReason, setNote, submit, reset }), [decision, reason, note, error, reasons]);
};
