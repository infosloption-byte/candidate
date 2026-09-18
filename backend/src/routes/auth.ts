import type { FastifyPluginAsync } from "fastify";
import { loginBodySchema } from "../schemas/authSchemas.js";
import { currentUserController, loginController, logoutController } from "../controllers/authController.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    schema: { body: loginBodySchema },
  }, loginController);

  app.post("/auth/logout", {
    onRequest: [app.authenticate],
  }, logoutController);

  app.get("/auth/me", {
    onRequest: [app.authenticate],
  }, currentUserController);
};