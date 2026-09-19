import { useEffect, useMemo, useState } from 'react';
import { useSelectionContext } from '../context/useSelectionContext';
import type { SelectionCandidateRow } from './useSelectionWorkspace';
import type { SelectionDecision, SelectionJob } from '../types/selection';
import { fetchSelectionWorkspace, reassignSelectionCandidatesApi, saveSelectionDecisionsBulkApi } from '../services/selectionApi';

type BulkDecision = Extract<SelectionDecision, 'selected' | 'reserve' | 'rejected'>;

interface UseSelectionBulkActionsProps {
  job: SelectionJob | null;
  rows: SelectionCandidateRow[];
}

const timestamp = (): string => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const useSelectionBulkActions = ({ job, rows }: UseSelectionBulkActionsProps) => {
  const { state, dispatch } = useSelectionContext();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [targetJobId, setTargetJobId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds([]);
    setReason('');
    setNote('');
    setError(null);
    setTargetJobId(job ? (state.jobs.find((item) => item.id !== job.id)?.id ?? '') : '');
  }, [job, state.activeTab, state.jobs]);

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.candidate.id)), [rows, selectedIds]);
  const selectedCount = selectedRows.length;
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.candidate.id));
  const currentSelectedCount = job ? state.records.filter((record) => record.jobId === job.id && record.decision === 'selected').length : 0;
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

  const refreshRemote = async () => {
    const workspace = await fetchSelectionWorkspace();
    dispatch({
      type: 'REFRESH_REMOTE',
      jobs: workspace.jobs,
      records: workspace.records,
      history: workspace.history,
      approvalByJob: workspace.approvalByJob,
      scoringByJob: workspace.scoringByJob,
    });
  };

  const applyDecision = async (decision: BulkDecision): Promise<string[]> => {
    if (!job) {
      setError('Selection data is still loading.');
      return [];
    }
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

    const affectedIds = selectedRows.map((row) => row.candidate.id);
    try {
      await saveSelectionDecisionsBulkApi(job.id, affectedIds, decision, cleanReason, cleanNote);
      await refreshRemote();
      setSelectedIds([]);
      setReason('');
      setNote('');
      setError(null);
      return affectedIds;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The bulk decision could not be saved.');
      return [];
    }
  };

  const reassign = async (): Promise<string[]> => {
    if (!job) {
      setError('Selection data is still loading.');
      return [];
    }
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
    try {
      const workspace = await reassignSelectionCandidatesApi(job.id, affectedIds, targetJob.id, cleanReason, cleanNote);
      dispatch({
        type: 'REFRESH_REMOTE',
        jobs: workspace.jobs,
        records: workspace.records,
        history: workspace.history,
        approvalByJob: workspace.approvalByJob,
        scoringByJob: workspace.scoringByJob,
      });
      setSelectedIds([]);
      setReason('');
      setNote('');
      setError(null);
      return affectedIds;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The candidates could not be reassigned.');
      return [];
    }
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
