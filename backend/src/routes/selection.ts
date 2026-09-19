import type { FastifyPluginAsync } from "fastify";
import {
  selectionApprovalBodySchema,
  selectionBulkDecisionBodySchema,
  selectionDecisionBodySchema,
  selectionJobParamsSchema,
  selectionReassignBodySchema,
  selectionScoringBodySchema,
} from "../schemas/selectionSchemas.js";
import {
  approvalController,
  bulkSaveDecisionController,
  reassignController,
  saveDecisionController,
  scoringController,
  selectionWorkspaceController,
  type JobParams,
  type ApprovalBody,
  type ReassignBody,
} from "../controllers/selectionController.js";

export const selectionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/selection", { onRequest: [app.authenticate, app.authorize("selection.view")] }, selectionWorkspaceController);
  app.post<{ Params: { jobId: string }; Body: { candidateId: string; decision: "recommended" | "selected" | "reserve" | "rejected"; reason: string; note: string } }>("/selection/jobs/:jobId/decision", {
    onRequest: [app.authenticate, app.authorize("selection.decide")],
    schema: { params: selectionJobParamsSchema, body: selectionDecisionBodySchema },
  }, saveDecisionController);
  app.post<{ Params: { jobId: string }; Body: { candidateIds: string[]; decision: "recommended" | "selected" | "reserve" | "rejected"; reason: string; note: string } }>("/selection/jobs/:jobId/decisions/bulk", {
    onRequest: [app.authenticate, app.authorize("selection.decide")],
    schema: { params: selectionJobParamsSchema, body: selectionBulkDecisionBodySchema },
  }, bulkSaveDecisionController);
  app.post<{ Params: JobParams; Body: ApprovalBody }>("/selection/jobs/:jobId/approval", {
    onRequest: [app.authenticate, app.authorize("selection.approve")],
    schema: { params: selectionJobParamsSchema, body: selectionApprovalBodySchema },
  }, approvalController);
  app.put<{ Params: JobParams; Body: import("../services/selectionService.js").SelectionScoringWeights }>("/selection/jobs/:jobId/scoring", {
    onRequest: [app.authenticate, app.authorize("selection.decide")],
    schema: { params: selectionJobParamsSchema, body: selectionScoringBodySchema },
  }, scoringController);
  app.post<{ Params: JobParams; Body: ReassignBody }>("/selection/jobs/:jobId/reassign", {
    onRequest: [app.authenticate, app.authorize("selection.decide")],
    schema: { params: selectionJobParamsSchema, body: selectionReassignBodySchema },
  }, reassignController);
};