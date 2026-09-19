import type { Interview, Interviewer, InterviewStatus, Decision, PracticalResult } from "../types/interview";
import { apiRequest } from "../../../shared/services/apiClient";

export interface InterviewListResponse {
  items: Interview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const monthMap: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

const toApiDate = (value: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) throw new Error("Invalid interview date.");
  const day = match[1].padStart(2, "0");
  const month = monthMap[match[2]];
  if (!month) throw new Error("Invalid interview month.");
  return `${match[3]}-${month}-${day}`;
};

const localTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Colombo";

export const fetchInterviews = async (): Promise<Interview[]> => {
  const response = await apiRequest<InterviewListResponse>("/interviews?page=1&pageSize=100");
  return response.items;
};

export const fetchInterviewers = async (): Promise<Interviewer[]> => {
  const response = await apiRequest<{ items: Interviewer[] }>("/interviewers");
  return response.items;
};

export const createInterviewApi = async (interview: Interview): Promise<Interview> =>
  apiRequest<Interview>("/interviews", {
    method: "POST",
    body: JSON.stringify({
      candidateId: interview.candidateId,
      type: interview.type,
      date: toApiDate(interview.date),
      time: interview.time,
      durationMinutes: interview.durationMinutes,
      location: interview.location,
      timezone: localTimeZone(),
      interviewerIds: interview.interviewers.map((person) => person.id),
      notes: interview.notes,
      scorecard: interview.scorecard,
      practicalTest: interview.practicalTest,
    }),
  });

export const updateInterviewStatusApi = async (interviewId: string, status: InterviewStatus): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });

export const updateInterviewScoreApi = async (interviewId: string, criterionId: string, score: number | null): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/scorecard/${encodeURIComponent(criterionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ score }),
  });

export const updateInterviewCriterionNoteApi = async (interviewId: string, criterionId: string, note: string): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/scorecard/${encodeURIComponent(criterionId)}/note`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });

export const updateInterviewPracticalResultApi = async (interviewId: string, itemId: string, result: PracticalResult): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/practical/${encodeURIComponent(itemId)}/result`, {
    method: "PATCH",
    body: JSON.stringify({ result }),
  });

export const updateInterviewPracticalNoteApi = async (interviewId: string, itemId: string, note: string): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/practical/${encodeURIComponent(itemId)}/note`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });

export const updateInterviewNoteApi = async (interviewId: string, note: string): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/note`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });

export const recordInterviewDecisionApi = async (
  interviewId: string,
  decision: Exclude<Decision, "pending">,
  reason: string,
  note: string,
): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, reason, note }),
  });

export const rescheduleInterviewApi = async (
  interviewId: string,
  date: string,
  time: string,
  interviewerIds: string[],
  reason: string,
): Promise<Interview> =>
  apiRequest<Interview>(`/interviews/${encodeURIComponent(interviewId)}/reschedule`, {
    method: "POST",
    body: JSON.stringify({
      date: toApiDate(date),
      time,
      timezone: localTimeZone(),
      interviewerIds,
      reason,
    }),
  });
