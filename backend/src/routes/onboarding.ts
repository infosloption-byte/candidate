import type { FastifyPluginAsync } from "fastify";
import { invitationActionParamsSchema, onboardingStatusBodySchema } from "../schemas/onboardingSchemas.js";
import {
  invitationTransitionController,
  onboardingStatusController,
  resendInvitationController,
  sendInvitationController,
} from "../controllers/onboardingController.js";

export const onboardingRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { id: string } }>("/candidates/:id/invitation", {
    onRequest: [app.authenticate, app.authorize("candidate.invite")],
    schema: { params: invitationActionParamsSchema },
  }, sendInvitationController);

  app.post<{ Params: { id: string } }>("/candidates/:id/invitation/resend", {
    onRequest: [app.authenticate, app.authorize("candidate.invite")],
    schema: { params: invitationActionParamsSchema },
  }, resendInvitationController);

  app.post<{ Params: { id: string }; Querystring: { action?: "opened" | "started" | "expired" | "cancelled" } }>("/candidates/:id/invitation/transition", {
    onRequest: [app.authenticate, app.authorize("candidate.invite")],
    schema: {
      params: invitationActionParamsSchema,
      querystring: {
        type: "object",
        additionalProperties: false,
        required: ["action"],
        properties: { action: { type: "string", enum: ["opened", "started", "expired", "cancelled"] } },
      },
    },
  }, invitationTransitionController);

  app.post<{ Params: { id: string }; Body: { status: "not-started" | "invited" | "in-progress" | "submitted" | "needs-changes" | "completed"; reviewerNote?: string } }>("/candidates/:id/onboarding/status", {
    onRequest: [app.authenticate, app.authorize("candidate.invite")],
    schema: { params: invitationActionParamsSchema, body: onboardingStatusBodySchema },
  }, onboardingStatusController);
};
