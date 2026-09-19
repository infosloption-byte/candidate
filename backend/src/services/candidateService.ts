import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import {
  Availability as PrismaAvailability,
  CandidatePriority as PrismaCandidatePriority,
  CandidateSource as PrismaCandidateSource,
  CandidateStatus as PrismaCandidateStatus,
  DocumentState as PrismaDocumentState,
  DocumentType as PrismaDocumentType,
  EnglishLevel as PrismaEnglishLevel,
  UserRole,
  VisaStatus as PrismaVisaStatus,
} from "../generated/prisma/enums.js";
import { AppError } from "../errors/AppError.js";
import { withTransaction } from "../lib/db.js";
import { createAuditEvent } from "../repositories/auditRepository.js";
import {
  createCandidate as createCandidateRecord,
  createJourneyEvent,
  findCandidateById,
  findCandidates,
  findDuplicateCandidates,
  updateCandidate as updateCandidateRecord,
  type CandidateWithRelations,
  type CandidateListFilters,
} from "../repositories/candidateRepository.js";
import { findActiveUserById } from "../repositories/userRepository.js";
import type { AuthContext } from "../types/fastify.js";

export interface CreateCandidateInput {
  name: string;
  phone: string;
  passportNumber?: string;
  age?: number;
  location?: string;
  profession: string;
  originalProfession?: string;
  experienceYears: number;
  secondarySkills?: string[];
  overseasCountries?: string[];
  englishLevel: "Not assessed" | "Basic" | "Working" | "Good" | "Strong";
  locationReady?: boolean;
  drivingLicense?: boolean;
  availability: "Available now" | "Within 2 weeks" | "Within 1 month" | "Not available";
  source: "Walk-in" | "Referral" | "Agency" | "Existing database" | "Bulk import";
  tags?: string[];
  nationality?: string;
  dateOfBirth?: string;
  passportExpiry?: string;
  visaStatus?: "Not started" | "Pending" | "Approved" | "Expired" | "Not required";
  preferredDestinationCountries?: string[];
  expectedSalary?: string;
  salaryCurrency?: string;
  noticePeriod?: string;
  yearsInCurrentTrade?: number;
  tradeCertificateDetails?: string;
  drivingLicenseCategories?: string[];
  preferredInterviewLanguage?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  recruiterOwnerId?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  sourceCampaign?: string;
  duplicateOverride?: boolean;
}

export type UpdateCandidateInput = Omit<Partial<CreateCandidateInput>, "duplicateOverride" | "source">;
export type CandidateStatusInput = "new" | "screening" | "interview" | "selected" | "reserve" | "rejected";

const englishLevelMap = {
  "Not assessed": PrismaEnglishLevel.NOT_ASSESSED,
  Basic: PrismaEnglishLevel.BASIC,
  Working: PrismaEnglishLevel.WORKING,
  Good: PrismaEnglishLevel.GOOD,
  Strong: PrismaEnglishLevel.STRONG,
} satisfies Record<CreateCandidateInput["englishLevel"], PrismaEnglishLevel>;

const availabilityMap = {
  "Available now": PrismaAvailability.AVAILABLE_NOW,
  "Within 2 weeks": PrismaAvailability.WITHIN_2_WEEKS,
  "Within 1 month": PrismaAvailability.WITHIN_1_MONTH,
  "Not available": PrismaAvailability.NOT_AVAILABLE,
} satisfies Record<CreateCandidateInput["availability"], PrismaAvailability>;

const sourceMap = {
  "Walk-in": PrismaCandidateSource.WALK_IN,
  Referral: PrismaCandidateSource.REFERRAL,
  Agency: PrismaCandidateSource.AGENCY,
  "Existing database": PrismaCandidateSource.EXISTING_DATABASE,
  "Bulk import": PrismaCandidateSource.BULK_IMPORT,
} satisfies Record<CreateCandidateInput["source"], PrismaCandidateSource>;

