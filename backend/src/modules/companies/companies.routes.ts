import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "@/modules/auth/auth.middleware";
import { enforcePlanLimit } from "@/middlewares/plan-limit.middleware";

export const companiesRoutes = Router();

// Placeholder: integração com Google Places API entra aqui (companies.service.ts + places.service.ts)
companiesRoutes.get("/search", requireAuth, enforcePlanLimit("search"), async (req: AuthenticatedRequest, res) => {
  res.status(200).json({
    message: "Endpoint de pesquisa pronto. Integração com Google Places API por implementar.",
    query: req.query,
  });
});
