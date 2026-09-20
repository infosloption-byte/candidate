import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { InterviewCriterion, InterviewCriterionGroup, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

const emptyCriterionForm = { name: '', description: '', maxPoints: '5' };
const emptyGroupForm = { name: '', category: '', description: '', criterionIds: [] as string[] };

export const InterviewCriteriaPage = ({ role }: Props) => {
  const { developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [criteria, setCriteria] = useState<InterviewCriterion[]>(developmentMode ? state.interviewCriteria : []);
  const [groups, setGroups] = useState<InterviewCriterionGroup[]>(developmentMode ? state.interviewCriterionGroups : []);
  const [criterionForm, setCriterionForm] = useState(emptyCriterionForm);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [showCriterionForm, setShowCriterionForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setCriteria(state.interviewCriteria);
      setGroups(state.interviewCriterionGroups);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      apiFetch<InterviewCriterion[]>('/interview-criteria'),
      apiFetch<InterviewCriterionGroup[]>('/interview-criteria-groups'),
    ])
      .then(([criterionResult, groupResult]) => {
        if (cancelled) return;
        setCriteria(criterionResult);
        setGroups(groupResult);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load interview scoring setup.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [developmentMode, state.interviewCriteria, state.interviewCriterionGroups]);

  const activeCriteria = useMemo(() => criteria.filter((item) => item.active), [criteria]);

  const createCriterion = async () => {
    if (criterionForm.name.trim().length < 2) {
      setError('Enter a criterion name with at least 2 characters.');
      return;
    }
    const maxPoints = Number(criterionForm.maxPoints);
    if (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 100) {
      setError('Maximum points must be a whole number from 1 to 100.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = developmentMode
        ? { id: 'criterion-' + Date.now(), name: criterionForm.name.trim(), description: criterionForm.description.trim() || null, maxPoints, active: true }
        : await apiFetch<InterviewCriterion>('/interview-criteria', {
            method: 'POST',
            body: JSON.stringify({ name: criterionForm.name.trim(), description: criterionForm.description.trim() || null, maxPoints }),
          });

      setCriteria((current) => [created, ...current]);
      if (developmentMode) dispatch({ type: 'CREATE_CRITERION', criterion: created });
      setCriterionForm(emptyCriterionForm);
      setShowCriterionForm(false);
      setSuccess('Criterion "' + created.name + '" was added.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the criterion.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCriterion = async (criterion: InterviewCriterion) => {
    setError('');
    try {
      const updated = developmentMode
        ? { ...criterion, active: !criterion.active }
        : await apiFetch<InterviewCriterion>('/interview-criteria/' + criterion.id, {
            method: 'PATCH',
            body: JSON.stringify({ active: !criterion.active }),
          });
      setCriteria((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (developmentMode) dispatch({ type: 'UPDATE_CRITERION', criterion: updated });
      setSuccess('Criterion "' + criterion.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the criterion.');
    }
  };

  const toggleGroupCriterion = (criterionId: string) => {
    setGroupForm((current) => ({
      ...current,
      criterionIds: current.criterionIds.includes(criterionId)
        ? current.criterionIds.filter((id) => id !== criterionId)
        : [...current.criterionIds, criterionId],
    }));
  };

  const createGroup = async () => {
    if (groupForm.name.trim().length < 2) {
      setError('Enter a criteria group name with at least 2 characters.');
      return;
    }
    if (!groupForm.criterionIds.length) {
      setError('Select at least one active criterion for the group.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const selected = activeCriteria.filter((criterion) => groupForm.criterionIds.includes(criterion.id));
      const created = developmentMode
        ? {
            id: 'criterion-group-' + Date.now(),
            name: groupForm.name.trim(),
            category: groupForm.category.trim() || null,
            description: groupForm.description.trim() || null,
            active: true,
            criteria: selected.map((criterion, index) => ({ criterionId: criterion.id, sortOrder: index, criterion })),
          }
        : await apiFetch<InterviewCriterionGroup>('/interview-criteria-groups', {
            method: 'POST',
            body: JSON.stringify({
              name: groupForm.name.trim(),
              category: groupForm.category.trim() || null,
              description: groupForm.description.trim() || null,
              criterionIds: groupForm.criterionIds,
            }),
          });

      setGroups((current) => [created, ...current]);
      if (developmentMode) dispatch({ type: 'CREATE_CRITERION_GROUP', group: created });
      setGroupForm(emptyGroupForm);
      setShowGroupForm(false);
      setSuccess('Criteria group "' + created.name + '" was created with ' + created.criteria.length + ' criteria.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the criteria group.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = async (group: InterviewCriterionGroup) => {
    setError('');
    try {
      const updated = developmentMode
        ? { ...group, active: !group.active }
        : await apiFetch<InterviewCriterionGroup>('/interview-criteria-groups/' + group.id, {
            method: 'PATCH',
            body: JSON.stringify({ active: !group.active }),
          });
      setGroups((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (developmentMode) dispatch({ type: 'UPDATE_CRITERION_GROUP', group: updated });
      setSuccess('Criteria group "' + group.name + '" is now ' + (updated.active ? 'active' : 'inactive') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the criteria group.');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="Interview setup"
        title="Interview criteria"
        description="Build reusable scoring criteria and group them by job type or trade category. Select a group when scheduling an interview so interviewers only score the criteria assigned to that interview."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setShowGroupForm((value) => !value); setShowCriterionForm(false); setError(''); }}>
              {showGroupForm ? 'Close group' : 'New group'}
            </Button>
            <Button onClick={() => { setShowCriterionForm((value) => !value); setShowGroupForm(false); setError(''); }}>
              {showCriterionForm ? 'Close criterion' : 'New criterion'}
            </Button>
          </div>
        }
      />

      {error && <StateMessage kind="error" title="Interview setup action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}
      {loading && <StateMessage kind="loading" title="Loading interview setup" description="Fetching criteria and reusable scoring groups." />}

      {!loading && (showGroupForm || showCriterionForm) && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">{showGroupForm ? 'Reusable scorecard' : 'Scoring library'}</p>
              <h2 className="mt-1 text-base font-black text-slate-950">{showGroupForm ? 'Create criteria group' : 'Create scoring criterion'}</h2>
              <p className="mt-1 text-xs text-slate-500">{showGroupForm ? 'Group the criteria that belong to a job type, trade, or interview stage.' : 'Create a criterion once and reuse it in multiple groups.'}</p>
            </div>
          </div>

          {showCriterionForm && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField label="Criterion name">
                <input className="field-input" value={criterionForm.name} onChange={(event) => setCriterionForm({ ...criterionForm, name: event.target.value })} placeholder="Technical skill" />
              </FormField>
              <FormField label="Maximum points">
                <input type="number" min="1" max="100" className="field-input" value={criterionForm.maxPoints} onChange={(event) => setCriterionForm({ ...criterionForm, maxPoints: event.target.value })} />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Description">
                  <textarea className="field-input min-h-20 resize-y" value={criterionForm.description} onChange={(event) => setCriterionForm({ ...criterionForm, description: event.target.value })} placeholder="What should the interviewer assess?" />
                </FormField>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowCriterionForm(false)}>Cancel</Button>
                <Button disabled={saving} onClick={() => void createCriterion()}>{saving ? 'Saving…' : 'Create criterion'}</Button>
              </div>
            </div>
          )}

          {showGroupForm && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Group name">
                  <input className="field-input" value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} placeholder="Mason — Technical interview" />
                </FormField>
                <FormField label="Job / trade category" hint="Helps find the right scorecard when scheduling.">
                  <input className="field-input" value={groupForm.category} onChange={(event) => setGroupForm({ ...groupForm, category: event.target.value })} placeholder="Masonry / Skilled Trades" />
                </FormField>
                <div className="md:col-span-2">
                  <FormField label="Description">
                    <textarea className="field-input min-h-20 resize-y" value={groupForm.description} onChange={(event) => setGroupForm({ ...groupForm, description: event.target.value })} placeholder="What this interview scorecard is intended to assess…" />
                  </FormField>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-900">Select criteria</p>
                    <p className="mt-1 text-[10px] text-slate-400">{groupForm.criterionIds.length} selected</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">Only active criteria can be added</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activeCriteria.length ? activeCriteria.map((criterion) => {
                    const checked = groupForm.criterionIds.includes(criterion.id);
                    return (
                      <button
                        key={criterion.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleGroupCriterion(criterion.id)}
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${checked ? 'border-cyan-200 bg-cyan-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-extrabold text-slate-900">{criterion.name}</span>
                          <span className="mt-1 block text-[10px] leading-4 text-slate-400">{criterion.description ?? 'No description.'}</span>
                        </span>
                        <span className={`grid size-6 shrink-0 place-items-center rounded-lg border text-[11px] font-black ${checked ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-slate-200 text-transparent'}`}>✓</span>
                      </button>
                    );
                  }) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">Create at least one active criterion first.</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowGroupForm(false)}>Cancel</Button>
                <Button disabled={saving || !groupForm.criterionIds.length} onClick={() => void createGroup()}>{saving ? 'Saving…' : 'Create group'}</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {!loading && groups.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Reusable scorecards</p>
              <h2 className="text-lg font-black text-slate-950">Criteria groups</h2>
              <p className="mt-1 text-xs text-slate-500">Choose one of these groups when scheduling an interview.</p>
            </div>
            <p className="text-xs text-slate-400">{groups.length} group(s)</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((group) => {
              const totalMax = group.criteria.reduce((sum, item) => sum + item.criterion.maxPoints, 0);
              return (
                <Card key={group.id} padded={false} className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-slate-950">{group.name}</h3>
                        <StatusPill value={group.active ? 'ACTIVE' : 'INACTIVE'} />
                      </div>
                      {group.category && <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">{group.category}</p>}
                      <p className="mt-2 text-xs leading-5 text-slate-500">{group.description ?? 'No description provided.'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Score</p>
                        <p className="text-sm font-black text-slate-900">{totalMax} pts</p>
                      </div>
                      <Button size="sm" variant={group.active ? 'danger' : 'secondary'} onClick={() => void toggleGroup(group)}>
                        {group.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {group.criteria.map((item) => (
                      <span key={item.criterionId} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                        {item.criterion.name} · {item.criterion.maxPoints}
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {!loading && groups.length === 0 && (
        <StateMessage kind="empty" title="No criteria groups configured" description="Create a reusable group so each new interview can use a job-specific scorecard." />
      )}

      {!loading && criteria.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Scoring library</p>
              <h2 className="text-lg font-black text-slate-950">Criteria</h2>
              <p className="mt-1 text-xs text-slate-500">Deactivate individual criteria instead of deleting them so older scorecards remain readable.</p>
            </div>
            <p className="text-xs text-slate-400">{criteria.length} criterion/criteria</p>
          </div>
          <div className="grid gap-3">
            {criteria.map((criterion) => (
              <Card key={criterion.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black text-slate-950">{criterion.name}</h2>
                      <StatusPill value={criterion.active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{criterion.description ?? 'No description provided.'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Max</p>
                      <p className="text-sm font-black text-slate-900">{criterion.maxPoints}</p>
                    </div>
                    <Button size="sm" variant={criterion.active ? 'danger' : 'secondary'} onClick={() => void toggleCriterion(criterion)}>
                      {criterion.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {!loading && criteria.length === 0 && !showCriterionForm && (
        <StateMessage kind="empty" title="No criteria configured" description="Add at least one active criterion before creating criteria groups or scoring interviews." />
      )}
    </section>
  );
};
