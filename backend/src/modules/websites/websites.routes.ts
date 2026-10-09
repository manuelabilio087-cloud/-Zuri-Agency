import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { requirePlan } from "@/middlewares/plan-limit.middleware";
import { websitesController } from "@/modules/websites/websites.controller";

// Criador de sites — exclusivo do plano Pro.
export const websitesRoutes = Router();

websitesRoutes.use(requireAuth, requirePlan("PRO"));

websitesRoutes.get("/", websitesController.list);
websitesRoutes.post("/", websitesController.create);
websitesRoutes.get("/:id", websitesController.get);
websitesRoutes.patch("/:id", websitesController.update);
websitesRoutes.delete("/:id", websitesController.remove);
websitesRoutes.get("/:id/preview", websitesController.preview);
websitesRoutes.post("/:id/preview", websitesController.preview);
websitesRoutes.get("/:id/download", websitesController.download);

// Rotas públicas (sem login) — sites publicados.
export const publicSitesRoutes = Router();

publicSitesRoutes.get("/sites/:slug", websitesController.publicSite);
