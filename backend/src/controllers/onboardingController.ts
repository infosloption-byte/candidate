import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import { sendInvitation, transitionInvitation, updateOnboardingStatus } from "../services/onboardingService.js";

interface Params { id: string; }
interface StatusBody {
  status: "not-started" | "invited" | "in-progress" | "submitted" | "needs-changes" | "completed";
  reviewerNote?: string;
}

const auth = (request: FastifyRequest) => {
  if (!request.auth) throw AppError.unauthenticated();
  return request.auth;
};

export const sendInvitationController = async (request: FastifyRequest<{ Params: Params }>) => ({
  success: true,
  data: await sendInvitation(auth(request), request.params.id, false),
});

export const resendInvitationController = async (request: FastifyRequest<{ Params: Params }>) => ({
  success: true,
  data: await sendInvitation(auth(request), request.params.id, true),
});

export const invitationTransitionController = async (
  request: FastifyRequest<{ Params: Params; Querystring: { action?: "opened" | "started" | "expired" | "cancelled" } }>,
) => {
  const action = request.query.action;
  if (!action) throw AppError.invalidInput("An invitation action is required.");
  return { success: true, data: await transitionInvitation(auth(request), request.params.id, action) };
};

export const onboardingStatusController = async (
  request: FastifyRequest<{ Params: Params; Body: StatusBody }>,
) => ({
  success: true,
  data: {
    candidate: await updateOnboardingStatus(
      auth(request),
      request.params.id,
      request.body.status,
      request.body.reviewerNote,
    ),
  },
});