const visaStatusMap = {
  "Not started": PrismaVisaStatus.NOT_STARTED,
  Pending: PrismaVisaStatus.PENDING,
  Approved: PrismaVisaStatus.APPROVED,
  Expired: PrismaVisaStatus.EXPIRED,
  "Not required": PrismaVisaStatus.NOT_REQUIRED,
} satisfies Record<NonNullable<CreateCandidateInput["visaStatus"]>, PrismaVisaStatus>;

const priorityMap = {
  low: PrismaCandidatePriority.LOW,
  normal: PrismaCandidatePriority.NORMAL,
  high: PrismaCandidatePriority.HIGH,
  urgent: PrismaCandidatePriority.URGENT,
} satisfies Record<NonNullable<CreateCandidateInput["priority"]>, PrismaCandidatePriority>;

const statusMap = {
  new: PrismaCandidateStatus.NEW,
  screening: PrismaCandidateStatus.SCREENING,
  interview: PrismaCandidateStatus.INTERVIEW,
  selected: PrismaCandidateStatus.SELECTED,
  reserve: PrismaCandidateStatus.RESERVE,
  rejected: PrismaCandidateStatus.REJECTED,
} satisfies Record<CandidateStatusInput, PrismaCandidateStatus>;

const frontendStatusMap: Record<PrismaCandidateStatus, CandidateStatusInput> = {
  NEW: "new",
  SCREENING: "screening",
  INTERVIEW: "interview",
  SELECTED: "selected",
  RESERVE: "reserve",
  REJECTED: "rejected",
};

export const mapEnglishLevel = (value: CreateCandidateInput["englishLevel"]): PrismaEnglishLevel => englishLevelMap[value];
export const mapAvailability = (value: CreateCandidateInput["availability"]): PrismaAvailability => availabilityMap[value];
export const mapCandidateStatus = (value: CandidateStatusInput): PrismaCandidateStatus => statusMap[value];

const statusTransitions: Record<CandidateStatusInput, readonly CandidateStatusInput[]> = {
  new: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["selected", "reserve", "rejected"],
  selected: ["reserve", "rejected"],
  reserve: ["selected", "rejected"],
  rejected: ["screening"],
};

