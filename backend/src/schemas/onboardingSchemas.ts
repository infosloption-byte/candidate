export const invitationActionParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 36 } },
} as const;

export const onboardingStatusBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["not-started", "invited", "in-progress", "submitted", "needs-changes", "completed"] },
    reviewerNote: { type: "string", maxLength: 5000 },
  },
} as const;