import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError.js";
import { closeJobRecord, createJobRecord, getJob, listJobs, updateJobRecord, type JobInput } from "../services/jobService.js";

export interface Params { id: string; }
export interface ListQuery {
  search?: string;
  status?: "draft" | "open" | "paused" | "filled" | "closed";
  page?: number;
  pageSize?: number;
}

const auth = (request: FastifyRequest) => {
  if (!request.auth) throw AppError.unauthenticated();
  return request.auth;
};

export const listJobsController = async (request: FastifyRequest<{ Querystring: ListQuery }>) => {
  const current = auth(request);
  const map: Record<NonNullable<ListQuery["status"]>, "DRAFT" | "OPEN" | "PAUSED" | "FILLED" | "CLOSED"> = {
    draft: "DRAFT", open: "OPEN", paused: "PAUSED", filled: "FILLED", closed: "CLOSED",
  };
  return { success: true, data: await listJobs({
    tenantId: current.tenantId,
    search: request.query.search,
    status: request.query.status ? map[request.query.status] : undefined,
    page: request.query.page ?? 1,
    pageSize: request.query.pageSize ?? 100,
  }) };
};

export const getJobController = async (request: FastifyRequest<{ Params: Params }>) => {
  const current = auth(request);
  return { success: true, data: await getJob(current.tenantId, request.params.id) };
};

export const createJobController = async (request: FastifyRequest<{ Body: JobInput }>, reply: FastifyReply): Promise<void> => {
  const current = auth(request);
  reply.code(201).send({ success: true, data: await createJobRecord(current, request.body) });
};

export const updateJobController = async (request: FastifyRequest<{ Params: Params; Body: JobInput }>) => {
  const current = auth(request);
  return { success: true, data: await updateJobRecord(current, request.params.id, request.body) };
};

export const closeJobController = async (request: FastifyRequest<{ Params: Params }>) => {
  const current = auth(request);
  return { success: true, data: await closeJobRecord(current, request.params.id) };
};