const normalizePhone = (value: string): string => value.replace(/\D/g, "").replace(/^0+/, "");
const normalizeIdentifier = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const formatJourneyDate = (value: Date): string => value.toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const dateOnly = (value: string | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const stringArray = (value: Prisma.JsonValue): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const documentState = (records: CandidateWithRelations["documents"], type: PrismaDocumentType): "verified" | "needs-review" | "missing" => {
  const record = records.find((item) => item.type === type);
  return record?.state === PrismaDocumentState.VERIFIED ? "verified" : record ? "needs-review" : "missing";
};

const weightedInterviewScore = (candidate: CandidateWithRelations): number => {
  const scorecard = candidate.interviews[0]?.scorecard;
  if (!scorecard || scorecard.criteria.length === 0) return 0;
  const scored = scorecard.criteria.filter((criterion) => criterion.score !== null);
  const weightTotal = scored.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (weightTotal === 0) return 0;
  const weighted = scored.reduce((sum, criterion) => sum + ((criterion.score ?? 0) / 5) * criterion.weight, 0);
  return Math.round((weighted / weightTotal) * 100);
};

export const toCandidateDto = (candidate: CandidateWithRelations) => {
  const lastInterview = candidate.interviews[0];
  const decision = lastInterview?.decision;
  const result = decision === "SELECTED" || decision === "RESERVE" ? "Passed" : decision === "REJECTED" ? "Failed" : "Pending";

  return {
    id: candidate.id,
    reference: candidate.reference,
    name: candidate.name,
    phone: candidate.phone,
    passportNumber: candidate.passportNumber ?? "",
    age: candidate.age ?? 0,
    location: candidate.location,
    profession: candidate.profession,
    originalProfession: candidate.originalProfession,
    experienceYears: candidate.experienceYears,
    secondarySkills: stringArray(candidate.secondarySkills),
    overseasCountries: stringArray(candidate.overseasCountries),
    tags: stringArray(candidate.tags),
    englishLevel: ({
      NOT_ASSESSED: "Not assessed",
      BASIC: "Basic",
      WORKING: "Working",
      GOOD: "Good",
      STRONG: "Strong",
    } as const)[candidate.englishLevel],
    locationReady: candidate.locationReady,
    drivingLicense: candidate.drivingLicense,
    availability: ({
      AVAILABLE_NOW: "Available now",
      WITHIN_2_WEEKS: "Within 2 weeks",
      WITHIN_1_MONTH: "Within 1 month",
      NOT_AVAILABLE: "Not available",
    } as const)[candidate.availability],
    source: ({
      WALK_IN: "Walk-in",
      REFERRAL: "Referral",
      AGENCY: "Agency",
      EXISTING_DATABASE: "Existing database",
      BULK_IMPORT: "Bulk import",
    } as const)[candidate.source],
    status: frontendStatusMap[candidate.status],
    onboarding: {
      status: ({
        NOT_STARTED: "not-started",
        INVITED: "invited",
        IN_PROGRESS: "in-progress",
        SUBMITTED: "submitted",
        NEEDS_CHANGES: "needs-changes",
        COMPLETED: "completed",
      } as const)[candidate.onboardingStatus],
      completionPercent: candidate.onboardingCompletionPercent,
      invitedAt: candidate.onboardingInvitedAt?.toISOString(),
      lastActivityAt: candidate.onboardingLastActivityAt?.toISOString() ?? candidate.updatedAt.toISOString(),
      submittedAt: candidate.onboardingSubmittedAt?.toISOString(),
      reviewedAt: candidate.onboardingReviewedAt?.toISOString(),
      reviewerNote: candidate.onboardingReviewerNote ?? undefined,
      invitation: candidate.invitation
        ? {
            status: ({
              PENDING: "pending",
              OPENED: "opened",
              STARTED: "started",
              EXPIRED: "expired",
              CANCELLED: "cancelled",
            } as const)[candidate.invitation.status],
            sentAt: candidate.invitation.sentAt.toISOString(),
            lastSentAt: candidate.invitation.lastSentAt.toISOString(),
            expiresAt: candidate.invitation.expiresAt.toISOString(),
            openedAt: candidate.invitation.openedAt?.toISOString(),
            startedAt: candidate.invitation.startedAt?.toISOString(),
            reminderDueAt: candidate.invitation.reminderDueAt?.toISOString(),
            cancelledAt: candidate.invitation.cancelledAt?.toISOString(),
            sendCount: candidate.invitation.sendCount,
          }
        : undefined,
    },
    nationality: candidate.nationality ?? undefined,
    dateOfBirth: candidate.dateOfBirth?.toISOString().slice(0, 10),
    passportExpiry: candidate.passportExpiry?.toISOString().slice(0, 10),
    visaStatus: candidate.visaStatus ? ({
      NOT_STARTED: "Not started",
      PENDING: "Pending",
      APPROVED: "Approved",
      EXPIRED: "Expired",
      NOT_REQUIRED: "Not required",
    } as const)[candidate.visaStatus] : undefined,
    preferredDestinationCountries: stringArray(candidate.preferredDestinationCountries),
    expectedSalary: candidate.expectedSalary ?? undefined,
    salaryCurrency: candidate.salaryCurrency ?? undefined,
    noticePeriod: candidate.noticePeriod ?? undefined,
    yearsInCurrentTrade: candidate.yearsInCurrentTrade ?? undefined,
    tradeCertificateDetails: candidate.tradeCertificateDetails ?? undefined,
    drivingLicenseCategories: stringArray(candidate.drivingLicenseCategories),
    preferredInterviewLanguage: candidate.preferredInterviewLanguage ?? undefined,
    emergencyContact: candidate.emergencyName || candidate.emergencyPhone || candidate.emergencyRelationship
      ? {
          name: candidate.emergencyName ?? "",
          phone: candidate.emergencyPhone ?? "",
          relationship: candidate.emergencyRelationship ?? "",
        }
      : undefined,
    recruiterOwnerId: candidate.recruiterOwnerId ?? undefined,
    recruiterOwnerName: candidate.recruiterOwner?.name ?? undefined,
    priority: ({
      LOW: "low",
      NORMAL: "normal",
      HIGH: "high",
      URGENT: "urgent",
    } as const)[candidate.priority],
    sourceCampaign: candidate.sourceCampaign ?? undefined,
    fitScore: candidate.fitScore,
    documents: {
      passport: documentState(candidate.documents, PrismaDocumentType.PASSPORT),
      cv: documentState(candidate.documents, PrismaDocumentType.CV),
      tradeCertificate: documentState(candidate.documents, PrismaDocumentType.TRADE_CERTIFICATE),
      visa: documentState(candidate.documents, PrismaDocumentType.VISA),
    },
    lastInterview: lastInterview ? {
      date: lastInterview.startsAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }),
      interviewer: lastInterview.interviewers.map((item) => item.user.name).join(", ") || lastInterview.createdBy.name,
      role: candidate.profession,
      result,
      score: weightedInterviewScore(candidate),
      note: lastInterview.decisionNote ?? undefined,
    } : undefined,
    rejectionReason: candidate.rejectionReason ?? undefined,
    rejectionNote: candidate.rejectionNote ?? undefined,
    journey: candidate.journey.map((event) => ({
      id: event.id,
      date: formatJourneyDate(event.occurredAt),
      title: event.title,
      detail: event.detail,
      tone: ({
        NEUTRAL: "neutral",
        POSITIVE: "positive",
        WARNING: "warning",
        NEGATIVE: "negative",
      } as const)[event.tone],
    })),
    createdAt: candidate.createdAt.toISOString(),
  };
};

