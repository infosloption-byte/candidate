import type { FastifyPluginAsync } from "fastify";
import {
  candidateIdParamsSchema,
  createInterviewBodySchema,
  decisionBodySchema,
  interviewIdParamsSchema,
  listInterviewsQuerySchema,
  rescheduleBodySchema,
  statusBodySchema,
} from "../schemas/interviewSchemas.js";
import {
  createInterviewController,
  listInterviewersController,
  listInterviewsController,
  recordDecisionController,
  rescheduleInterviewController,
  updateInterviewStatusController,
} from "../controllers/interviewController.js";

export const interviewRoutes: FastifyPluginAsync = async (app) => {
  app.get("/interviews", {
    onRequest: [app.authenticate, app.authorize("interview.view")],
    schema: { querystring: listInterviewsQuerySchema },
  }, listInterviewsController);

  app.get("/interviewers", {
    onRequest: [app.authenticate, app.authorize("interview.view")],
  }, listInterviewersController);

  app.post("/interviews", {
    onRequest: [app.authenticate, app.authorize("interview.schedule")],
    schema: { body: createInterviewBodySchema },
  }, createInterviewController);

  app.post<{ Params: Params; Body: StatusBody }>("/interviews/:id/status", {
    onRequest: [app.authenticate, app.authorize("interview.schedule")],
    schema: { params: interviewIdParamsSchema, body: statusBodySchema },
  }, updateInterviewStatusController);

  app.post<{ Params: Params; Body: DecisionBody }>("/interviews/:id/decision", {
    onRequest: [app.authenticate, app.authorize("interview.evaluate")],
    schema: { params: interviewIdParamsSchema, body: decisionBodySchema },
  }, recordDecisionController);

  app.post<{ Params: Params; Body: RescheduleBody }>("/interviews/:id/reschedule", {
    onRequest: [app.authenticate, app.authorize("interview.schedule")],
    schema: { params: interviewIdParamsSchema, body: rescheduleBodySchema },
  }, rescheduleInterviewController);
};