import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { enforcePlanLimit } from "@/middlewares/plan-limit.middleware";
import { companiesController } from "@/modules/companies/companies.controller";

export const companiesRoutes = Router();

// Pesquisa empresas por categoria + cidade. Usa cache local (30 dias) antes de
// consultar a Google Places API. Regista o uso para controlo de limites por plano.
companiesRoutes.post("/search", requireAuth, enforcePlanLimit("search"), companiesController.search);
