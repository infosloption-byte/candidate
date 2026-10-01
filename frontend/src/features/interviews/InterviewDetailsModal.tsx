import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { StatusPill } from '../../shared/components/StatusPill';
import { SelectMenu } from '../../shared/components/SelectMenu';
import type { CandidateStatus, Interview, InterviewCriterionAssignment, UserRole } from '../../domain/types';
import { Modal } from '../../shared/components/Modal';

const statusLabel = (value: string): string => value.replaceAll('_', ' ');

/** Final outcomes an Admin / Agency can record. Shared with the candidate comparison decision popup. */
export const candidateFinalStatuses: CandidateStatus[] = ['PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'];
const interviewerDecisionStatuses: CandidateStatus[] = ['PASSED', 'REJECTED', 'HIRED'];

export interface InterviewDetail extends Omit<Interview, 'evaluations'> {
  notes?: string | null;
  criterionAssignments?: InterviewCriterionAssignment[];
  evaluations?: Array<{
    id: string;
    interviewerId: string;
    status: 'DRAFT' | 'SUBMITTED';
    submittedAt: string | null;
    comments: string | null;
    interviewer: { id: string; name: string; email: string };
    scores: Array<{
      criterionId: string;
      points: number;
      criterion: { id: string; name: string; maxPoints: number } | null;
    }>;
    responses?: Array<{
      criterionId: string;
      textValue: string | null;
      selectedOptions: string[] | null;
    }>;
  }>;
}

interface Props {
  detail: InterviewDetail;
  open: boolean;
  onClose: () => void;
  role: UserRole;
  onUpdateCandidateStatus?: (
    candidate: { id: string; name: string; status: CandidateStatus },
    status: CandidateStatus,
    reason: string,
  ) => Promise<void>;
}

