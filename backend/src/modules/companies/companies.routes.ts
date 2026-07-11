import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { enforcePlanLimit } from "@/middlewares/plan-limit.middleware";
import { companiesController } from "@/modules/companies/companies.controller";

export const companiesRoutes = Router();

// Pesquisa empresas por categoria + cidade. Usa cache local (30 dias) antes de
// consultar a Google Places API, e dispara a análise (website + scoring) em background
// para as empresas devolvidas, respeitando o limite de análises do plano.
companiesRoutes.post("/search", requireAuth, enforcePlanLimit("search"), companiesController.search);

// Ficha completa da empresa, incluindo a análise (quando já estiver pronta).
companiesRoutes.get("/:id", requireAuth, companiesController.getById);

// Polling do frontend enquanto a análise em background ainda não terminou.
companiesRoutes.get("/:id/analysis-status", requireAuth, companiesController.getAnalysisStatus);
