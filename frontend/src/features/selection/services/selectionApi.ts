import type { SelectionApproval, SelectionHistoryEntry, SelectionJob, SelectionRecord, SelectionScoringWeights } from "../types/selection";
import { apiRequest } from "../../../shared/services/apiClient";

export interface SelectionWorkspaceResponse {
  jobs: SelectionJob[];
  records: SelectionRecord[];
  history: SelectionHistoryEntry[];
  approvalByJob: Record<string, SelectionApproval>;
  scoringByJob: Record<string, SelectionScoringWeights>;
}

export const fetchSelectionWorkspace = async (): Promise<SelectionWorkspaceResponse> =>
  apiRequest<SelectionWorkspaceResponse>("/selection");

export const createJobApi = async (job: SelectionJob): Promise<SelectionJob> =>
  apiRequest<SelectionJob>("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: job.title,
      project: job.project,
      location: job.location,
      client: job.client,
      profession: job.profession,
      openings: job.openings,
      requiredExperience: job.requiredExperience,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills ?? [],
      startDate: job.startDate ?? null,
      deadline: job.deadline ?? null,
      status: job.status ?? "draft",
    }),
  });

export const updateJobApi = async (job: SelectionJob): Promise<SelectionJob> =>
  apiRequest<SelectionJob>(`/jobs/${encodeURIComponent(job.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: job.title,
      project: job.project,
      location: job.location,
      client: job.client,
      profession: job.profession,
      openings: job.openings,
      requiredExperience: job.requiredExperience,
      requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills ?? [],
      startDate: job.startDate ?? null,
      deadline: job.deadline ?? null,
      status: job.status ?? "draft",
    }),
  });

export const closeJobApi = async (jobId: string): Promise<SelectionJob> =>
  apiRequest<SelectionJob>(`/jobs/${encodeURIComponent(jobId)}/close`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const saveSelectionDecisionApi = async (
  jobId: string,
  candidateId: string,
  decision: SelectionRecord["decision"],
  reason: string,
  note: string,
): Promise<SelectionRecord> =>
  apiRequest<SelectionRecord>(`/selection/jobs/${encodeURIComponent(jobId)}/decision`, {
    method: "POST",
    body: JSON.stringify({ candidateId, decision, reason, note }),
  });

export const saveSelectionDecisionsBulkApi = async (
  jobId: string,
  candidateIds: string[],
  decision: SelectionRecord["decision"],
  reason: string,
  note: string,
): Promise<SelectionWorkspaceResponse> =>
  apiRequest<SelectionWorkspaceResponse>(`/selection/jobs/${encodeURIComponent(jobId)}/decisions/bulk`, {
    method: "POST",
    body: JSON.stringify({ candidateIds, decision, reason, note }),
  });

export const setSelectionApprovalApi = async (
  jobId: string,
  status: SelectionApproval["status"],
  note: string,
): Promise<SelectionApproval> =>
  apiRequest<SelectionApproval>(`/selection/jobs/${encodeURIComponent(jobId)}/approval`, {
    method: "POST",
    body: JSON.stringify({ status, note }),
  });

export const setSelectionScoringApi = async (
  jobId: string,
  weights: SelectionScoringWeights,
): Promise<SelectionScoringWeights> =>
  apiRequest<SelectionScoringWeights>(`/selection/jobs/${encodeURIComponent(jobId)}/scoring`, {
    method: "PUT",
    body: JSON.stringify(weights),
  });

export const reassignSelectionCandidatesApi = async (
  fromJobId: string,
  candidateIds: string[],
  toJobId: string,
  reason: string,
  note: string,
): Promise<SelectionWorkspaceResponse> =>
  apiRequest<SelectionWorkspaceResponse>(`/selection/jobs/${encodeURIComponent(fromJobId)}/reassign`, {
    method: "POST",
    body: JSON.stringify({ candidateIds, toJobId, reason, note }),
  });