const generateReference = (): string => `CA-${Date.now().toString(36).toUpperCase().slice(-7)}-${Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase().padStart(2, "0")}`;

const buildCreateData = (
  auth: AuthContext,
  input: CreateCandidateInput,
  reference: string,
  recruiterOwnerId: string,
): Prisma.CandidateCreateInput => ({
  id: randomUUID(),
  reference,
  tenant: { connect: { id: auth.tenantId } },
  name: input.name.trim(),
  phone: input.phone.trim(),
  phoneNormalized: normalizePhone(input.phone),
  passportNumber: input.passportNumber?.trim() || null,
  passportNumberNormalized: input.passportNumber?.trim() ? normalizeIdentifier(input.passportNumber) : null,
  age: input.age ?? null,
  location: input.location?.trim() || "Not provided",
  profession: input.profession.trim(),
  originalProfession: input.originalProfession?.trim() || input.profession.trim(),
  experienceYears: input.experienceYears,
  secondarySkills: input.secondarySkills ?? [],
  overseasCountries: input.overseasCountries ?? [],
  tags: [],
  englishLevel: mapEnglishLevel(input.englishLevel),
  locationReady: input.locationReady ?? false,
  drivingLicense: input.drivingLicense ?? false,
  availability: mapAvailability(input.availability),
  source: sourceMap[input.source],
  status: PrismaCandidateStatus.NEW,
  onboardingStatus: "NOT_STARTED",
  nationality: input.nationality?.trim() || null,
  dateOfBirth: dateOnly(input.dateOfBirth),
  passportExpiry: dateOnly(input.passportExpiry),
  visaStatus: input.visaStatus ? visaStatusMap[input.visaStatus] : null,
  preferredDestinationCountries: input.preferredDestinationCountries ?? [],
  expectedSalary: input.expectedSalary?.trim() || null,
  salaryCurrency: input.salaryCurrency?.trim() || null,
  noticePeriod: input.noticePeriod?.trim() || null,
  yearsInCurrentTrade: input.yearsInCurrentTrade ?? null,
  tradeCertificateDetails: input.tradeCertificateDetails?.trim() || null,
  drivingLicenseCategories: input.drivingLicenseCategories ?? [],
  preferredInterviewLanguage: input.preferredInterviewLanguage?.trim() || null,
  emergencyName: input.emergencyName?.trim() || null,
  emergencyPhone: input.emergencyPhone?.trim() || null,
  emergencyRelationship: input.emergencyRelationship?.trim() || null,
  recruiterOwner: { connect: { id: recruiterOwnerId } },
  priority: input.priority ? priorityMap[input.priority] : PrismaCandidatePriority.NORMAL,
  sourceCampaign: input.sourceCampaign?.trim() || null,
  fitScore: 0,
});

