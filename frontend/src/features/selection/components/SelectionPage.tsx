import { useState } from 'react';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import type { RejectionReason } from '../../candidates/types/candidate';
import { SelectionBoard } from './SelectionBoard';
import { useSelectionWorkspace } from '../hooks/useSelectionWorkspace';
import type { SelectionDecision } from '../types/selection';

const rejectionReasons: RejectionReason[] = ['Technical skill', 'Experience gap', 'Required skill missing', 'Communication', 'Documents', 'Availability', 'Client requirement', 'Other'];

export const SelectionPage = () => {
  const { state, activeJob, tabRows, selectedRow, metrics, visibleJobs, actions } = useSelectionWorkspace();
  const { actions: candidateActions } = useCandidateWorkspace();
  const [mobileEvidenceOpen, setMobileEvidenceOpen] = useState(false);

  if (state.loadState === 'loading') return <LoadingState label="Loading selection board" rows={6} />;
  if (state.loadState === 'error') return <ErrorState title="We could not load the selection board" message={state.errorMessage ?? 'Selection data is temporarily unavailable.'} onRetry={actions.retryLoad} />;
  if (!activeJob) return <div className="grid min-h-[60dvh] place-items-center p-6"><EmptyState title="No job requirements yet" message="Create a job requirement before starting candidate selection." icon="briefcase" /></div>;

  const saveDecision = (decision: SelectionDecision, reason: string, note: string) => {
    if (!selectedRow) return;
    actions.saveDecision(selectedRow.candidate.id, decision, reason, note);
    if (decision === 'selected') candidateActions.selectCandidateForJob(selectedRow.candidate.id);
    if (decision === 'reserve') candidateActions.moveToReserve(selectedRow.candidate.id);
    setMobileEvidenceOpen(false);
  };

  const handleCandidateSelect = (candidateId: string) => {
    actions.selectCandidate(candidateId);
    setMobileEvidenceOpen(true);
  };

  const handleApproval = (status: Parameters<typeof actions.setApproval>[0], note: string) => {
    actions.setApproval(status, note);
  };

  const hasRejectedCandidateReason = selectedRow?.candidate.rejectionReason && rejectionReasons.includes(selectedRow.candidate.rejectionReason) && selectedRow.record?.decision === 'rejected';

  return (
    <div className="min-h-full">
      {hasRejectedCandidateReason && null}
      <SelectionBoard
        job={activeJob}
        jobs={visibleJobs}
        rows={[]}
        tabRows={tabRows}
        selectedRow={selectedRow}
        activeTab={state.activeTab}
        selectedCount={metrics.selected}
        reserveCount={metrics.reserve}
        recommendedCount={metrics.recommended}
        remaining={metrics.remaining}
        approvalStatus={state.approvalStatus}
        approvalReady={metrics.approvalReady}
        approvalNote={state.approvalNote}
        onChangeJob={actions.setJob}
        onTabChange={actions.setTab}
        onSelectCandidate={handleCandidateSelect}
        onDecision={saveDecision}
        onApproval={handleApproval}
      />
      <span className="sr-only" aria-live="polite">{mobileEvidenceOpen && selectedRow ? `Showing evidence for ${selectedRow.candidate.name}` : 'Selection board ready.'}</span>
    </div>
  );
};
