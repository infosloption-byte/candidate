import { useEffect, useMemo, useState } from 'react';
import type { ApprovalStatus } from '../types/selection';

interface UseSelectionApprovalFormProps {
  status: ApprovalStatus;
  note: string;
  ready: boolean;
  onSubmit: (status: ApprovalStatus, note: string) => void;
}

export const useSelectionApprovalForm = ({ status, note, ready, onSubmit }: UseSelectionApprovalFormProps) => {
  const [approvalNote, setApprovalNote] = useState(note);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setApprovalNote(note), [note]);

  const submitForApproval = () => {
    if (!ready) {
      setError('Select at least one candidate and stay within the job capacity before requesting approval.');
      return;
    }
    onSubmit('pending', approvalNote.trim());
    setError(null);
  };

  const approve = () => {
    onSubmit('approved', approvalNote.trim() || 'Approved by management.');
    setError(null);
  };

  const returnToRecruiter = () => {
    if (!approvalNote.trim()) {
      setError('Add a note explaining what needs review before returning the shortlist.');
      return;
    }
    onSubmit('returned', approvalNote.trim());
    setError(null);
  };

  return useMemo(() => ({ status, approvalNote, error, setApprovalNote, submitForApproval, approve, returnToRecruiter }), [status, approvalNote, error]);
};
