import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';
import type { InterviewCriterion, InterviewCriterionGroup, InterviewCriterionResponseType, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

const emptyCriterionForm = { name: '', description: '', maxPoints: '5', responseType: 'TEXT' as InterviewCriterionResponseType, required: true, optionsText: '' };
const emptyGroupForm = { name: '', category: '', description: '', criterionIds: [] as string[] };


type ModalMode = 'CREATE_CRITERION' | 'EDIT_CRITERION' | 'VIEW_CRITERION' | 'CREATE_GROUP' | 'EDIT_GROUP' | 'VIEW_GROUP' | null;

const CriteriaModal = ({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const modalRef = useFocusTrap<HTMLDivElement>({ enabled: true, onEscape: onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="criteria-dialog-title"
        tabIndex={-1}
        className="relative z-10 my-auto w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Interview setup</p>
            <h2 id="criteria-dialog-title" className="mt-1 text-base font-black text-slate-950 sm:text-lg">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
};


export const InterviewCriteriaPage = ({ role }: Props) => {
  const { developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [criteria, setCriteria] = useState<InterviewCriterion[]>(developmentMode ? state.interviewCriteria : []);
  const [groups, setGroups] = useState<InterviewCriterionGroup[]>(developmentMode ? state.interviewCriterionGroups : []);
  const [criterionForm, setCriterionForm] = useState(emptyCriterionForm);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileTab, setMobileTab] = useState<'groups' | 'criteria'>('groups');

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


  const canManage = role === 'ADMIN' || role === 'AGENCY';
  const criterionFormOpen = modalMode === 'CREATE_CRITERION' || modalMode === 'EDIT_CRITERION';
  const groupFormOpen = modalMode === 'CREATE_GROUP' || modalMode === 'EDIT_GROUP';

  const selectedCriterion = selectedCriterionId
    ? criteria.find((item) => item.id === selectedCriterionId) ?? null
    : null;
  const selectedGroup = selectedGroupId
    ? groups.find((item) => item.id === selectedGroupId) ?? null
    : null;

  const closeModal = () => {
    setModalMode(null);
    setSelectedCriterionId(null);
    setSelectedGroupId(null);
    setSaving(false);
    setError('');
  };

  const openCreateCriterion = () => {
    setCriterionForm({ ...emptyCriterionForm });
    setSelectedCriterionId(null);
    setSelectedGroupId(null);
    setError('');
    setModalMode('CREATE_CRITERION');
  };

  const openEditCriterion = (criterion: InterviewCriterion) => {
    setCriterionForm({
      name: criterion.name,
      description: criterion.description ?? '',
      maxPoints: String(criterion.maxPoints),
      responseType: criterion.responseType === 'MULTI_SELECT' ? 'MULTI_SELECT' : 'TEXT',
      required: criterion.required,
      optionsText: (criterion.options ?? []).join('\n'),
    });
    setSelectedCriterionId(criterion.id);
    setSelectedGroupId(null);
    setError('');
    setModalMode('EDIT_CRITERION');
  };

  const openViewCriterion = (criterion: InterviewCriterion) => {
    setSelectedCriterionId(criterion.id);
    setSelectedGroupId(null);
    setError('');
    setModalMode('VIEW_CRITERION');
  };

  const openCreateGroup = () => {
    setGroupForm({ ...emptyGroupForm, criterionIds: [] });
    setSelectedCriterionId(null);
    setSelectedGroupId(null);
    setError('');
    setModalMode('CREATE_GROUP');
  };

  const openEditGroup = (group: InterviewCriterionGroup) => {
    setGroupForm({
      name: group.name,
      category: group.category ?? '',
      description: group.description ?? '',
      criterionIds: group.criteria.map((item) => item.criterionId),
    });
    setSelectedCriterionId(null);
    setSelectedGroupId(group.id);
    setError('');
    setModalMode('EDIT_GROUP');
  };

  const openViewGroup = (group: InterviewCriterionGroup) => {
    setSelectedCriterionId(null);
    setSelectedGroupId(group.id);
    setError('');
    setModalMode('VIEW_GROUP');
  };

  const createCriterion = async () => {
    if (!canManage) return;
    if (criterionForm.name.trim().length < 2) {
      setError('Enter a criterion name with at least 2 characters.');
      return;
    }
    const maxPoints = Number(criterionForm.maxPoints);
    if (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 100) {
      setError('Maximum points must be a whole number from 1 to 100.');
      return;
    }
    const options = criterionForm.optionsText.split(/\r?\n|,/).map((option) => option.trim()).filter(Boolean);
    if (criterionForm.responseType === 'MULTI_SELECT' && options.length > 50) {
      setError('You can add up to 50 suggested tags. Interviewers can still enter custom tags during the interview.');
      return;
    }
    if (criterionForm.responseType !== 'MULTI_SELECT' && options.length) {
      setError('Suggested tags can only be added to a Multiple tags criterion.');
      return;
    }

    const editing = modalMode === 'EDIT_CRITERION';
    const editingCriterion = editing ? selectedCriterion : null;
    if (editing && !editingCriterion) {
      setError('The selected criterion is no longer available.');
      return;
    }
    const existingCriterion = editingCriterion;
    setSaving(true);
    setError('');

    try {
      let saved: InterviewCriterion;

      if (developmentMode) {
        if (editing) {
          if (!existingCriterion) {
            setError('The selected criterion is no longer available.');
            return;
          }
          saved = {
            ...existingCriterion,
            name: criterionForm.name.trim(),
            description: criterionForm.description.trim() || null,
            maxPoints,
            responseType: criterionForm.responseType,
            required: criterionForm.required,
            options: options.length ? options : null,
          };
        } else {
          saved = {
            id: 'criterion-' + Date.now(),
            name: criterionForm.name.trim(),
            description: criterionForm.description.trim() || null,
            maxPoints,
            responseType: criterionForm.responseType,
            required: criterionForm.required,
            options: options.length ? options : null,
            active: true,
          };
        }

        setCriteria((current) => editing
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [saved, ...current]);
        dispatch({ type: editing ? 'UPDATE_CRITERION' : 'CREATE_CRITERION', criterion: saved });
      } else if (editing) {
        if (!existingCriterion) {
          setError('The selected criterion is no longer available.');
          return;
        }
        saved = await apiFetch<InterviewCriterion>('/interview-criteria/' + existingCriterion.id, {
          method: 'PATCH',
          body: JSON.stringify({
            name: criterionForm.name.trim(),
            description: criterionForm.description.trim() || null,
            maxPoints,
            responseType: criterionForm.responseType,
            required: criterionForm.required,
            options: options.length ? options : null,
          }),
        });
        setCriteria((current) => current.map((item) => item.id === saved.id ? saved : item));
      } else {
        saved = await apiFetch<InterviewCriterion>('/interview-criteria', {
          method: 'POST',
          body: JSON.stringify({
            name: criterionForm.name.trim(),
            description: criterionForm.description.trim() || null,
            maxPoints,
            responseType: criterionForm.responseType,
            required: criterionForm.required,
            options: options.length ? options : null,
          }),
        });
        setCriteria((current) => [saved, ...current]);
      }

      setCriterionForm({ ...emptyCriterionForm });
      setModalMode(null);
      setSelectedCriterionId(null);
      setSuccess(editing ? 'Criterion updated successfully.' : 'Criterion created successfully.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the criterion.');
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
    if (!canManage) return;
    if (groupForm.name.trim().length < 2) {
      setError('Enter a criteria group name with at least 2 characters.');
      return;
    }
    if (!groupForm.criterionIds.length) {
      setError('Select at least one active criterion for the group.');
      return;
    }

    const selected = activeCriteria.filter((criterion) => groupForm.criterionIds.includes(criterion.id));
    if (selected.length !== groupForm.criterionIds.length) {
      setError('Every selected criterion must be active.');
      return;
    }

    const editing = modalMode === 'EDIT_GROUP';
    const editingGroup = editing ? selectedGroup : null;
    if (editing && !editingGroup) {
      setError('The selected criteria group is no longer available.');
      return;
    }
    const existingGroup = editingGroup;
    setSaving(true);
    setError('');

    try {
      let saved: InterviewCriterionGroup;

      if (developmentMode) {
        if (editing) {
          if (!existingGroup) {
            setError('The selected criteria group is no longer available.');
            return;
          }
          saved = {
            ...existingGroup,
            name: groupForm.name.trim(),
            category: groupForm.category.trim() || null,
            description: groupForm.description.trim() || null,
            criteria: selected.map((criterion, index) => ({
              criterionId: criterion.id,
              sortOrder: index,
              criterion,
            })),
          };
        } else {
          saved = {
            id: 'criterion-group-' + Date.now(),
            name: groupForm.name.trim(),
            category: groupForm.category.trim() || null,
            description: groupForm.description.trim() || null,
            active: true,
            criteria: selected.map((criterion, index) => ({
              criterionId: criterion.id,
              sortOrder: index,
              criterion,
            })),
          };
        }

        setGroups((current) => editing
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [saved, ...current]);
        dispatch({ type: editing ? 'UPDATE_CRITERION_GROUP' : 'CREATE_CRITERION_GROUP', group: saved });
      } else if (editing) {
        if (!existingGroup) {
          setError('The selected criteria group is no longer available.');
          return;
        }
        saved = await apiFetch<InterviewCriterionGroup>('/interview-criteria-groups/' + existingGroup.id, {
          method: 'PATCH',
          body: JSON.stringify({
            name: groupForm.name.trim(),
            category: groupForm.category.trim() || null,
            description: groupForm.description.trim() || null,
            criterionIds: groupForm.criterionIds,
          }),
        });
        setGroups((current) => current.map((item) => item.id === saved.id ? saved : item));
      } else {
        saved = await apiFetch<InterviewCriterionGroup>('/interview-criteria-groups', {
          method: 'POST',
          body: JSON.stringify({
            name: groupForm.name.trim(),
            category: groupForm.category.trim() || null,
            description: groupForm.description.trim() || null,
            criterionIds: groupForm.criterionIds,
          }),
        });
        setGroups((current) => [saved, ...current]);
      }

      setGroupForm({ ...emptyGroupForm, criterionIds: [] });
      setModalMode(null);
      setSelectedGroupId(null);
      setSuccess(editing ? 'Criteria group updated successfully.' : 'Criteria group created successfully.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the criteria group.');
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
        description="Build reusable interview criteria and group them by job type or trade category. Every criterion has an answer and a point limit; the multiple-tag option changes the answer field to tag entry."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={openCreateCriterion}>New criterion</Button>
            <Button onClick={openCreateGroup}>New group</Button>
          </div>
        }
      />

      {error && <StateMessage kind="error" title="Interview setup action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}
      {loading && <StateMessage kind="loading" title="Loading interview setup" description="Fetching criteria and reusable scoring groups." />}

      {!loading && (criterionFormOpen || groupFormOpen) && (
        <CriteriaModal
          title={groupFormOpen ? (modalMode === 'EDIT_GROUP' ? 'Edit criteria group' : 'New criteria group') : (modalMode === 'EDIT_CRITERION' ? 'Edit criterion' : 'New criterion')}
          description={groupFormOpen ? 'Define the reusable interview form and choose the criteria used in the interview.' : 'Define one reusable interview criterion with an answer field and maximum points.'}
          onClose={closeModal}
        >
          {criterionFormOpen && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FormField label="Criterion name">
                <input className="field-input" value={criterionForm.name} onChange={(event) => setCriterionForm({ ...criterionForm, name: event.target.value })} placeholder="Technical skill" />
              </FormField>

              <FormField label="Maximum points" hint="Every criterion receives points during the interview.">
                <input type="number" min="1" max="100" className="field-input" value={criterionForm.maxPoints} onChange={(event) => setCriterionForm({ ...criterionForm, maxPoints: event.target.value })} />
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Description">
                  <textarea className="field-input min-h-20 resize-y" value={criterionForm.description} onChange={(event) => setCriterionForm({ ...criterionForm, description: event.target.value })} placeholder="What should the interviewer assess?" />
                </FormField>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex cursor-pointer items-start gap-3 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-cyan-600"
                    checked={criterionForm.responseType === 'MULTI_SELECT'}
                    onChange={(event) => setCriterionForm({
                      ...criterionForm,
                      responseType: event.target.checked ? 'MULTI_SELECT' : 'TEXT',
                      optionsText: event.target.checked ? criterionForm.optionsText : '',
                    })}
                  />
                  <span>
                    <span className="block text-xs font-extrabold text-slate-900">Multiple tag option</span>
                    <span className="mt-1 block text-[10px] leading-4 text-slate-500">Use a multiple-answer tag field for this criterion. Points remain available for the same criterion.</span>
                  </span>
                </label>
              </div>

              {criterionForm.responseType === 'MULTI_SELECT' && (
                <div className="md:col-span-2">
                  <FormField label="Suggested tags (optional)" hint="These are shortcuts in the interview panel. Interviewers can always type additional tags.">
                    <textarea className="field-input min-h-24 resize-y" value={criterionForm.optionsText} onChange={(event) => setCriterionForm({ ...criterionForm, optionsText: event.target.value })} placeholder={'Plumber\nTile Worker\nMason'} />
                  </FormField>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={criterionForm.required} onChange={(event) => setCriterionForm({ ...criterionForm, required: event.target.checked })} />
                  Required before the interviewer can submit
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button disabled={saving} onClick={() => void createCriterion()}>{saving ? 'Saving…' : modalMode === 'EDIT_CRITERION' ? 'Save changes' : 'Create criterion'}</Button>
              </div>
            </div>
          )}

          {groupFormOpen && (
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
                <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button disabled={saving || !groupForm.criterionIds.length} onClick={() => void createGroup()}>{saving ? 'Saving…' : modalMode === 'EDIT_GROUP' ? 'Save changes' : 'Create group'}</Button>
              </div>
            </div>
          )}
        </CriteriaModal>
      )}

      {!loading && (
        <>
          <div className="md:hidden">
            <div role="tablist" aria-label="Interview criteria sections" className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'groups'}
                onClick={() => setMobileTab('groups')}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${mobileTab === 'groups' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
              >
                Groups <span className="ml-1 text-[10px] opacity-60">{groups.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileTab === 'criteria'}
                onClick={() => setMobileTab('criteria')}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${mobileTab === 'criteria' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
              >
                Criteria <span className="ml-1 text-[10px] opacity-60">{criteria.length}</span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className={mobileTab === 'groups' ? 'block' : 'hidden md:block'}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Reusable scorecards</p>
                  <h2 className="text-lg font-black text-slate-950">Criteria groups</h2>
                  <p className="mt-1 text-xs text-slate-500">Choose one of these groups when scheduling an interview.</p>
                </div>
                <p className="text-xs text-slate-400">{groups.length} group(s)</p>
              </div>
              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.map((group) => {
                    const totalMax = group.criteria.reduce((sum, item) => sum + item.criterion.maxPoints, 0);
                    return (
                      <Card key={group.id} padded={false} className="p-4">
                        <div className="flex flex-col gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-black text-slate-950">{group.name}</h3>
                              <StatusPill value={group.active ? 'ACTIVE' : 'INACTIVE'} />
                            </div>
                            {group.category && <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">{group.category}</p>}
                            <p className="mt-2 text-xs leading-5 text-slate-500">{group.description ?? 'No description provided.'}</p>
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Score</p>
                              <p className="text-sm font-black text-slate-900">{totalMax} pts</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => openViewGroup(group)}>View</Button>
                              {canManage && <Button size="sm" variant="secondary" onClick={() => openEditGroup(group)}>Edit</Button>}
                              {canManage && (
                                <Button size="sm" variant={group.active ? 'danger' : 'secondary'} onClick={() => void toggleGroup(group)}>
                                  {group.active ? 'Deactivate' : 'Activate'}
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                            {group.criteria.slice(0, 4).map((item) => (
                              <span key={item.criterionId} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                {item.criterion.name} · {item.criterion.maxPoints} pts{item.criterion.responseType === 'MULTI_SELECT' ? ' · tags' : ''}
                              </span>
                            ))}
                            {group.criteria.length > 4 && (
                              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400">+{group.criteria.length - 4} more</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <StateMessage kind="empty" title="No criteria groups configured" description="Create a reusable group so each new interview can use a job-specific scorecard." />
              )}
            </section>

            <section className={mobileTab === 'criteria' ? 'block' : 'hidden md:block'}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Interview library</p>
                  <h2 className="text-lg font-black text-slate-950">Criteria</h2>
                  <p className="mt-1 text-xs text-slate-500">Deactivate individual criteria instead of deleting them so older scorecards remain readable.</p>
                </div>
                <p className="text-xs text-slate-400">{criteria.length} criterion/criteria</p>
              </div>
              {criteria.length > 0 ? (
                <div className="space-y-3">
                  {criteria.map((criterion) => (
                    <Card key={criterion.id}>
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-black text-slate-950">{criterion.name}</h2>
                            <StatusPill value={criterion.active ? 'ACTIVE' : 'INACTIVE'} />
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{criterion.responseType === 'MULTI_SELECT' ? 'MULTI TAG' : criterion.responseType.replace('_', ' ')}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{criterion.description ?? 'No description provided.'}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          <div className="mr-auto rounded-xl bg-slate-50 px-3 py-2 text-center">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Points</p>
                            <p className="text-sm font-black text-slate-900">{criterion.maxPoints} pts</p>
                            <p className="mt-0.5 text-[9px] font-bold text-slate-400">{criterion.responseType === 'MULTI_SELECT' ? 'Multiple tag option' : 'Standard answer'}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => openViewCriterion(criterion)}>View</Button>
                          {canManage && <Button size="sm" variant="secondary" onClick={() => openEditCriterion(criterion)}>Edit</Button>}
                          {canManage && (
                            <Button size="sm" variant={criterion.active ? 'danger' : 'secondary'} onClick={() => void toggleCriterion(criterion)}>
                              {criterion.active ? 'Deactivate' : 'Activate'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <StateMessage kind="empty" title="No criteria configured" description="Add at least one active criterion before creating criteria groups or scoring interviews." />
              )}
            </section>
          </div>
        </>
      )}


      {modalMode === 'VIEW_CRITERION' && selectedCriterion && (
        <CriteriaModal
          title="Criterion details"
          description="Review this reusable scoring item and the scorecards that currently use it."
          onClose={closeModal}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-slate-950">{selectedCriterion.name}</h3>
                <StatusPill value={selectedCriterion.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{selectedCriterion.description ?? 'No description provided.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Answer field</p>
                <p className="mt-1 text-lg font-black text-slate-950">{selectedCriterion.responseType === 'MULTI_SELECT' ? 'Multiple tag option' : 'Standard answer'}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-400">Max {selectedCriterion.maxPoints} points</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Used in scorecards</p>
                <p className="mt-1 text-lg font-black text-slate-950">{groups.filter((group) => group.criteria.some((item) => item.criterionId === selectedCriterion.id)).length}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-slate-900">Scorecards using this criterion</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {groups.filter((group) => group.criteria.some((item) => item.criterionId === selectedCriterion.id)).map((group) => (
                  <span key={group.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">{group.name}</span>
                ))}
              </div>
            </div>

            {canManage && (
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={closeModal}>Close</Button>
                <Button onClick={() => openEditCriterion(selectedCriterion)}>Edit criterion</Button>
              </div>
            )}
          </div>
        </CriteriaModal>
      )}

      {modalMode === 'VIEW_GROUP' && selectedGroup && (
        <CriteriaModal
          title="Criteria group details"
          description="Review the complete scorecard before assigning it to an interview."
          onClose={closeModal}
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-slate-950">{selectedGroup.name}</h3>
                <StatusPill value={selectedGroup.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              {selectedGroup.category && (
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">{selectedGroup.category}</p>
              )}
              <p className="mt-1.5 text-xs leading-5 text-slate-600">{selectedGroup.description ?? 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Criteria</p>
                <p className="mt-0.5 text-base font-black text-slate-950">{selectedGroup.criteria.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Max score</p>
                <p className="mt-0.5 text-base font-black text-slate-950">{selectedGroup.criteria.reduce((sum, item) => sum + item.criterion.maxPoints, 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <p className="mt-0.5 text-sm font-black text-slate-950">{selectedGroup.active ? 'Ready' : 'Inactive'}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-black text-slate-900">Criteria in this scorecard</p>
                <p className="text-[10px] font-bold text-slate-400">{selectedGroup.criteria.length} items</p>
              </div>
              <div className="space-y-1.5">
                {selectedGroup.criteria.map((item, index) => (
                  <div key={item.criterionId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900">{index + 1}. {item.criterion.name}</p>
                      {item.criterion.description && (
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">{item.criterion.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] font-black text-slate-700">{item.criterion.maxPoints} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {canManage && (
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="secondary" onClick={closeModal}>Close</Button>
                <Button onClick={() => openEditGroup(selectedGroup)}>Edit group</Button>
              </div>
            )}
          </div>
        </CriteriaModal>
      )}
    </section>
  );
};
