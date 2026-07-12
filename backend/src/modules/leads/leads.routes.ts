import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { leadsController } from "@/modules/leads/leads.controller";

export const leadsRoutes = Router();

// Rota estática ANTES de "/:id" para não colidir com o parâmetro de rota.
leadsRoutes.get("/follow-ups", requireAuth, leadsController.followUps);

leadsRoutes.post("/", requireAuth, leadsController.create);
leadsRoutes.get("/", requireAuth, leadsController.list);
leadsRoutes.patch("/:id", requireAuth, leadsController.updateStatus);
leadsRoutes.post("/:id/notes", requireAuth, leadsController.addNote);
