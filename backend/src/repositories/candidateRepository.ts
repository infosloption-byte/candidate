import { Prisma } from "../generated/prisma/client.js";
import type {
  Availability as PrismaAvailability,
  CandidateStatus as PrismaCandidateStatus,
  EnglishLevel as PrismaEnglishLevel,
} from "../generated/prisma/enums.js";
import type { DbClient } from "../lib/db.js";
import { prisma } from "../lib/prisma.js";

export type CandidateWithRelations = Prisma.CandidateGetPayload<{
  include: {
    documents: true;
    journey: { orderBy: { occurredAt: "desc" }; take: 20 };
    interviews: {
      orderBy: { startsAt: "desc" };
      take: 1;
      include: {
        createdBy: true;
        interviewers: { include: { user: true } };
        scorecard: { include: { criteria: true } };
      };
    };
    recruiterOwner: true;
  };
}>;

export interface CandidateListFilters {
  tenantId: string;
  search?: string;
  status?: PrismaCandidateStatus;
  profession?: string;
  minExperience?: number;
  maxExperience?: number;
  englishLevel?: PrismaEnglishLevel;
  availability?: PrismaAvailability;
  overseasExperience?: "all" | "yes" | "no";
  drivingLicense?: "all" | "yes" | "no";
  skills?: string[];
  page: number;
  pageSize: number;
}

const includeRelations = {
  documents: true,
  journey: { orderBy: { occurredAt: "desc" as const }, take: 20 },
  interviews: {
    orderBy: { startsAt: "desc" as const },
    take: 1,
    include: {
      createdBy: true,
      interviewers: { include: { user: true } },
      scorecard: { include: { criteria: true } },
    },
  },
  recruiterOwner: true,
};

const buildWhere = (filters: CandidateListFilters): Prisma.CandidateWhereInput => {
  const and: Prisma.CandidateWhereInput[] = [{ tenantId: filters.tenantId }];

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    and.push({
      OR: [
        { name: { contains: query } },
        { reference: { contains: query } },
        { profession: { contains: query } },
        { originalProfession: { contains: query } },
        { location: { contains: query } },
        { phone: { contains: query } },
        { passportNumber: { contains: query } },
        { sourceCampaign: { contains: query } },
      ],
    });
  }

  if (filters.status) and.push({ status: filters.status });
  if (filters.profession) and.push({ profession: { equals: filters.profession } });
  if (filters.minExperience !== undefined) and.push({ experienceYears: { gte: filters.minExperience } });
  if (filters.maxExperience !== undefined) and.push({ experienceYears: { lte: filters.maxExperience } });
  if (filters.englishLevel) and.push({ englishLevel: filters.englishLevel });
  if (filters.availability) and.push({ availability: filters.availability });
  if (filters.drivingLicense === "yes") and.push({ drivingLicense: true });
  if (filters.drivingLicense === "no") and.push({ drivingLicense: false });
  if (filters.overseasExperience === "no") and.push({ overseasCountries: { equals: [] } });
  if (filters.overseasExperience === "yes") and.push({ NOT: { overseasCountries: { equals: [] } } });
  if (filters.skills && filters.skills.length > 0) {
    and.push({ secondarySkills: { array_contains: filters.skills } });
  }

  return { AND: and };
};

export const findCandidates = async (filters: CandidateListFilters): Promise<{ items: CandidateWithRelations[]; total: number }> => {
  const where = buildWhere(filters);
  const [items, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: includeRelations,
    }),
    prisma.candidate.count({ where }),
  ]);
  return { items, total };
};

export const findCandidateById = async (tenantId: string, id: string): Promise<CandidateWithRelations | null> =>
  prisma.candidate.findFirst({
    where: { tenantId, id },
    include: includeRelations,
  });

export const findDuplicateCandidates = async (
  tenantId: string,
  normalizedPhone: string,
  normalizedPassport: string | null,
  normalizedName: string,
  profession: string,
) =>
  prisma.candidate.findMany({
    where: {
      tenantId,
      OR: [
        ...(normalizedPhone ? [{ phoneNormalized: normalizedPhone }] : []),
        ...(normalizedPassport ? [{ passportNumberNormalized: normalizedPassport }] : []),
        ...(normalizedName ? [{ name: { equals: normalizedName } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      phoneNormalized: true,
      passportNumberNormalized: true,
      profession: true,
      age: true,
    },
  });

export const createCandidate = async (tx: DbClient, data: Prisma.CandidateCreateInput): Promise<void> => {
  await tx.candidate.create({ data });
};

export const createJourneyEvent = async (
  tx: DbClient,
  data: Prisma.CandidateJourneyEventUncheckedCreateInput,
): Promise<void> => {
  await tx.candidateJourneyEvent.create({ data });
};

export const updateCandidate = async (
  tx: DbClient,
  tenantId: string,
  id: string,
  data: Prisma.CandidateUpdateInput,
): Promise<void> => {
  const result = await tx.candidate.updateMany({
    where: { id, tenantId },
    data,
  });
  if (result.count !== 1) {
    throw new Error("Candidate tenant mismatch.");
  }
};