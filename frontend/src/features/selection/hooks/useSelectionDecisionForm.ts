import { useMemo, useState } from 'react';
import type { SelectionDecision, SelectionJob } from '../types/selection';

interface UseSelectionDecisionFormProps {
  job: SelectionJob | null;
  selectedCount: number;
  currentDecision: SelectionDecision | null;
  onSubmit: (decision: SelectionDecision, reason: string, note: string) => void;
}

const reasons: Record<SelectionDecision, string[]> = {
  recommended: ['Strong candidate for requirement', 'Meets core requirements', 'Needs final management review', 'Other'],
  selected: ['Meets project requirement', 'Strong technical fit', 'Client-ready', 'Other'],
  reserve: ['Good fit but position limited', 'Needs document follow-up', 'Backup option', 'Other'],
  rejected: ['Technical gap', 'Experience gap', 'Required skill missing', 'Documents', 'Availability', 'Client requirement', 'Other'],
};

export const useSelectionDecisionForm = ({ job, selectedCount, currentDecision, onSubmit }: UseSelectionDecisionFormProps) => {
  const [decision, setDecision] = useState<SelectionDecision>(currentDecision ?? 'selected');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const decisionReasons = useMemo(() => reasons[decision], [decision]);

  const changeDecision = (value: SelectionDecision) => {
    setDecision(value);
    setReason('');
    setError(null);
  };

  const submit = () => {
    if (!job) {
      setError('Choose a job requirement first.');
      return;
    }
    const stayingSelected = currentDecision === 'selected' && decision === 'selected';
    if (decision === 'selected' && selectedCount >= job.openings && !stayingSelected) {
      setError(`All ${job.openings} selection positions are already filled. Move a selected candidate to Reserve before adding another.`);
      return;
    }
    if (!reason.trim()) {
      setError('Choose a decision reason.');
      return;
    }
    if (!note.trim()) {
      setError('Add a short decision note so the selection remains explainable later.');
      return;
    }
    onSubmit(decision, reason.trim(), note.trim());
    setError(null);
  };

  const reset = () => {
    setDecision(currentDecision ?? 'selected');
    setReason('');
    setNote('');
    setError(null);
  };

  return useMemo(() => ({ decision, reason, note, error, decisionReasons, changeDecision, setReason, setNote, submit, reset }), [decision, reason, note, error, decisionReasons, currentDecision]);
};
