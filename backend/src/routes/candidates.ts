import type { FastifyPluginAsync } from "fastify";
import {
  candidateIdParamsSchema,
  createCandidateBodySchema,
  listCandidatesQuerySchema,
  updateCandidateBodySchema,
  updateCandidateStatusBodySchema,
} from "../schemas/candidateSchemas.js";
import {
  changeCandidateStatusController,
  createCandidateController,
  getCandidateController,
  listCandidatesController,
  updateCandidateController,
  type CandidateParams,
  type CandidateQuery,
  type StatusBody,
} from "../controllers/candidateController.js";

export const candidateRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: CandidateQuery }>("/candidates", {
    onRequest: [app.authenticate, app.authorize("candidate.view")],
    schema: { querystring: listCandidatesQuerySchema },
  }, listCandidatesController);

  app.get<{ Params: { id: string } }>("/candidates/:id", {
    onRequest: [app.authenticate, app.authorize("candidate.view")],
    schema: { params: candidateIdParamsSchema },
  }, getCandidateController);

  app.post<{ Body: import("../services/candidateService.js").CreateCandidateInput }>("/candidates", {
    onRequest: [app.authenticate, app.authorize("candidate.manage")],
    schema: { body: createCandidateBodySchema },
  }, createCandidateController);

  app.patch<{ Params: CandidateParams; Body: import("../services/candidateService.js").UpdateCandidateInput }>("/candidates/:id", {
    onRequest: [app.authenticate, app.authorize("candidate.manage")],
    schema: {
      params: candidateIdParamsSchema,
      body: updateCandidateBodySchema,
    },
  }, updateCandidateController);

  app.post<{ Params: CandidateParams; Body: StatusBody }>("/candidates/:id/status", {
    onRequest: [app.authenticate, app.authorize("candidate.manage")],
    schema: {
      params: candidateIdParamsSchema,
      body: updateCandidateStatusBodySchema,
    },
  }, changeCandidateStatusController);
};