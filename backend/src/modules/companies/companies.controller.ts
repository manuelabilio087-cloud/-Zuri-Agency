import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { companiesService } from "@/modules/companies/companies.service";

const searchSchema = z.object({
  category: z.string().min(2, "Categoria deve ter pelo menos 2 caracteres"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  radiusKm: z.number().positive().optional(), // reservado para Nearby Search (fase futura)
});

export const companiesController = {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const input = searchSchema.parse(req.body);
      const result = await companiesService.search(input);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
