import { Response, NextFunction } from "express";
import { z } from "zod";
import { LeadStatus } from "@prisma/client";
import { leadsService } from "@/modules/leads/leads.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

const createSchema = z.object({
  companyId: z.string().uuid("companyId inválido"),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  temperature: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});

const addNoteSchema = z.object({
  content: z.string().min(1, "A nota não pode estar vazia."),
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
      const filters = listQuerySchema.parse(req.query);
      const leads = await leadsService.list(req.userId!, filters);
      res.status(200).json(leads);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = updateStatusSchema.parse(req.body);
      const lead = await leadsService.updateStatus(req.userId!, req.params.id, status);
      res.status(200).json(lead);
    } catch (err) {
      next(err);
    }
  },

  async addNote(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { content } = addNoteSchema.parse(req.body);
      const lead = await leadsService.addNote(req.userId!, req.params.id, content);
      res.status(201).json(lead);
    } catch (err) {
      next(err);
    }
  },

  async followUps(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const leads = await leadsService.getFollowUps(req.userId!);
      res.status(200).json(leads);
    } catch (err) {
      next(err);
    }
  },
};
