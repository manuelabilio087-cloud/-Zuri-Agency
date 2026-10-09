import { Response, NextFunction } from "express";
import { z } from "zod";
import { companiesService } from "@/modules/companies/companies.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

const searchSchema = z.object({
  category: z.string().min(2, "Categoria deve ter pelo menos 2 caracteres"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  radiusKm: z.number().positive().optional(), // reservado para Nearby Search (fase futura)
});

export const companiesController = {
  async search(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = searchSchema.parse(req.body);
      const result = await companiesService.search({ ...input, userId: req.userId! });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const company = await companiesService.getById(req.params.id);
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada." });
      }
      res.status(200).json(company);
    } catch (err) {
      next(err);
    }
  },

  async getAnalysisStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await companiesService.getAnalysisStatus(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Empresa não encontrada." });
      }
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  // POST /companies/:id/analyze — pede a análise (gasta 1 análise do plano se ainda não existir).
  async analyze(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = await companiesService.requestAnalysis(req.params.id, req.userId!);
      if (!status) {
        return res.status(404).json({ message: "Empresa não encontrada." });
      }
      if (status === "limit") {
        return res.status(403).json({
          message: "Atingiste o limite de análises do teu plano este mês.",
          upgradeRequired: true,
        });
      }
      res.status(200).json({ status });
    } catch (err) {
      next(err);
    }
  },
};
