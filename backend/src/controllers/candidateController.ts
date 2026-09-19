import type { FastifyReply, FastifyRequest } from "fastify";
import {
  Availability as PrismaAvailability,
  CandidateStatus as PrismaCandidateStatus,
  EnglishLevel as PrismaEnglishLevel,
} from "../generated/prisma/enums.js";
import { AppError } from "../errors/AppError.js";
import {
  changeCandidateStatus,
  createCandidate,
  getCandidate,
  listCandidates,
  mapAvailability,
  mapCandidateStatus,
  mapEnglishLevel,
  updateCandidate,
  type CandidateStatusInput,
  type CreateCandidateInput,
  type UpdateCandidateInput,
} from "../services/candidateService.js";
import type { AuthContext } from "../types/fastify.js";

export interface CandidateParams { id: string; }
export interface CandidateQuery {
  search?: string;
  status?: CandidateStatusInput;
  profession?: string;
  minExperience?: number;
  maxExperience?: number;
  englishLevel?: CreateCandidateInput["englishLevel"];
  availability?: CreateCandidateInput["availability"];
  overseasExperience?: "all" | "yes" | "no";
  drivingLicense?: "all" | "yes" | "no";
  skills?: string;
  page?: number;
  pageSize?: number;
}
export interface StatusBody {
  status: CandidateStatusInput;
  reason?: string;
  note?: string;
}

const authOrThrow = (request: FastifyRequest): AuthContext => {
  if (!request.auth) throw AppError.unauthenticated();
  return request.auth;
};

export const listCandidatesController = async (
  request: FastifyRequest<{ Querystring: CandidateQuery }>,
) => {
  const auth = authOrThrow(request);
  const query = request.query;
  const filters = {
    tenantId: auth.tenantId,
    search: query.search,
    status: query.status ? mapCandidateStatus(query.status) as PrismaCandidateStatus : undefined,
    profession: query.profession,
    minExperience: query.minExperience,
    maxExperience: query.maxExperience,
    englishLevel: query.englishLevel ? mapEnglishLevel(query.englishLevel) as PrismaEnglishLevel : undefined,
    availability: query.availability ? mapAvailability(query.availability) as PrismaAvailability : undefined,
    overseasExperience: query.overseasExperience,
    drivingLicense: query.drivingLicense,
    skills: query.skills?.split(",").map((value) => value.trim()).filter(Boolean),
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 100,
  };
  return { success: true, data: await listCandidates(filters) };
};

export const getCandidateController = async (
  request: FastifyRequest<{ Params: CandidateParams }>,
) => {
  const auth = authOrThrow(request);
  return { success: true, data: await getCandidate(auth.tenantId, request.params.id) };
};

export const createCandidateController = async (
  request: FastifyRequest<{ Body: CreateCandidateInput }>,
  reply: FastifyReply,
): Promise<void> => {
  const auth = authOrThrow(request);
  const candidate = await createCandidate(auth, request.body);
  reply.code(201).send({ success: true, data: candidate });
};

export const updateCandidateController = async (
  request: FastifyRequest<{ Params: CandidateParams; Body: UpdateCandidateInput }>,
) => {
  const auth = authOrThrow(request);
  return { success: true, data: await updateCandidate(auth, request.params.id, request.body) };
};

export const changeCandidateStatusController = async (
  request: FastifyRequest<{ Params: CandidateParams; Body: StatusBody }>,
) => {
  const auth = authOrThrow(request);
  return {
    success: true,
    data: await changeCandidateStatus(auth, request.params.id, request.body.status, request.body.reason, request.body.note),
  };
};