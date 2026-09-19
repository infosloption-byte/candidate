import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { useSelectionBulkActions } from '../hooks/useSelectionBulkActions';
import { SelectionBoard } from './SelectionBoard';
import { useSelectionWorkspace } from '../hooks/useSelectionWorkspace';
import type { SelectionDecision } from '../types/selection';
import { usePermissions } from '../../auth/hooks/usePermissions';

type BulkDecision = Extract<SelectionDecision, 'selected' | 'reserve' | 'rejected'>;

export const SelectionPage = () => {
  const { can } = usePermissions();
  const canDecide = can('selection.decide');
  const canApprove = can('selection.approve');
  const { state, activeJob, tabRows, selectedRow, suitability, approval, history, metrics, visibleJobs, actions } = useSelectionWorkspace();
  const { actions: candidateActions } = useCandidateWorkspace();
  const bulk = useSelectionBulkActions({ job: activeJob ?? { id: '', title: '', project: '', location: '', openings: 0, profession: '', requiredExperience: 0, requiredSkills: [], client: '' }, rows: tabRows });

  if (state.loadState === 'loading') return <LoadingState label="Loading selection board" rows={6} />;
  if (state.loadState === 'error') return <ErrorState title="We could not load the selection board" message={state.errorMessage ?? 'Selection data is temporarily unavailable.'} onRetry={actions.retryLoad} />;
  if (!activeJob) return <div className="grid min-h-[60dvh] place-items-center p-6"><EmptyState title="No job requirements yet" message="Create a job requirement before starting candidate selection." icon="briefcase" /></div>;

  const saveDecision = async (decision: SelectionDecision, reason: string, note: string) => {
    if (!selectedRow) return;
    await actions.saveDecision(selectedRow.candidate.id, decision, reason, note);
    candidateActions.retryLoad();
  };

  const applyBulkDecision = async (decision: BulkDecision) => {
    const candidateIds = await bulk.actions.applyDecision(decision);
    if (candidateIds.length === 0) return;
    candidateActions.retryLoad();
  };

  return (
    <div className="min-h-full">
      <SelectionBoard canDecide={canDecide} canApprove={canApprove} job={activeJob} jobs={visibleJobs} tabRows={tabRows} selectedRow={selectedRow} suitability={suitability} history={history} activeTab={state.activeTab} selectedCount={metrics.selected} reserveCount={metrics.reserve} recommendedCount={metrics.recommended} remaining={metrics.remaining} approvalStatus={approval.status} approvalReady={metrics.approvalReady} approvalNote={approval.note} bulkSelectedIds={bulk.selectedIds} bulkAllVisibleSelected={bulk.allVisibleSelected} bulkReason={bulk.reason} bulkNote={bulk.note} bulkTargetJobId={bulk.targetJobId} bulkError={bulk.error} onChangeJob={actions.setJob} onTabChange={actions.setTab} onSelectCandidate={actions.selectCandidate} onToggleBulkCandidate={bulk.actions.toggleCandidate} onToggleAllBulk={bulk.actions.toggleAll} onClearBulk={bulk.actions.clearSelection} onBulkReasonChange={bulk.actions.setReason} onBulkNoteChange={bulk.actions.setNote} onBulkTargetJobChange={bulk.actions.setTargetJob} onBulkSelect={() => { void applyBulkDecision('selected'); }} onBulkReserve={() => { void applyBulkDecision('reserve'); }} onBulkReject={() => { void applyBulkDecision('rejected'); }} onBulkReassign={() => { void bulk.actions.reassign().then((candidateIds) => { if (candidateIds.length > 0) candidateActions.retryLoad(); }); }} onDecision={saveDecision} onApproval={actions.setApproval} onWeightChange={(key, value) => { if (!suitability) return; actions.setScoringWeights({ ...suitability.weights, [key]: value }); }} />
    </div>
  );
};
