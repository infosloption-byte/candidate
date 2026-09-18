export const loginBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["email", "password"],
  properties: {
    email: { type: "string", minLength: 3, maxLength: 255, format: "email" },
    password: { type: "string", minLength: 8, maxLength: 200 },
  },
} as const;