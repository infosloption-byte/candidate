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
} from "../controllers/candidateController.js";

export const candidateRoutes: FastifyPluginAsync = async (app) => {
  app.get("/candidates", {
    onRequest: [app.authenticate, app.authorize("candidate.view")],
    schema: { querystring: listCandidatesQuerySchema },
  }, listCandidatesController);

  app.get<{ Params: { id: string } }>("/candidates/:id", {
    onRequest: [app.authenticate, app.authorize("candidate.view")],
    schema: { params: candidateIdParamsSchema },
  }, getCandidateController);

  app.post("/candidates", {
    onRequest: [app.authenticate, app.authorize("candidate.manage")],
    schema: { body: createCandidateBodySchema },
  }, createCandidateController);

  app.patch<{ Params: { id: string } }>("/candidates/:id", {
    onRequest: [app.authenticate, app.authorize("candidate.manage")],
    schema: {
      params: candidateIdParamsSchema,
      body: updateCandidateBodySchema,
    },
  }, updateCandidateController);

  app.post<{ Params: { id: string } }>("/candidates/:id/status", {
    onRequest: [app.authenticate, app.authorize("candidate.manage")],
    schema: {
      params: candidateIdParamsSchema,
      body: updateCandidateStatusBodySchema,
    },
  }, changeCandidateStatusController);
};