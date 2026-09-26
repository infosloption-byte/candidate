import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { Button } from '../../shared/components/Button';
import { StatusPill } from '../../shared/components/StatusPill';
import type { Interview, InterviewCriterionAssignment } from '../../domain/types';

const statusLabel = (value: string): string => value.replaceAll('_', ' ');

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
}

export const InterviewDetailsModal = ({ detail, open, onClose }: Props) => {
  const modalRef = useFocusTrap<HTMLDivElement>({
    enabled: open,
    onEscape: onClose,
  });

  if (!open) return null;

  return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button type="button" aria-label="Close interview details" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="interview-details-title" tabIndex={-1} className="relative z-10 my-auto w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-5">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Interview details</p>
                <h2 id="interview-details-title" className="mt-1 text-xl font-black text-slate-950">{detail.candidate?.name ?? detail.candidateId}</h2>
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
                  <p className="text-xs font-black text-cyan-700">{detail.criterionAssignments?.reduce((sum, item) => sum + item.maxPoints, 0) ?? 0} max points</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(detail.criterionAssignments ?? []).map((assignment) => (
                    <span key={assignment.id} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      {assignment.name} · {assignment.maxPoints}
                    </span>
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
                  <p className="mt-1 text-[10px] text-slate-400">Scores, criterion breakdown, responses, status, and interviewer notes in one section.</p>
                </div>
                {(() => {
                  const submitted = (detail.evaluations ?? []).filter((evaluation) => evaluation.status === 'SUBMITTED');
                  const maxPoints = detail.criterionAssignments?.reduce((sum, item) => sum + item.maxPoints, 0) ?? 0;
                  const percentages = submitted.map((evaluation) => {
                    const total = evaluation.scores.reduce((sum, score) => sum + score.points, 0);
                    return maxPoints ? (total / maxPoints) * 100 : 0;
                  });
                  const average = percentages.length
                    ? Math.round((percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100) / 100
                    : null;
                  return (
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded-full bg-slate-50 px-2.5 py-1 font-bold text-slate-500">
                        Submitted {submitted.length}/{detail.panel?.length ?? 0}
                      </span>
                      {average !== null && (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 font-black text-cyan-700">
                          Panel average {average}%
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-3 space-y-3">
                {detail.evaluations?.length ? detail.evaluations.map((evaluation) => {
                  const criterionMax = detail.criterionAssignments?.reduce((sum, item) => sum + item.maxPoints, 0) ?? 0;
                  const total = evaluation.scores.reduce((sum, score) => sum + score.points, 0);
                  const percentage = criterionMax ? Math.round((total / criterionMax) * 10000) / 100 : 0;
                  const responseByCriterion = new Map(
                    (evaluation.responses ?? []).map((response) => [response.criterionId, response]),
                  );

                  return (
                    <div key={evaluation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900">{evaluation.interviewer.name}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{evaluation.interviewer.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill value={evaluation.status} />
                          <span className="text-sm font-black text-cyan-700">
                            {total} / {criterionMax} · {percentage}%
                          </span>
                        </div>
                      </div>

                      {(detail.criterionAssignments?.length ?? evaluation.scores.length) > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-[560px] w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                              <tr>
                                <th className="rounded-l-lg px-2.5 py-2">Criterion</th>
                                <th className="px-2.5 py-2">Score</th>
                                <th className="rounded-r-lg px-2.5 py-2">Response</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(detail.criterionAssignments ?? evaluation.scores.map((score) => ({
                                id: score.criterionId,
                                criterionId: score.criterionId,
                                name: score.criterion?.name ?? 'Criterion',
                                maxPoints: score.criterion?.maxPoints ?? 0,
                              } as InterviewCriterionAssignment))).map((assignment) => {
                                const score = evaluation.scores.find((item) => item.criterionId === assignment.criterionId);
                                const response = responseByCriterion.get(assignment.criterionId);
                                const responseValue = response?.selectedOptions?.join(', ') || response?.textValue || '—';

                                return (
                                  <tr key={evaluation.id + '-' + assignment.criterionId}>
                                    <td className="px-2.5 py-2 align-top">
                                      <p className="font-bold text-slate-700">{assignment.name}</p>
                                      <p className="mt-0.5 text-[9px] text-slate-400">Max {assignment.maxPoints}</p>
                                    </td>
                                    <td className="px-2.5 py-2 align-top font-black text-slate-900">
                                      {score?.points ?? 0} / {assignment.maxPoints}
                                    </td>
                                    <td className="max-w-[320px] px-2.5 py-2 align-top text-[10px] leading-4 text-slate-600">
                                      <span className="whitespace-pre-wrap">{responseValue}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {evaluation.comments && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Interviewer notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{evaluation.comments}</p>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">
                    No interviewer evaluations recorded yet.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>
  );
};
