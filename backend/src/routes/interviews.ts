import type { FastifyPluginAsync } from "fastify";
import {
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
  updateInterviewNoteController,
  updateCriterionNoteController,
  updateInterviewStatusController,
  updatePracticalNoteController,
  updatePracticalResultController,
  updateScoreController,
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

  app.post<{ Params: { id: string }; Body: { status: string } }>("/interviews/:id/status", {
    onRequest: [app.authenticate, app.authorize("interview.schedule")],
    schema: { params: interviewIdParamsSchema, body: statusBodySchema },
  }, updateInterviewStatusController);

  app.post<{ Params: { id: string }; Body: { decision: "selected" | "reserve" | "rejected"; reason: string; note: string } }>("/interviews/:id/decision", {
    onRequest: [app.authenticate, app.authorize("interview.evaluate")],
    schema: { params: interviewIdParamsSchema, body: decisionBodySchema },
  }, recordDecisionController);

  app.patch<{ Params: { id: string }; Body: { note: string } }>("/interviews/:id/note", {
    onRequest: [app.authenticate, app.authorize("interview.evaluate")],
    schema: {
      params: interviewIdParamsSchema,
      body: {
        type: "object",
        required: ["note"],
        additionalProperties: false,
        properties: { note: { type: "string", maxLength: 5000 } },
      },
    },
  }, updateInterviewNoteController);

  app.patch<{ Params: { id: string; criterionId: string }; Body: { score: number | null } }>("/interviews/:id/scorecard/:criterionId", {
    onRequest: [app.authenticate, app.authorize("interview.evaluate")],
    schema: {
      params: {
        type: "object",
        required: ["id", "criterionId"],
        additionalProperties: false,
        properties: {
          id: { type: "string", maxLength: 36 },
          criterionId: { type: "string", maxLength: 36 },
        },
      },
      body: {
        type: "object",
        required: ["score"],
        additionalProperties: false,
        properties: { score: { type: ["integer", "null"], minimum: 1, maximum: 5 } },
      },
    },
  }, updateScoreController);

  app.patch<{ Params: { id: string; criterionId: string }; Body: { note: string } }>("/interviews/:id/scorecard/:criterionId/note", {
    onRequest: [app.authenticate, app.authorize("interview.evaluate")],
    schema: {
      params: {
        type: "object",
        required: ["id", "criterionId"],
        additionalProperties: false,
        properties: {
          id: { type: "string", maxLength: 36 },
          criterionId: { type: "string", maxLength: 36 },
        },
      },
      body: {
        type: "object",
        required: ["note"],
        additionalProperties: false,
        properties: { note: { type: "string", maxLength: 5000 } },
      },
    },
  }, updateCriterionNoteController);

  app.patch<{ Params: { id: string; itemId: string }; Body: { result: "not-started" | "passed" | "failed" | "pending" } }>("/interviews/:id/practical/:itemId/result", {
    onRequest: [app.authenticate, app.authorize("interview.evaluate")],
    schema: {
      params: {
        type: "object",
        required: ["id", "itemId"],
        additionalProperties: false,
        properties: {
          id: { type: "string", maxLength: 36 },
          itemId: { type: "string", maxLength: 36 },
        },
      },
      body: {
        type: "object",
        required: ["result"],
        additionalProperties: false,
        properties: { result: { type: "string", enum: ["not-started", "passed", "failed", "pending"] } },
      },
    },
  }, updatePracticalResultController);

  app.patch<{ Params: { id: string; itemId: string }; Body: { note: string } }>("/interviews/:id/practical/:itemId/note", {
    onRequest: [app.authenticate, app.authorize("interview.evaluate")],
    schema: {
      params: {
        type: "object",
        required: ["id", "itemId"],
        additionalProperties: false,
        properties: {
          id: { type: "string", maxLength: 36 },
          itemId: { type: "string", maxLength: 36 },
        },
      },
      body: {
        type: "object",
        required: ["note"],
        additionalProperties: false,
        properties: { note: { type: "string", maxLength: 5000 } },
      },
    },
  }, updatePracticalNoteController);

  app.post<{ Params: { id: string }; Body: { date: string; time: string; timezone?: string; interviewerIds: string[]; reason?: string } }>("/interviews/:id/reschedule", {
    onRequest: [app.authenticate, app.authorize("interview.schedule")],
    schema: { params: interviewIdParamsSchema, body: rescheduleBodySchema },
  }, rescheduleInterviewController);
};
