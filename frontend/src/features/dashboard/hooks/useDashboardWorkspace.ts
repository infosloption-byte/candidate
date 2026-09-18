import { useMemo } from 'react';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { useInterviewWorkspace } from '../../interviews/hooks/useInterviewWorkspace';
import { useSelectionWorkspace } from '../../selection/hooks/useSelectionWorkspace';
import { buildDashboardSnapshot } from '../services/dashboardMetrics';

export const useDashboardWorkspace = () => {
  const { state: candidateState, actions: candidateActions } = useCandidateWorkspace();
  const { state: interviewState, actions: interviewActions } = useInterviewWorkspace();
  const { state: selectionState, actions: selectionActions } = useSelectionWorkspace();

  const snapshot = useMemo(
    () => buildDashboardSnapshot(
      candidateState.candidates,
      interviewState.interviews,
      selectionState.jobs,
      selectionState.records,
      selectionState.approvalByJob,
    ),
    [
      candidateState.candidates,
      interviewState.interviews,
      selectionState.jobs,
      selectionState.records,
      selectionState.approvalByJob,
    ],
  );

  return {
    snapshot,
    loading: candidateState.loadState === 'loading'
      || interviewState.loadState === 'loading'
      || selectionState.loadState === 'loading',
    hasError: candidateState.loadState === 'error'
      || interviewState.loadState === 'error'
      || selectionState.loadState === 'error',
    retry: () => {
      if (candidateState.loadState === 'error') candidateActions.retryLoad();
      if (interviewState.loadState === 'error') interviewActions.retryLoad();
      if (selectionState.loadState === 'error') selectionActions.retryLoad();
    },
  };
};
