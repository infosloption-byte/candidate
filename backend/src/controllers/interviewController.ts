import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createInterviewRecord,
  listInterviewers,
  listInterviews,
  recordDecision,
  rescheduleInterview,
  undoReschedule,
  updateInterviewStatus,
  updateScore,
  updateCriterionNote,
  updatePracticalResult,
  updatePracticalNote,
  updateInterviewNote,
} from "../services/interviewService.js";
import { AppError } from "../errors/AppError.js";

export interface Params { id: string; }
export interface ListQuery {
  search?: string;
  status?: "scheduled" | "in-progress" | "evaluation" | "completed" | "no-show" | "cancelled";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
export interface CreateBody {
  candidateId: string;
  type: "Screening" | "Technical" | "Practical" | "Client" | "Final";
  date: string;
  time: string;
  durationMinutes: number;
  location: string;
  timezone?: string;
  interviewerIds: string[];
  notes?: string;
}
export interface StatusBody { status: string; }
export interface DecisionBody { decision: "selected" | "reserve" | "rejected"; reason: string; note: string; }
export interface RescheduleBody { date: string; time: string; timezone?: string; interviewerIds: string[]; reason?: string; }

const statusToPrisma: Record<NonNullable<ListQuery["status"]>, "SCHEDULED" | "IN_PROGRESS" | "EVALUATION" | "COMPLETED" | "NO_SHOW" | "CANCELLED"> = {
  scheduled: "SCHEDULED",
  "in-progress": "IN_PROGRESS",
  evaluation: "EVALUATION",
  completed: "COMPLETED",
  "no-show": "NO_SHOW",
  cancelled: "CANCELLED",
};

export const listInterviewsController = async (request: FastifyRequest<{ Querystring: ListQuery }>) => {
  if (!request.auth) throw AppError.unauthenticated();
  const query = request.query;
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;
  return {
    success: true,
    data: await listInterviews({
      tenantId: request.auth.tenantId,
      search: query.search,
      status: query.status ? statusToPrisma[query.status] : undefined,
      from,
      to,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 100,
    }),
  };
};

export const listInterviewersController = async (request: FastifyRequest) => {
  if (!request.auth) throw AppError.unauthenticated();
  return { success: true, data: { items: await listInterviewers(request.auth.tenantId) } };
};

export const createInterviewController = async (
  request: FastifyRequest<{ Body: CreateBody }>,
  reply: FastifyReply,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  const interview = await createInterviewRecord(request.auth, request.body);
  reply.code(201).send({ success: true, data: interview });
};

export const updateInterviewStatusController = async (
  request: FastifyRequest<{ Params: Params; Body: StatusBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return { success: true, data: await updateInterviewStatus(request.auth, request.params.id, request.body.status) };
};

export const recordDecisionController = async (
  request: FastifyRequest<{ Params: Params; Body: DecisionBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return { success: true, data: await recordDecision(request.auth, request.params.id, request.body.decision, request.body.reason, request.body.note) };
};

export const rescheduleInterviewController = async (
  request: FastifyRequest<{ Params: Params; Body: RescheduleBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return {
    success: true,
    data: await rescheduleInterview(
      request.auth,
      request.params.id,
      request.body.date,
      request.body.time,
      request.body.interviewerIds,
      request.body.reason,
      request.body.timezone,
    ),
  };
};

interface ScoreBody { score: number | null; }
interface NoteBody { note: string; }
interface PracticalResultBody { result: "not-started" | "passed" | "failed" | "pending"; }

export const updateScoreController = async (
  request: FastifyRequest<{ Params: Params & { criterionId: string }; Body: ScoreBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return {
    success: true,
    data: await updateScore(request.auth, request.params.id, request.params.criterionId, request.body.score),
  };
};

export const updateCriterionNoteController = async (
  request: FastifyRequest<{ Params: Params & { criterionId: string }; Body: NoteBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return {
    success: true,
    data: await updateCriterionNote(request.auth, request.params.id, request.params.criterionId, request.body.note),
  };
};

export const updatePracticalResultController = async (
  request: FastifyRequest<{ Params: Params & { itemId: string }; Body: PracticalResultBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return {
    success: true,
    data: await updatePracticalResult(request.auth, request.params.id, request.params.itemId, request.body.result),
  };
};

export const updatePracticalNoteController = async (
  request: FastifyRequest<{ Params: Params & { itemId: string }; Body: NoteBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return {
    success: true,
    data: await updatePracticalNote(request.auth, request.params.id, request.params.itemId, request.body.note),
  };
};

export const updateInterviewNoteController = async (
  request: FastifyRequest<{ Params: Params; Body: NoteBody }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return {
    success: true,
    data: await updateInterviewNote(request.auth, request.params.id, request.body.note),
  };
};


export const undoRescheduleController = async (
  request: FastifyRequest<{ Params: { id: string; historyId: string } }>,
) => {
  if (!request.auth) throw AppError.unauthenticated();
  return {
    success: true,
    data: await undoReschedule(request.auth, request.params.id, request.params.historyId),
  };
};
