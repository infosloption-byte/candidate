import type { Candidate, CandidateInvitationStatus, CandidateOnboardingStatus } from "../types/candidate";
import { apiRequest } from "../../../shared/services/apiClient";

export interface InvitationResponse {
  candidate: Candidate;
  invitation: Candidate["onboarding"] extends infer T
    ? T extends { invitation?: infer I } ? I | null : null
    : null;
}

export const sendCandidateInvitationApi = async (candidateId: string): Promise<InvitationResponse> =>
  apiRequest<InvitationResponse>(`/candidates/${encodeURIComponent(candidateId)}/invitation`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const resendCandidateInvitationApi = async (candidateId: string): Promise<InvitationResponse> =>
  apiRequest<InvitationResponse>(`/candidates/${encodeURIComponent(candidateId)}/invitation/resend`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const transitionCandidateInvitationApi = async (
  candidateId: string,
  action: Exclude<CandidateInvitationStatus, "pending">,
): Promise<InvitationResponse> =>
  apiRequest<InvitationResponse>(
    `/candidates/${encodeURIComponent(candidateId)}/invitation/transition?action=${encodeURIComponent(action)}`,
    { method: "POST", body: JSON.stringify({}) },
  );

export const updateCandidateOnboardingApi = async (
  candidateId: string,
  status: CandidateOnboardingStatus,
  reviewerNote = "",
): Promise<{ candidate: Candidate }> =>
  apiRequest<{ candidate: Candidate }>(`/candidates/${encodeURIComponent(candidateId)}/onboarding/status`, {
    method: "POST",
    body: JSON.stringify({ status, reviewerNote }),
  });
