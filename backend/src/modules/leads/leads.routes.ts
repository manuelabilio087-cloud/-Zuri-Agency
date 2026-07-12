import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { leadsController } from "@/modules/leads/leads.controller";

export const leadsRoutes = Router();

// Guarda uma empresa (já pesquisada) como lead do utilizador.
leadsRoutes.post("/", requireAuth, leadsController.create);

// Lista os leads do utilizador autenticado.
leadsRoutes.get("/", requireAuth, leadsController.list);

// Nota: status, notas e follow-ups (módulo CRM completo do PRD) ficam para a próxima fase.
