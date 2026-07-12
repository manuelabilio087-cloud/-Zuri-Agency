import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { requirePlan } from "@/middlewares/plan-limit.middleware";
import { leadsController } from "@/modules/leads/leads.controller";
import { exportController } from "@/modules/leads/export.controller";

export const leadsRoutes = Router();

// Rotas estáticas ANTES de "/:id" para não colidir com o parâmetro de rota.
leadsRoutes.get("/follow-ups", requireAuth, leadsController.followUps);
leadsRoutes.get("/export/excel", requireAuth, requirePlan("STARTER", "PRO"), exportController.excel);

leadsRoutes.post("/", requireAuth, leadsController.create);
leadsRoutes.get("/", requireAuth, leadsController.list);
leadsRoutes.get("/:id", requireAuth, leadsController.getById);
leadsRoutes.patch("/:id", requireAuth, leadsController.updateStatus);
leadsRoutes.post("/:id/notes", requireAuth, leadsController.addNote);
leadsRoutes.get("/:id/export/pdf", requireAuth, requirePlan("PRO"), exportController.pdf);