const duplicateScore = (
  input: CreateCandidateInput,
  match: { name: string; phoneNormalized: string; passportNumberNormalized: string | null; profession: string; age: number | null },
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 0;
  const phone = normalizePhone(input.phone);
  const passport = input.passportNumber ? normalizeIdentifier(input.passportNumber) : null;
  const name = input.name.trim().toLowerCase();
  const profession = input.profession.trim().toLowerCase();

  if (phone && phone === match.phoneNormalized) {
    score += 70;
    reasons.push("Same phone number");
  }
  if (passport && passport === match.passportNumberNormalized) {
    score += 80;
    reasons.push("Same passport number");
  }
  if (name && name === match.name.trim().toLowerCase()) {
    score += 35;
    reasons.push("Same full name");
  }
  if (profession === match.profession.trim().toLowerCase()) score += 10;
  if (input.age && match.age && Math.abs(input.age - match.age) <= 1) {
    score += 10;
    reasons.push("Age is within one year");
  }

  return { score: Math.min(score, 100), reasons };
};

export const listCandidates = async (query: CandidateListFilters) => {
  const result = await findCandidates(query);
  return {
    items: result.items.map(toCandidateDto),
    total: result.total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
  };
};

export const getCandidate = async (tenantId: string, id: string) => {
  const candidate = await findCandidateById(tenantId, id);
  if (!candidate) throw AppError.notFound("Candidate not found.");
  return toCandidateDto(candidate);
};

export const createCandidate = async (auth: AuthContext, input: CreateCandidateInput) => {
  const ownerId = input.recruiterOwnerId ?? auth.userId;
  const owner = await findActiveUserById(auth.tenantId, ownerId);
  if (!owner || (owner.role !== UserRole.RECRUITER && owner.role !== UserRole.SYSTEM_ADMIN)) {
    throw AppError.forbidden("The recruiter owner is not valid for this tenant.");
  }

  const normalizedPhone = normalizePhone(input.phone);
  const normalizedPassport = input.passportNumber?.trim() ? normalizeIdentifier(input.passportNumber) : null;
  const duplicates = await findDuplicateCandidates(
    auth.tenantId,
    normalizedPhone,
    normalizedPassport,
    input.name.trim(),
    input.profession.trim(),
  );

  const duplicateMatches = duplicates.map((match) => {
    const scored = duplicateScore(input, match);
    return {
      candidateId: match.id,
      candidateName: match.name,
      confidence: scored.score >= 70 ? "high" : "possible",
      score: scored.score,
      reasons: scored.reasons,
    };
  }).filter((match) => match.score > 0).sort((left, right) => right.score - left.score);

  const highConfidence = duplicateMatches.filter((match) => match.confidence === "high");
  if (highConfidence.length > 0 && !input.duplicateOverride) {
    throw AppError.duplicate(
      "A high-confidence candidate duplicate was detected.",
      highConfidence.map((match) => ({
        field: "candidate",
        code: "DUPLICATE_MATCH",
        message: `${match.candidateName}: ${match.reasons.join(", ")}`,
      })),
    );
  }

  const reference = generateReference();
  const candidateId = randomUUID();
  const now = new Date();
  const data = buildCreateData(auth, input, reference, ownerId);
  data.id = candidateId;

  await withTransaction(async (tx) => {
    await createCandidateRecord(tx, data);
    await createJourneyEvent(tx, {
      id: randomUUID(),
      tenantId: auth.tenantId,
      candidateId,
      title: "Candidate added",
      detail: "Candidate record was created through the backend API.",
      tone: "NEUTRAL",
      occurredAt: now,
    });
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Candidate",
      entityId: candidateId,
      action: input.duplicateOverride ? "candidate.created_duplicate_override" : "candidate.created",
      metadata: {
        reference,
        duplicateCount: duplicateMatches.length,
      },
    }, tx);
  });

  return getCandidate(auth.tenantId, candidateId);
};