export const InterviewDetailsModal = ({ detail, open, onClose, role, onUpdateCandidateStatus }: Props) => {
  const [decisionStatus, setDecisionStatus] = useState<CandidateStatus | ''>('');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionSaving, setDecisionSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const current = detail.candidate?.status;
    setDecisionStatus(
      current && candidateFinalStatuses.includes(current) ? current : '',
    );
    setDecisionReason('');
  }, [detail.id, detail.candidate?.status, open]);

  const submittedEvaluations = useMemo(
    () => (detail.evaluations ?? []).filter((evaluation) => evaluation.status === 'SUBMITTED'),
    [detail.evaluations],
  );

  const maxPoints = useMemo(
    () => detail.criterionAssignments?.reduce((sum, assignment) => sum + assignment.maxPoints, 0) ?? 0,
    [detail.criterionAssignments],
  );

  const totalFor = (evaluation: NonNullable<InterviewDetail['evaluations']>[number]) =>
    evaluation.scores.reduce((sum, score) => sum + score.points, 0);

  const averagePercentage = submittedEvaluations.length && maxPoints
    ? Math.round(
        (submittedEvaluations.reduce((sum, evaluation) => sum + (totalFor(evaluation) / maxPoints) * 100, 0) / submittedEvaluations.length) * 100,
      ) / 100
    : null;

  const handleDecision = async () => {
    if (!detail.candidate || !decisionStatus || !onUpdateCandidateStatus) return;
    if (decisionStatus === detail.candidate.status) return;
    setDecisionSaving(true);
    try {
      await onUpdateCandidateStatus(
        {
          id: detail.candidate.id,
          name: detail.candidate.name,
          status: detail.candidate.status,
        },
        decisionStatus,
        decisionReason.trim(),
      );
    } finally {
      setDecisionSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      labelledBy="interview-details-title"
      closeLabel="Close interview details"
      dismissOnBackdrop={!decisionReason.trim()}
      busy={decisionSaving}
      containerClassName="z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6"
      panelClassName="my-auto w-full max-w-6xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-5"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Interview details</p>
          <h2 id="interview-details-title" className="mt-1 text-xl font-black text-slate-950">{detail.candidate?.name ?? 'Candidate unavailable'}</h2>
          <p className="mt-1 text-xs text-slate-500">{detail.candidate?.reference ?? 'Candidate'} · Birthdate: {detail.candidate?.birthdate ? new Date(detail.candidate.birthdate).toLocaleDateString() : 'Not provided'} · Passport: {detail.candidate?.passportNumber ?? 'Not provided'} · {detail.type} interview · {statusLabel(detail.status)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusPill value={detail.status} /><Button size="sm" variant="secondary" onClick={onClose}>Close</Button></div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Birthdate</p><p className="mt-2 text-sm font-bold text-slate-900">{detail.candidate?.birthdate ? new Date(detail.candidate.birthdate).toLocaleDateString() : 'Not provided'}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passport number</p><p className="mt-2 break-all text-sm font-bold text-slate-900">{detail.candidate?.passportNumber ?? 'Not provided'}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & time</p><p className="mt-2 text-sm font-bold text-slate-900">{new Date(detail.scheduledAt).toLocaleString()}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</p><p className="mt-2 text-sm font-bold text-slate-900">{detail.durationMins} minutes</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Job</p><p className="mt-2 text-sm font-bold text-slate-900">{detail.job?.title ?? 'General interview'}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</p><p className="mt-2 text-sm font-bold text-slate-900">{detail.location ?? 'Not specified'}</p></div>
      </div>

      {detail.notes && <div className="mt-4 rounded-2xl border border-slate-200 p-4"><h3 className="text-sm font-black text-slate-950">Notes</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-600">{detail.notes}</p></div>}

      <div className="mt-5">
        <h3 className="text-sm font-black text-slate-950">Assigned scorecard</h3>
        <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">{detail.criterionGroup?.name ?? 'Interview criteria'}</p>
              {detail.criterionGroup?.category && <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">{detail.criterionGroup.category}</p>}
              <p className="mt-1 text-xs text-slate-500">{detail.criterionGroup?.description ?? 'Criteria assigned to this interview.'}</p>
            </div>
            <p className="text-xs font-black text-cyan-700">{maxPoints} max points</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(detail.criterionAssignments ?? []).map((assignment) => (
              <span key={assignment.id} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">{assignment.name} · {assignment.maxPoints}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black text-slate-950">Interview panel</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {detail.panel?.length ? detail.panel.map((participant) => (
            <div key={participant.userId} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-900">{participant.user?.name ?? 'Interviewer unavailable'}</p>
              <p className="mt-1 text-xs text-slate-400">{participant.user?.email ?? 'No email'}</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500">{participant.user?.active === false ? 'Inactive' : 'Active'}</p>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No panel information available.</p>}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-950">Interview evaluation</h3>
            <p className="mt-1 text-[10px] text-slate-400">Compare every submitted interviewer score and answer side by side.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full bg-slate-50 px-2.5 py-1 font-bold text-slate-500">Submitted {submittedEvaluations.length}/{detail.panel?.length ?? 0}</span>
            {averagePercentage !== null && <span className="rounded-full bg-cyan-50 px-2.5 py-1 font-black text-cyan-700">Panel average {averagePercentage}%</span>}
          </div>
        </div>

        {submittedEvaluations.length ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5">Criterion</th>
                  {submittedEvaluations.map((evaluation) => (
                    <th key={evaluation.id} className="min-w-[190px] px-3 py-2.5">
                      <div className="font-black text-slate-700">{evaluation.interviewer.name}</div>
                      <div className="mt-0.5 normal-case font-medium tracking-normal text-slate-400">{evaluation.interviewer.email}</div>
                    </th>
                  ))}
                  <th className="min-w-[90px] px-3 py-2.5">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(detail.criterionAssignments ?? []).map((assignment) => {
                  const values = submittedEvaluations.map((evaluation) => evaluation.scores.find((score) => score.criterionId === assignment.criterionId)?.points ?? 0);
                  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
                  return (
                    <tr key={assignment.id}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-3 align-top">
                        <p className="font-bold text-slate-700">{assignment.name}</p>
                        <p className="mt-0.5 text-[9px] text-slate-400">Max {assignment.maxPoints}</p>
                      </td>
                      {submittedEvaluations.map((evaluation, index) => {
                        const response = evaluation.responses?.find((item) => item.criterionId === assignment.criterionId);
                        const responseValue = response?.selectedOptions?.join(', ') || response?.textValue || '—';
                        return (
                          <td key={evaluation.id} className="px-3 py-3 align-top">
                            <p className="font-black text-slate-900">{values[index]} / {assignment.maxPoints}</p>
                            <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-slate-500">{responseValue}</p>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 align-top font-black text-cyan-700">{average.toFixed(1)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50/70">
                  <td className="sticky left-0 z-10 bg-slate-50 px-3 py-3 font-black text-slate-700">Total</td>
                  {submittedEvaluations.map((evaluation) => (
                    <td key={evaluation.id} className="px-3 py-3 font-black text-slate-900">
                      {totalFor(evaluation)} / {maxPoints}
                      {maxPoints ? <span className="ml-1 text-[10px] text-cyan-700">({Math.round((totalFor(evaluation) / maxPoints) * 100)}%)</span> : null}
                    </td>
                  ))}
                  <td className="px-3 py-3 font-black text-cyan-700">{averagePercentage !== null ? averagePercentage + '%' : '—'}</td>
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 font-black text-slate-700">Interviewer notes</td>
                  {submittedEvaluations.map((evaluation) => (
                    <td key={evaluation.id} className="px-3 py-3 align-top">
                      <p className="whitespace-pre-wrap text-[10px] leading-4 text-slate-600">{evaluation.comments || '—'}</p>
                    </td>
                  ))}
                  <td className="px-3 py-3 text-[10px] text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">No submitted interviewer evaluations recorded yet.</p>
        )}
      </div>

      {detail.status === 'COMPLETED' && detail.candidate && (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Final candidate decision</p>
              <h3 className="mt-1 text-base font-black text-slate-950">Record the candidate outcome</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">All interviewer evaluations are shown above. Record or update the final candidate status here.</p>
            </div>
            {candidateFinalStatuses.includes(detail.candidate.status) && (
              <StatusPill value={detail.candidate.status} />
            )}
          </div>

          {onUpdateCandidateStatus && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="field-label">
                Status
                <SelectMenu
                  value={decisionStatus}
                  onChange={(value) => setDecisionStatus(value as CandidateStatus)}
                  options={[
                    { value: '', label: 'Select final status' },
                    ...(role === 'INTERVIEWER' ? interviewerDecisionStatuses : candidateFinalStatuses).map((status) => ({ value: status, label: statusLabel(status) })),
                  ]}
                  ariaLabel="Final candidate status"
                  disabled={decisionSaving}
                  className="mt-1"
                />
              </label>
              <label className="field-label">
                Reason
                <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                <input
                  className="field-input mt-1 h-11"
                  value={decisionReason}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  placeholder="Reason or decision note"
                  disabled={decisionSaving}
                />
              </label>
              <div className="sm:col-span-2">
                <Button
                  className="min-h-11 w-full sm:w-auto"
                  disabled={!decisionStatus || decisionStatus === detail.candidate.status || decisionSaving}
                  onClick={() => void handleDecision()}
                >
                  {decisionSaving ? 'Updating…' : 'Update final decision'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
