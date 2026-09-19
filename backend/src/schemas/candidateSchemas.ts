export const candidateIdParamsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 36 },
  },
} as const;

export const listCandidatesQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", maxLength: 100 },
    status: { type: "string", enum: ["new", "screening", "interview", "selected", "reserve", "rejected"] },
    profession: { type: "string", maxLength: 120 },
    minExperience: { type: "integer", minimum: 0, maximum: 60 },
    maxExperience: { type: "integer", minimum: 0, maximum: 60 },
    englishLevel: { type: "string", enum: ["Not assessed", "Basic", "Working", "Good", "Strong"] },
    availability: { type: "string", enum: ["Available now", "Within 2 weeks", "Within 1 month", "Not available"] },
    overseasExperience: { type: "string", enum: ["all", "yes", "no"] },
    drivingLicense: { type: "string", enum: ["all", "yes", "no"] },
    skills: { type: "string", maxLength: 500 },
    page: { type: "integer", minimum: 1, maximum: 10000, default: 1 },
    pageSize: { type: "integer", minimum: 1, maximum: 100, default: 100 },
  },
} as const;

const sharedFields = {
  name: { type: "string", minLength: 2, maxLength: 160 },
  phone: { type: "string", minLength: 7, maxLength: 60 },
  passportNumber: { type: "string", maxLength: 80 },
  age: { type: "integer", minimum: 18, maximum: 90 },
  location: { type: "string", maxLength: 160 },
  profession: { type: "string", minLength: 2, maxLength: 120 },
  originalProfession: { type: "string", maxLength: 120 },
  experienceYears: { type: "integer", minimum: 0, maximum: 60 },
  secondarySkills: { type: "array", maxItems: 30, items: { type: "string", minLength: 1, maxLength: 80 } },
  overseasCountries: { type: "array", maxItems: 30, items: { type: "string", minLength: 1, maxLength: 80 } },
  englishLevel: { type: "string", enum: ["Not assessed", "Basic", "Working", "Good", "Strong"] },
  locationReady: { type: "boolean" },
  drivingLicense: { type: "boolean" },
  availability: { type: "string", enum: ["Available now", "Within 2 weeks", "Within 1 month", "Not available"] },
  source: { type: "string", enum: ["Walk-in", "Referral", "Agency", "Existing database", "Bulk import"] },
  tags: { type: "array", maxItems: 30, items: { type: "string", minLength: 1, maxLength: 80 } },
  nationality: { type: "string", maxLength: 100 },
  dateOfBirth: { type: "string", format: "date" },
  passportExpiry: { type: "string", format: "date" },
  visaStatus: { type: "string", enum: ["Not started", "Pending", "Approved", "Expired", "Not required"] },
  preferredDestinationCountries: { type: "array", maxItems: 30, items: { type: "string", minLength: 1, maxLength: 80 } },
  expectedSalary: { type: "string", maxLength: 80 },
  salaryCurrency: { type: "string", maxLength: 12 },
  noticePeriod: { type: "string", maxLength: 80 },
  yearsInCurrentTrade: { type: "integer", minimum: 0, maximum: 60 },
  tradeCertificateDetails: { type: "string", maxLength: 5000 },
  drivingLicenseCategories: { type: "array", maxItems: 20, items: { type: "string", minLength: 1, maxLength: 20 } },
  preferredInterviewLanguage: { type: "string", maxLength: 80 },
  emergencyName: { type: "string", maxLength: 160 },
  emergencyPhone: { type: "string", maxLength: 60 },
  emergencyRelationship: { type: "string", maxLength: 80 },
  recruiterOwnerId: { type: "string", maxLength: 36 },
  priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
  sourceCampaign: { type: "string", maxLength: 160 },
} as const;

export const createCandidateBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "phone", "profession", "experienceYears", "englishLevel", "availability", "source"],
  properties: {
    ...sharedFields,
    duplicateOverride: { type: "boolean", default: false },
  },
} as const;

export const updateCandidateBodySchema = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: sharedFields,
} as const;

export const updateCandidateStatusBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["new", "screening", "interview", "selected", "reserve", "rejected"] },
    reason: { type: "string", maxLength: 160 },
    note: { type: "string", maxLength: 5000 },
  },
} as const;