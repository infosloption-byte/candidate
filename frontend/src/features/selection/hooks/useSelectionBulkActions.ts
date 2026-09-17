import { useEffect, useMemo, useState } from 'react';
import { useSelectionContext } from '../context/useSelectionContext';
import type { SelectionCandidateRow } from './useSelectionWorkspace';
import type { SelectionDecision, SelectionJob, SelectionRecord } from '../types/selection';

type BulkDecision = Extract<SelectionDecision, 'selected' | 'reserve' | 'rejected'>;

interface UseSelectionBulkActionsProps {
  job: SelectionJob;
  rows: SelectionCandidateRow[];
}

const timestamp = (): string => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const useSelectionBulkActions = ({ job, rows }: UseSelectionBulkActionsProps) => {
  const { state, dispatch } = useSelectionContext();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [targetJobId, setTargetJobId] = useState<string>(() => state.jobs.find((item) => item.id !== job.id)?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds([]);
    setReason('');
    setNote('');
    setError(null);
    setTargetJobId(state.jobs.find((item) => item.id !== job.id)?.id ?? '');
  }, [job.id, state.activeTab, state.jobs]);

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.candidate.id)), [rows, selectedIds]);
  const selectedCount = selectedRows.length;
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.candidate.id));
  const currentSelectedCount = state.records.filter((record) => record.jobId === job.id && record.decision === 'selected').length;
  const targetJob = state.jobs.find((item) => item.id === targetJobId) ?? null;

  const toggleCandidate = (candidateId: string) => {
    setError(null);
    setSelectedIds((current) => current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]);
  };

  const toggleAll = () => {
    setError(null);
    setSelectedIds((current) => {
      const visibleIds = rows.map((row) => row.candidate.id);
      const everySelected = visibleIds.length > 0 && visibleIds.every((id) => current.includes(id));
      if (everySelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setError(null);
  };

  const applyDecision = (decision: BulkDecision): string[] => {
    if (selectedRows.length === 0) {
      setError('Select at least one candidate first.');
      return [];
    }
    const cleanReason = reason.trim();
    const cleanNote = note.trim();
    if (!cleanReason || !cleanNote) {
      setError('Bulk decisions require both a reason and a written note.');
      return [];
    }
    if (decision === 'selected') {
      const additionalSelections = selectedRows.filter((row) => row.record?.decision !== 'selected').length;
      if (currentSelectedCount + additionalSelections > job.openings) {
        setError(`This bulk action would exceed the ${job.openings}-person opening limit.`);
        return [];
      }
    }

    const now = timestamp();
    const records: SelectionRecord[] = selectedRows.map((row) => ({
      candidateId: row.candidate.id,
      jobId: job.id,
      decision,
      reason: cleanReason,
      note: cleanNote,
      decidedAt: now,
      decidedBy: 'Current recruiter',
    }));
    const affectedIds = selectedRows.map((row) => row.candidate.id);
    dispatch({ type: 'BULK_SAVE_DECISIONS', records });
    setSelectedIds([]);
    setReason('');
    setNote('');
    setError(null);
    return affectedIds;
  };

  const reassign = (): string[] => {
    if (selectedRows.length === 0) {
      setError('Select at least one candidate first.');
      return [];
    }
    if (!targetJob || targetJob.id === job.id) {
      setError('Choose a different target job for reassignment.');
      return [];
    }
    const cleanReason = reason.trim();
    const cleanNote = note.trim();
    if (!cleanReason || !cleanNote) {
      setError('Reassignment requires both a reason and a written note.');
      return [];
    }
    const targetConflicts = selectedRows.filter((row) => state.records.some((record) => record.jobId === targetJob.id && record.candidateId === row.candidate.id));
    if (targetConflicts.length > 0) {
      setError(`${targetConflicts.length} selected candidate${targetConflicts.length === 1 ? '' : 's'} already exist in the target job. Remove them from the bulk selection before reassigning.`);
      return [];
    }

    const affectedIds = selectedRows.map((row) => row.candidate.id);
    dispatch({ type: 'REASSIGN_CANDIDATES', candidateIds: affectedIds, fromJobId: job.id, toJobId: targetJob.id, reason: cleanReason, note: cleanNote, occurredAt: timestamp(), occurredBy: 'Current recruiter' });
    setSelectedIds([]);
    setReason('');
    setNote('');
    setError(null);
    return affectedIds;
  };

  return {
    selectedIds,
    selectedRows,
    selectedCount,
    allVisibleSelected,
    reason,
    note,
    targetJobId,
    targetJob,
    error,
    actions: {
      toggleCandidate,
      toggleAll,
      clearSelection,
      setReason: (value: string) => { setReason(value); setError(null); },
      setNote: (value: string) => { setNote(value); setError(null); },
      setTargetJob: (value: string) => { setTargetJobId(value); setError(null); },
      applyDecision,
      reassign,
    },
  };
};
