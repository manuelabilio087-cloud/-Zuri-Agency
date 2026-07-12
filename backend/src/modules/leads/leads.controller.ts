import { Response, NextFunction } from "express";
import { z } from "zod";
import { leadsService } from "@/modules/leads/leads.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

const createSchema = z.object({
  companyId: z.string().uuid("companyId inválido"),
});

export const leadsController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { companyId } = createSchema.parse(req.body);
      const lead = await leadsService.create(req.userId!, companyId);
      res.status(201).json(lead);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const leads = await leadsService.list(req.userId!);
      res.status(200).json(leads);
    } catch (err) {
      next(err);
    }
  },
};
