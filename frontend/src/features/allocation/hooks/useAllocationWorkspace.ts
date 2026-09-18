import { useMemo, useState } from 'react';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { useSelectionContext } from '../../selection/context/useSelectionContext';
import { buildAllocationRows } from '../services/allocationService';

export const useAllocationWorkspace = () => {
  const { state: candidateState } = useCandidateWorkspace();
  const { state: selectionState, dispatch } = useSelectionContext();
  const [targetJobId, setTargetJobId] = useState(selectionState.jobs.find((job) => (job.status ?? 'open') === 'open')?.id ?? selectionState.jobs[0]?.id ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState('Allocated from cross-job allocation review');
  const [note, setNote] = useState('');
  
  const rows = useMemo(
    () => buildAllocationRows(candidateState.candidates, selectionState.jobs, selectionState.records, targetJobId),
    [candidateState.candidates, selectionState.jobs, selectionState.records, targetJobId],
  );

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.candidate.id) && !row.alreadyInTarget), [rows, selectedIds]);
  const targetJob = selectionState.jobs.find((job) => job.id === targetJobId) ?? null;

  const toggle = (candidateId: string) => {
    setSelectedIds((current) => current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]);
  };

  const commit = () => {
    if (!targetJob || selectedRows.length === 0) return;
    dispatch({
      type: 'ALLOCATE_CANDIDATES',
      candidateIds: selectedRows.map((row) => row.candidate.id),
      jobId: targetJob.id,
      reason: reason.trim() || 'Allocated from cross-job allocation review',
      note: note.trim(),
      occurredAt: new Date().toISOString(),
      occurredBy: 'Current recruiter',
    });
    setSelectedIds([]);
  };

  return {
    state: selectionState,
    rows,
    selectedRows,
    targetJob,
    targetJobId,
    selectedIds,
    reason,
    note,
    actions: { setTargetJobId, toggle, setReason, setNote, commit },
  };
};
