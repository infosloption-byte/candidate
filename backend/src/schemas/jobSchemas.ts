export const jobIdParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 36 } },
} as const;

export const listJobsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", maxLength: 100 },
    status: { type: "string", enum: ["draft", "open", "paused", "filled", "closed"] },
    page: { type: "integer", minimum: 1, maximum: 10000, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 100 },
  },
} as const;

export const jobBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "project", "location", "client", "profession", "openings", "requiredExperience", "requiredSkills", "preferredSkills", "status"],
  properties: {
    title: { type: "string", minLength: 2, maxLength: 160 },
    project: { type: "string", minLength: 2, maxLength: 160 },
    location: { type: "string", minLength: 2, maxLength: 160 },
    client: { type: "string", minLength: 2, maxLength: 160 },
    profession: { type: "string", minLength: 2, maxLength: 120 },
    openings: { type: "integer", minimum: 1, maximum: 100000 },
    requiredExperience: { type: "integer", minimum: 0, maximum: 60 },
    requiredSkills: { type: "array", maxItems: 50, items: { type: "string", minLength: 1, maxLength: 80 } },
    preferredSkills: { type: "array", maxItems: 50, items: { type: "string", minLength: 1, maxLength: 80 } },
    startDate: { type: ["string", "null"], format: "date" },
    deadline: { type: ["string", "null"], format: "date" },
    status: { type: "string", enum: ["draft", "open", "paused", "filled", "closed"] },
  },
} as const;

export const selectionEnvelopeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["jobs", "records", "history", "approvalByJob", "scoringByJob"],
  properties: {
    jobs: { type: "array" },
    records: { type: "array" },
    history: { type: "array" },
    approvalByJob: { type: "object" },
    scoringByJob: { type: "object" },
  },
} as const;