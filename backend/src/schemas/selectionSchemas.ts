export const selectionJobParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["jobId"],
  properties: { jobId: { type: "string", minLength: 1, maxLength: 36 } },
} as const;

const decisionValues = ["recommended", "selected", "reserve", "rejected"] as const;

export const selectionDecisionBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["candidateId", "decision", "reason", "note"],
  properties: {
    candidateId: { type: "string", minLength: 1, maxLength: 36 },
    decision: { type: "string", enum: [...decisionValues] },
    reason: { type: "string", minLength: 1, maxLength: 160 },
    note: { type: "string", minLength: 1, maxLength: 5000 },
  },
} as const;

export const selectionBulkDecisionBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["candidateIds", "decision", "reason", "note"],
  properties: {
    candidateIds: { type: "array", minItems: 1, maxItems: 500, items: { type: "string", minLength: 1, maxLength: 36 } },
    decision: { type: "string", enum: [...decisionValues] },
    reason: { type: "string", minLength: 1, maxLength: 160 },
    note: { type: "string", minLength: 1, maxLength: 5000 },
  },
} as const;

export const selectionApprovalBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "note"],
  properties: {
    status: { type: "string", enum: ["draft", "pending", "approved", "returned"] },
    note: { type: "string", maxLength: 5000 },
  },
} as const;

export const selectionScoringBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["experience", "skills", "interview", "documents", "readiness", "communication"],
  properties: {
    experience: { type: "number", minimum: 0, maximum: 100 },
    skills: { type: "number", minimum: 0, maximum: 100 },
    interview: { type: "number", minimum: 0, maximum: 100 },
    documents: { type: "number", minimum: 0, maximum: 100 },
    readiness: { type: "number", minimum: 0, maximum: 100 },
    communication: { type: "number", minimum: 0, maximum: 100 },
  },
} as const;

export const selectionReassignBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["candidateIds", "toJobId", "reason", "note"],
  properties: {
    candidateIds: { type: "array", minItems: 1, maxItems: 500, items: { type: "string", minLength: 1, maxLength: 36 } },
    toJobId: { type: "string", minLength: 1, maxLength: 36 },
    reason: { type: "string", minLength: 1, maxLength: 160 },
    note: { type: "string", minLength: 1, maxLength: 5000 },
  },
} as const;