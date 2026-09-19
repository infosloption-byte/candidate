import type { FastifyPluginAsync } from "fastify";
import { jobBodySchema, jobIdParamsSchema, listJobsQuerySchema } from "../schemas/jobSchemas.js";
import { closeJobController, createJobController, getJobController, listJobsController, updateJobController } from "../controllers/jobController.js";

export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.get("/jobs", { onRequest: [app.authenticate, app.authorize("job.view")], schema: { querystring: listJobsQuerySchema } }, listJobsController);
  app.get<{ Params: { id: string } }>("/jobs/:id", { onRequest: [app.authenticate, app.authorize("job.view")], schema: { params: jobIdParamsSchema } }, getJobController);
  app.post("/jobs", { onRequest: [app.authenticate, app.authorize("job.manage")], schema: { body: jobBodySchema } }, createJobController);
  app.patch<{ Params: { id: string } }>("/jobs/:id", { onRequest: [app.authenticate, app.authorize("job.manage")], schema: { params: jobIdParamsSchema, body: jobBodySchema } }, updateJobController);
  app.post<{ Params: { id: string } }>("/jobs/:id/close", { onRequest: [app.authenticate, app.authorize("job.manage")], schema: { params: jobIdParamsSchema } }, closeJobController);
};