import { useMemo, useState } from 'react';
import { useSelectionContext } from '../../selection/context/useSelectionContext';
import type { SelectionJob } from '../../selection/types/selection';
import type { JobDraft } from '../types/job';
import { validateJobDraft } from '../services/jobValidation';
import { createJobApi, fetchSelectionWorkspace, updateJobApi, closeJobApi } from '../../selection/services/selectionApi';

const blankDraft: JobDraft = {
  title: '',
  project: '',
  location: '',
  client: '',
  profession: '',
  openings: '1',
  requiredExperience: '0',
  requiredSkills: '',
  preferredSkills: '',
  startDate: '',
  deadline: '',
  status: 'draft',
};

const toDraft = (job: SelectionJob): JobDraft => ({
  title: job.title,
  project: job.project,
  location: job.location,
  client: job.client,
  profession: job.profession,
  openings: String(job.openings),
  requiredExperience: String(job.requiredExperience),
  requiredSkills: job.requiredSkills.join(', '),
  preferredSkills: (job.preferredSkills ?? []).join(', '),
  startDate: job.startDate ?? '',
  deadline: job.deadline ?? '',
  status: job.status ?? 'open',
});

const toJob = (draft: JobDraft, id: string): SelectionJob => ({
  id,
  title: draft.title.trim(),
  project: draft.project.trim(),
  location: draft.location.trim(),
  client: draft.client.trim(),
  profession: draft.profession.trim(),
  openings: Math.max(1, Number(draft.openings) || 1),
  requiredExperience: Math.max(0, Number(draft.requiredExperience) || 0),
  requiredSkills: draft.requiredSkills.split(',').map((value) => value.trim()).filter(Boolean),
  preferredSkills: draft.preferredSkills.split(',').map((value) => value.trim()).filter(Boolean),
  startDate: draft.startDate || undefined,
  deadline: draft.deadline || undefined,
  status: draft.status,
});

export const useJobsWorkspace = () => {
  const { state, dispatch } = useSelectionContext();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | NonNullable<SelectionJob['status']>>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobDraft>(blankDraft);
  const [editorError, setEditorError] = useState<string | null>(null);

  const visibleJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.jobs.filter((job) => {
      const matchesSearch = !query || [job.title, job.project, job.location, job.client, job.profession].join(' ').toLowerCase().includes(query);
      const matchesStatus = status === 'all' || (job.status ?? 'open') === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, state.jobs, status]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(blankDraft);
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEdit = (job: SelectionJob) => {
    setEditingId(job.id);
    setDraft(toDraft(job));
    setEditorError(null);
    setEditorOpen(true);
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

  const save = async (): Promise<boolean> => {
    const validation = validateJobDraft(draft);
    if (validation.length > 0) {
      setEditorError(validation[0] ?? 'Please complete the required fields.');
      return false;
    }

    const job = toJob(draft, editingId ?? 'job-' + Date.now());
    try {
      if (editingId) {
        await updateJobApi(job);
      } else {
        await createJobApi(job);
      }
      await refreshRemote();
      setEditorOpen(false);
      setEditingId(null);
      setDraft(blankDraft);
      setEditorError(null);
      return true;
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'The job could not be saved.');
      return false;
    }
  };

  const retryLoad = () => dispatch({ type: 'RETRY_LOAD' });
  const closeJob = async (jobId: string): Promise<void> => {
    try {
      await closeJobApi(jobId);
      await refreshRemote();
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'The job could not be closed.');
    }
  };

  return {
    state,
    visibleJobs,
    search,
    status,
    editorOpen,
    editingId,
    draft,
    actions: {
      setSearch,
      setStatus,
      setDraft: (patch: Partial<JobDraft>) => setDraft((current) => ({ ...current, ...patch })),
      openCreate,
      openEdit,
      closeEditor: () => { setEditorError(null); setEditorOpen(false); },
      save,
      closeJob,
      retryLoad,
      editorError,
    },
  };
};
