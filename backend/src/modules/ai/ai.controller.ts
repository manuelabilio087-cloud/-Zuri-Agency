import { Response, NextFunction } from "express";
import { z } from "zod";
import { contentGenerationService } from "@/modules/ai/content-generation.service";
import { dailyPrioritiesService } from "@/modules/ai/daily-priorities.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

const generateContentSchema = z.object({
  leadId: z.string().uuid("leadId inválido"),
  type: z.enum(["script", "email", "whatsapp", "proposta"]),
});

export const aiController = {
  async generateContent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = generateContentSchema.parse(req.body);
      const result = await contentGenerationService.generate({ ...input, userId: req.userId! });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async dailyPriorities(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const priorities = await dailyPrioritiesService.getPriorities(req.userId!);
      res.status(200).json(priorities);
    } catch (err) {
      next(err);
    }
  },
};
