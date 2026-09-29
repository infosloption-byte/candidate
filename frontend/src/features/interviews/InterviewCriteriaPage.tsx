import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { DataTable } from '../../shared/components/DataTable';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { IconButton } from '../../shared/components/IconButton';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';
import type { InterviewCriterion, InterviewCriterionGroup, InterviewCriterionResponseType, UserRole } from '../../domain/types';

interface Props { role: UserRole; }

const emptyCriterionForm = { name: '', maxPoints: '0', responseType: 'TEXT' as InterviewCriterionResponseType, optionsText: '' };
const criterionResponseOptions = [
  { value: 'TEXT', label: 'Text answer' },
  { value: 'MULTI_SELECT', label: 'Multiple tag selection' },
  { value: 'SINGLE_SELECT', label: 'Dropdown selection (one option)' },
];
const criterionResponseLabel = (responseType: InterviewCriterionResponseType): string =>
  responseType === 'MULTI_SELECT' ? 'Multiple tags' : responseType === 'SINGLE_SELECT' ? 'Dropdown selection' : 'Text answer';
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
  const { t } = useLanguage();
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
  const [activeTab, setActiveTab] = useState<'groups' | 'criteria'>('groups');

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


  const canManage = role === 'ADMIN' || role === 'COMPANY_ADMIN';
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
      maxPoints: String(criterion.maxPoints),
      responseType: criterion.responseType,
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
    if (!Number.isInteger(maxPoints) || maxPoints < 0 || maxPoints > 100) {
      setError('Maximum points must be a whole number from 0 to 100.');
      return;
    }
    const options = criterionForm.optionsText.split(/\r?\n|,/).map((option) => option.trim()).filter(Boolean);
    if (criterionForm.responseType === 'SINGLE_SELECT' && !options.length) {
      setError('Add at least one dropdown option.');
      return;
    }
    if ((criterionForm.responseType === 'MULTI_SELECT' || criterionForm.responseType === 'SINGLE_SELECT') && options.length > 50) {
      setError('You can add up to 50 options.');
      return;
    }
    if (!['MULTI_SELECT', 'SINGLE_SELECT'].includes(criterionForm.responseType) && options.length) {
      setError('Options can only be added to a Dropdown selection or Multiple tag selection criterion.');
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
            maxPoints,
            responseType: criterionForm.responseType,
            options: options.length ? options : null,
          };
        } else {
          saved = {
            id: 'criterion-' + Date.now(),
            name: criterionForm.name.trim(),
            description: null,
            maxPoints,
            responseType: criterionForm.responseType,
            required: true,
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
            maxPoints,
            responseType: criterionForm.responseType,
            options: options.length ? options : null,
          }),
        });
        setCriteria((current) => current.map((item) => item.id === saved.id ? saved : item));
      } else {
        saved = await apiFetch<InterviewCriterion>('/interview-criteria', {
          method: 'POST',
          body: JSON.stringify({
            name: criterionForm.name.trim(),
            maxPoints,
            responseType: criterionForm.responseType,
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
      setSuccess('Criterion "' + criterion.name + '" is now ' + (updated.active ? 'enabled' : 'disabled') + '.');
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

  const moveGroupCriterion = (criterionId: string, direction: -1 | 1) => {
    setGroupForm((current) => {
      const index = current.criterionIds.indexOf(criterionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.criterionIds.length) return current;
      const next = [...current.criterionIds];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return { ...current, criterionIds: next };
    });
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
      setSuccess('Criteria group "' + group.name + '" is now ' + (updated.active ? 'enabled' : 'disabled') + '.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the criteria group.');
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow="Interview setup"
        title="Interview criteria"
        description={t('Build reusable interview criteria and group them by job type or trade category. Every criterion has an answer and a point limit; the multiple-tag option changes the answer field to tag entry.')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={openCreateCriterion}>New criterion</Button>
            <Button onClick={openCreateGroup}>New group</Button>
          </div>
        }
      />

      {error && <StateMessage kind="error" title="Interview setup action failed" description={error} floating={Boolean(modalMode)} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}
      {loading && <StateMessage kind="loading" title="Loading interview setup" description={t('Fetching criteria and reusable interview groups')} />}

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

              <FormField label="Response type" hint="Choose how the interviewer will answer this criterion.">
                <SelectMenu
                  value={criterionForm.responseType}
                  onChange={(value) => setCriterionForm({
                    ...criterionForm,
                    responseType: value as InterviewCriterionResponseType,
                    optionsText: ['MULTI_SELECT', 'SINGLE_SELECT'].includes(value) ? criterionForm.optionsText : '',
                  })}
                  options={criterionResponseOptions}
                  ariaLabel="Select criterion response type"
                />
              </FormField>

              <FormField label="Maximum points" hint="Every criterion receives points during the interview.">
                <input type="number" min="0" max="100" className="field-input" value={criterionForm.maxPoints} onChange={(event) => setCriterionForm({ ...criterionForm, maxPoints: event.target.value })} />
              </FormField>

              {(criterionForm.responseType === 'MULTI_SELECT' || criterionForm.responseType === 'SINGLE_SELECT') && (
                <div className="md:col-span-2">
                  <FormField
                    label={criterionForm.responseType === 'SINGLE_SELECT' ? 'Dropdown options' : 'Suggested tags'}
                    hint={criterionForm.responseType === 'SINGLE_SELECT'
                      ? 'Enter one option per line. The interviewer can select exactly one option.'
                      : 'Enter suggested tags one per line. Interviewers can also add custom tags.'}
                  >
                    <textarea
                      className="field-input min-h-24 resize-y"
                      value={criterionForm.optionsText}
                      onChange={(event) => setCriterionForm({ ...criterionForm, optionsText: event.target.value })}
                      placeholder={criterionForm.responseType === 'SINGLE_SELECT' ? 'Beginner\nIntermediate\nExpert' : 'Plumber\nTile Worker\nMason'}
                    />
                  </FormField>
                </div>
              )}


              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button disabled={saving} onClick={() => void createCriterion()}>{saving ? 'Saving…' : modalMode === 'EDIT_CRITERION' ? 'Save changes' : 'Create criterion'}</Button>
              </div>
            </div>
          )}

          {groupFormOpen && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FormField label="Group name">
                    <input className="field-input" value={groupForm.name} onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })} placeholder="Mason — Technical interview" />
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
                <div className="mt-3 space-y-4">
                  {groupForm.criterionIds.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">Interview order</p>
                      <div className="space-y-2">
                        {groupForm.criterionIds.map((criterionId, index) => {
                          const criterion = activeCriteria.find((item) => item.id === criterionId);
                          if (!criterion) return null;
                          return (
                            <div key={criterion.id} className="flex items-center gap-2 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-2.5">
                              <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-600 text-[10px] font-black text-white">{index + 1}</div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold text-slate-900">{criterion.name}</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">{criterion.maxPoints} pts · {criterionResponseLabel(criterion.responseType)}</p>
                              </div>
                              <IconButton icon="arrow-up" size="sm" label="Move up" ariaLabel={`Move ${criterion.name} up`} disabled={index === 0} onClick={() => moveGroupCriterion(criterion.id, -1)} />
                              <IconButton icon="arrow-down" size="sm" label="Move down" ariaLabel={`Move ${criterion.name} down`} disabled={index === groupForm.criterionIds.length - 1} onClick={() => moveGroupCriterion(criterion.id, 1)} />
                              <IconButton icon="x" size="sm" variant="danger" label="Remove" ariaLabel={`Remove ${criterion.name}`} onClick={() => toggleGroupCriterion(criterion.id)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Available criteria</p>
                    {activeCriteria.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeCriteria.filter((criterion) => !groupForm.criterionIds.includes(criterion.id)).map((criterion) => (
                          <button
                            key={criterion.id}
                            type="button"
                            onClick={() => toggleGroupCriterion(criterion.id)}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="block text-xs font-extrabold text-slate-900">{criterion.name}</span>
                            </span>
                            <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-slate-200 text-xs font-black text-cyan-600">+</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">Create at least one active criterion first.</p>
                    )}
                  </div>
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
          <div role="tablist" aria-label="Interview criteria sections" className="grid w-full max-w-xl grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-sm">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'groups'}
              onClick={() => setActiveTab('groups')}
              className={`rounded-xl px-4 py-3 text-xs font-extrabold transition sm:text-sm ${activeTab === 'groups' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Criteria Groups <span className="ml-1 text-[10px] opacity-60">{groups.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'criteria'}
              onClick={() => setActiveTab('criteria')}
              className={`rounded-xl px-4 py-3 text-xs font-extrabold transition sm:text-sm ${activeTab === 'criteria' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Criteria <span className="ml-1 text-[10px] opacity-60">{criteria.length}</span>
            </button>
          </div>

          <div className="space-y-5">
            <section className={activeTab === 'groups' ? 'block' : 'hidden'}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Reusable scorecards</p>
                  <h2 className="text-lg font-black text-slate-950">Criteria groups</h2>
                  <p className="mt-1 text-xs text-slate-500">Choose one of these groups when scheduling an interview.</p>
                </div>
                <p className="text-xs text-slate-400">{groups.length} group(s)</p>
              </div>
              {groups.length > 0 ? (
                <DataTable
                  rows={groups}
                  getRowKey={(group) => group.id}
                  columns={[
                    {
                      key: 'group',
                      header: 'Group',
                      className: 'min-w-[280px]',
                      render: (group) => (
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-extrabold text-slate-900">{group.name}</p>
                            <StatusPill value={group.active ? 'ACTIVE' : 'INACTIVE'} />
                          </div>
                          {group.category && <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">{group.category}</p>}
                          {group.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{group.description}</p>}
                        </div>
                      ),
                    },
                    {
                      key: 'criteria',
                      header: 'Criteria',
                      className: 'min-w-[240px]',
                      render: (group) => (
                        <div className="min-w-0">
                          <p className="font-black text-slate-900">{group.criteria.length} {group.criteria.length === 1 ? 'criterion' : 'criteria'}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {group.criteria.slice(0, 2).map((item) => item.criterion.name).join(' · ')}
                            {group.criteria.length > 2 ? ' · +' + (group.criteria.length - 2) + ' more' : ''}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'score',
                      header: 'Max score',
                      className: 'w-[1%] whitespace-nowrap',
                      render: (group) => <span className="font-black text-slate-900">{group.criteria.reduce((sum, item) => sum + item.criterion.maxPoints, 0)} pts</span>,
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      className: 'w-[1%] whitespace-nowrap text-right',
                      render: (group) => (
                        <div className="flex justify-end gap-1.5">
                          <IconButton icon="eye" label={t('View criteria group')} ariaLabel={t('View criteria group') + ' ' + group.name} onClick={() => openViewGroup(group)} />
                          {canManage && <IconButton icon="pencil" label={t('Edit criteria group')} ariaLabel={t('Edit criteria group') + ' ' + group.name} onClick={() => openEditGroup(group)} />}
                          {canManage && <IconButton icon={group.active ? 'ban' : 'check'} label={group.active ? t('Disable criteria group') : t('Enable criteria group')} ariaLabel={(group.active ? t('Disable') : t('Enable')) + ' ' + t('criteria group') + ' ' + group.name} variant={group.active ? 'danger' : 'success'} onClick={() => void toggleGroup(group)} />}
                        </div>
                      ),
                    },
                  ]}
                  emptyMessage="No criteria groups configured."
                />
              ) : (
                <StateMessage kind="empty" title="No criteria groups configured" description="Create a reusable group so each new interview can use a job-specific scorecard." />
              )}
            </section>

            <section className={activeTab === 'criteria' ? 'block' : 'hidden'}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Interview library</p>
                  <h2 className="text-lg font-black text-slate-950">Criteria</h2>
                  <p className="mt-1 text-xs text-slate-500">{t('Disable individual criteria instead of deleting them so older scorecards remain readable')}</p>
                </div>
                <p className="text-xs text-slate-400">{criteria.length} {t('criterion/criteria')}</p>
              </div>
              {criteria.length > 0 ? (
                <DataTable
                  rows={criteria}
                  getRowKey={(criterion) => criterion.id}
                  columns={[
                    {
                      key: 'criterion',
                      header: 'Criterion',
                      className: 'min-w-[260px]',
                      render: (criterion) => (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-extrabold text-slate-900">{criterion.name}</p>
                          <StatusPill value={criterion.active ? 'ACTIVE' : 'INACTIVE'} />
                        </div>
                      ),
                    },
                    {
                      key: 'response',
                      header: 'Response',
                      className: 'min-w-[170px]',
                      render: (criterion) => (
                        <div>
                          <p className="font-bold text-slate-700">{criterionResponseLabel(criterion.responseType)}</p>
                          {criterion.options?.length ? <p className="mt-1 text-xs text-slate-400">{criterion.options.length} option(s)</p> : null}
                        </div>
                      ),
                    },
                    {
                      key: 'points',
                      header: 'Max points',
                      className: 'w-[1%] whitespace-nowrap',
                      render: (criterion) => <span className="font-black text-slate-900">{criterion.maxPoints} pts</span>,
                    },
                    {
                      key: 'used-in',
                      header: 'Used in groups',
                      className: 'w-[1%] whitespace-nowrap',
                      render: (criterion) => <span className="font-bold text-slate-700">{groups.filter((group) => group.criteria.some((item) => item.criterionId === criterion.id)).length}</span>,
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      className: 'w-[1%] whitespace-nowrap text-right',
                      render: (criterion) => (
                        <div className="flex justify-end gap-1.5">
                          <IconButton icon="eye" label={t('View criteria')} ariaLabel={t('View criteria') + ' ' + criterion.name} onClick={() => openViewCriterion(criterion)} />
                          {canManage && <IconButton icon="pencil" label="Edit criterion" ariaLabel={'Edit criterion ' + criterion.name} onClick={() => openEditCriterion(criterion)} />}
                          {canManage && <IconButton icon={criterion.active ? 'ban' : 'check'} label={criterion.active ? t('Disable criteria') : t('Enable criterion')} ariaLabel={(criterion.active ? t('Disable criteria') : t('Enable criterion')) + ' ' + criterion.name} variant={criterion.active ? 'danger' : 'success'} onClick={() => void toggleCriterion(criterion)} />}
                        </div>
                      ),
                    },
                  ]}
                  emptyMessage="No criteria configured."
                />
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
              {selectedGroup.description && <p className="mt-1.5 text-xs leading-5 text-slate-600">{selectedGroup.description}</p>}
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