export const updateCandidate = async (auth: AuthContext, id: string, input: UpdateCandidateInput) => {
  const existing = await findCandidateById(auth.tenantId, id);
  if (!existing) throw AppError.notFound("Candidate not found.");

  if (input.recruiterOwnerId !== undefined) {
    const owner = await findActiveUserById(auth.tenantId, input.recruiterOwnerId);
    if (!owner || (owner.role !== UserRole.RECRUITER && owner.role !== UserRole.SYSTEM_ADMIN)) {
      throw AppError.forbidden("The recruiter owner is not valid for this tenant.");
    }
  }

  const changes: Prisma.CandidateUpdateInput = {};
  if (input.name !== undefined) changes.name = input.name.trim();
  if (input.phone !== undefined) {
    changes.phone = input.phone.trim();
    changes.phoneNormalized = normalizePhone(input.phone);
  }
  if (input.passportNumber !== undefined) {
    const value = input.passportNumber.trim();
    changes.passportNumber = value || null;
    changes.passportNumberNormalized = value ? normalizeIdentifier(value) : null;
  }
  if (input.age !== undefined) changes.age = input.age;
  if (input.location !== undefined) changes.location = input.location.trim();
  if (input.profession !== undefined) changes.profession = input.profession.trim();
  if (input.originalProfession !== undefined) changes.originalProfession = input.originalProfession.trim();
  if (input.experienceYears !== undefined) changes.experienceYears = input.experienceYears;
  if (input.secondarySkills !== undefined) changes.secondarySkills = input.secondarySkills;
  if (input.overseasCountries !== undefined) changes.overseasCountries = input.overseasCountries;
  if (input.englishLevel !== undefined) changes.englishLevel = mapEnglishLevel(input.englishLevel);
  if (input.locationReady !== undefined) changes.locationReady = input.locationReady;
  if (input.drivingLicense !== undefined) changes.drivingLicense = input.drivingLicense;
  if (input.availability !== undefined) changes.availability = mapAvailability(input.availability);
  if (input.nationality !== undefined) changes.nationality = input.nationality.trim() || null;
  if (input.dateOfBirth !== undefined) changes.dateOfBirth = dateOnly(input.dateOfBirth);
  if (input.passportExpiry !== undefined) changes.passportExpiry = dateOnly(input.passportExpiry);
  if (input.visaStatus !== undefined) changes.visaStatus = visaStatusMap[input.visaStatus];
  if (input.preferredDestinationCountries !== undefined) changes.preferredDestinationCountries = input.preferredDestinationCountries;
  if (input.expectedSalary !== undefined) changes.expectedSalary = input.expectedSalary.trim() || null;
  if (input.salaryCurrency !== undefined) changes.salaryCurrency = input.salaryCurrency.trim() || null;
  if (input.noticePeriod !== undefined) changes.noticePeriod = input.noticePeriod.trim() || null;
  if (input.yearsInCurrentTrade !== undefined) changes.yearsInCurrentTrade = input.yearsInCurrentTrade;
  if (input.tradeCertificateDetails !== undefined) changes.tradeCertificateDetails = input.tradeCertificateDetails.trim() || null;
  if (input.drivingLicenseCategories !== undefined) changes.drivingLicenseCategories = input.drivingLicenseCategories;
  if (input.preferredInterviewLanguage !== undefined) changes.preferredInterviewLanguage = input.preferredInterviewLanguage.trim() || null;
  if (input.emergencyName !== undefined) changes.emergencyName = input.emergencyName.trim() || null;
  if (input.emergencyPhone !== undefined) changes.emergencyPhone = input.emergencyPhone.trim() || null;
  if (input.emergencyRelationship !== undefined) changes.emergencyRelationship = input.emergencyRelationship.trim() || null;
  if (input.recruiterOwnerId !== undefined) changes.recruiterOwner = { connect: { id: input.recruiterOwnerId } };
  if (input.priority !== undefined) changes.priority = priorityMap[input.priority];
  if (input.sourceCampaign !== undefined) changes.sourceCampaign = input.sourceCampaign.trim() || null;
  if (input.tags !== undefined) changes.tags = input.tags;

  if (Object.keys(changes).length === 0) return toCandidateDto(existing);

  const now = new Date();
  await withTransaction(async (tx) => {
    await updateCandidateRecord(tx, auth.tenantId, id, changes);
    await createJourneyEvent(tx, {
      id: randomUUID(),
      tenantId: auth.tenantId,
      candidateId: id,
      title: "Candidate profile updated",
      detail: "Candidate profile details were updated through the backend API.",
      tone: "NEUTRAL",
      occurredAt: now,
    });
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Candidate",
      entityId: id,
      action: "candidate.updated",
      metadata: { fields: Object.keys(changes) },
    }, tx);
  });

  return getCandidate(auth.tenantId, id);
};

