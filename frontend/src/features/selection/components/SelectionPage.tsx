import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { SelectionBoard } from './SelectionBoard';
import { useSelectionWorkspace } from '../hooks/useSelectionWorkspace';
import type { SelectionDecision } from '../types/selection';

export const SelectionPage = () => {
  const { state, activeJob, tabRows, selectedRow, approval, metrics, visibleJobs, actions } = useSelectionWorkspace();
  const { actions: candidateActions } = useCandidateWorkspace();

  if (state.loadState === 'loading') return <LoadingState label="Loading selection board" rows={6} />;
  if (state.loadState === 'error') return <ErrorState title="We could not load the selection board" message={state.errorMessage ?? 'Selection data is temporarily unavailable.'} onRetry={actions.retryLoad} />;
  if (!activeJob) return <div className="grid min-h-[60dvh] place-items-center p-6"><EmptyState title="No job requirements yet" message="Create a job requirement before starting candidate selection." icon="briefcase" /></div>;

  const saveDecision = (decision: SelectionDecision, reason: string, note: string) => {
    if (!selectedRow) return;
    actions.saveDecision(selectedRow.candidate.id, decision, reason, note);
    if (decision === 'selected') candidateActions.selectCandidateForJob(selectedRow.candidate.id);
    if (decision === 'reserve') candidateActions.moveToReserve(selectedRow.candidate.id);
  };

  return (
    <div className="min-h-full">
      <SelectionBoard
        job={activeJob}
        jobs={visibleJobs}
        tabRows={tabRows}
        selectedRow={selectedRow}
        activeTab={state.activeTab}
        selectedCount={metrics.selected}
        reserveCount={metrics.reserve}
        recommendedCount={metrics.recommended}
        remaining={metrics.remaining}
        approvalStatus={approval.status}
        approvalReady={metrics.approvalReady}
        approvalNote={approval.note}
        onChangeJob={actions.setJob}
        onTabChange={actions.setTab}
        onSelectCandidate={actions.selectCandidate}
        onDecision={saveDecision}
        onApproval={actions.setApproval}
      />
    </div>
  );
};
