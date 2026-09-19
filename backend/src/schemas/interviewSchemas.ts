export const interviewIdParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 36 } },
} as const;

export const listInterviewsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", maxLength: 100 },
    status: { type: "string", enum: ["scheduled", "in-progress", "evaluation", "completed", "no-show", "cancelled"] },
    from: { type: "string", format: "date" },
    to: { type: "string", format: "date" },
    page: { type: "integer", minimum: 1, maximum: 10000, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 100 },
  },
} as const;

const interviewTypes = ["Screening", "Technical", "Practical", "Client", "Final"] as const;

export const createInterviewBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["candidateId", "type", "date", "time", "durationMinutes", "location", "interviewerIds"],
  properties: {
    candidateId: { type: "string", minLength: 1, maxLength: 36 },
    type: { type: "string", enum: [...interviewTypes] },
    date: { type: "string", format: "date" },
    time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
    durationMinutes: { type: "integer", minimum: 15, maximum: 480 },
    location: { type: "string", minLength: 1, maxLength: 255 },
    timezone: { type: "string", minLength: 1, maxLength: 80 },
    interviewerIds: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", minLength: 1, maxLength: 36 } },
    notes: { type: "string", maxLength: 5000 },
    scorecard: {
      type: "object",
      additionalProperties: false,
      required: ["templateId", "criteria"],
      properties: {
        templateId: { type: "string", minLength: 1, maxLength: 100 },
        criteria: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "weight"],
            properties: {
              id: { type: "string", minLength: 1, maxLength: 100 },
              label: { type: "string", minLength: 1, maxLength: 160 },
              weight: { type: "integer", minimum: 0, maximum: 100 },
              score: { type: ["integer", "null"], minimum: 1, maximum: 5 },
              note: { type: "string", maxLength: 5000 },
            },
          },
        },
      },
    },
    practicalTest: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "required", "result"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 100 },
          label: { type: "string", minLength: 1, maxLength: 200 },
          required: { type: "boolean" },
          result: { type: "string", enum: ["not-started", "passed", "failed", "pending"] },
          note: { type: "string", maxLength: 5000 },
        },
      },
    },
  },
} as const;

export const statusBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["scheduled", "in-progress", "evaluation", "completed", "no-show", "cancelled"] },
  },
} as const;

export const decisionBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "reason", "note"],
  properties: {
    decision: { type: "string", enum: ["selected", "reserve", "rejected"] },
    reason: { type: "string", minLength: 1, maxLength: 160 },
    note: { type: "string", minLength: 1, maxLength: 5000 },
  },
} as const;

export const rescheduleBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["date", "time", "interviewerIds"],
  properties: {
    date: { type: "string", format: "date" },
    time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
    timezone: { type: "string", minLength: 1, maxLength: 80 },
    interviewerIds: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", minLength: 1, maxLength: 36 } },
    reason: { type: "string", maxLength: 5000 },
  },
} as const;