export const changeCandidateStatus = async (
  auth: AuthContext,
  id: string,
  nextStatus: CandidateStatusInput,
  reason = "",
  note = "",
) => {
  const existing = await findCandidateById(auth.tenantId, id);
  if (!existing) throw AppError.notFound("Candidate not found.");

  const currentStatus = frontendStatusMap[existing.status];
  if (currentStatus === nextStatus) return toCandidateDto(existing);
  if (!statusTransitions[currentStatus].includes(nextStatus)) {
    throw AppError.invalidState(`Candidate cannot move from ${currentStatus} to ${nextStatus}.`);
  }

  if (nextStatus === "rejected" && !note.trim()) {
    throw AppError.invalidInput("A rejection note is required when rejecting a candidate.", [
      { field: "note", code: "REQUIRED", message: "Provide the observed gap or rejection explanation." },
    ]);
  }

  const now = new Date();
  const detail = nextStatus === "rejected" && reason.trim()
    ? `${reason.trim()}: ${note.trim()}`
    : note.trim() || `Candidate status changed from ${currentStatus} to ${nextStatus}.`;

  await withTransaction(async (tx) => {
    await updateCandidateRecord(tx, auth.tenantId, id, {
      status: statusMap[nextStatus],
      rejectionReason: nextStatus === "rejected" ? reason.trim() || null : null,
      rejectionNote: nextStatus === "rejected" ? note.trim() : null,
    });
    await createJourneyEvent(tx, {
      id: randomUUID(),
      tenantId: auth.tenantId,
      candidateId: id,
      title: ({
        new: "Candidate added",
        screening: "Screening started",
        interview: "Moved to interview",
        selected: "Selected",
        reserve: "Placed on reserve",
        rejected: "Rejected",
      } as const)[nextStatus],
      detail,
      tone: ({
        new: "NEUTRAL",
        screening: "WARNING",
        interview: "NEUTRAL",
        selected: "POSITIVE",
        reserve: "WARNING",
        rejected: "NEGATIVE",
      } as const)[nextStatus],
      occurredAt: now,
    });
    await createAuditEvent({
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      entityType: "Candidate",
      entityId: id,
      action: "candidate.status_changed",
      metadata: {
        from: currentStatus,
        to: nextStatus,
        reason: reason.trim(),
        note: note.trim(),
      },
    }, tx);
  });

  return getCandidate(auth.tenantId, id);
};