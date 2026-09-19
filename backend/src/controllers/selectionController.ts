import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import { getSelectionWorkspace, reassignCandidates, saveDecision, setApproval, setScoringWeights, type SelectionDecisionInput, type SelectionScoringWeights, type ApprovalStatusInput } from "../services/selectionService.js";

const auth = (request: FastifyRequest) => {
  if (!request.auth) throw AppError.unauthenticated();
  return request.auth;
};

interface JobParams { jobId: string; }
interface DecisionBody { candidateId: string; decision: SelectionDecisionInput; reason: string; note: string; }
interface BulkBody { candidateIds: string[]; decision: SelectionDecisionInput; reason: string; note: string; }
interface ApprovalBody { status: ApprovalStatusInput; note: string; }
interface ReassignBody { candidateIds: string[]; toJobId: string; reason: string; note: string; }

export const selectionWorkspaceController = async (request: FastifyRequest) => ({
  success: true,
  data: await getSelectionWorkspace(auth(request).tenantId),
});

export const saveDecisionController = async (request: FastifyRequest<{ Body: DecisionBody; Params: JobParams }>) => {
  const current = auth(request);
  const result = await saveDecision(current, request.params.jobId, request.body.candidateId, request.body.decision, request.body.reason, request.body.note);
  return { success: true, data: result };
};

export const bulkSaveDecisionController = async (request: FastifyRequest<{ Body: BulkBody; Params: JobParams }>) => {
  const current = auth(request);
  for (const candidateId of [...new Set(request.body.candidateIds)]) {
    await saveDecision(current, request.params.jobId, candidateId, request.body.decision, request.body.reason, request.body.note);
  }
  return { success: true, data: await getSelectionWorkspace(current.tenantId) };
};

export const approvalController = async (request: FastifyRequest<{ Body: ApprovalBody; Params: JobParams }>) => {
  const current = auth(request);
  return { success: true, data: await setApproval(current, request.params.jobId, request.body.status, request.body.note) };
};

export const scoringController = async (request: FastifyRequest<{ Body: SelectionScoringWeights; Params: JobParams }>) => {
  const current = auth(request);
  return { success: true, data: await setScoringWeights(current, request.params.jobId, request.body) };
};

export const reassignController = async (request: FastifyRequest<{ Body: ReassignBody; Params: JobParams }>) => {
  const current = auth(request);
  return { success: true, data: await reassignCandidates(current, request.params.jobId, request.body.toJobId, request.body.candidateIds, request.body.reason, request.body.note) };
};