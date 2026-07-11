import { Response, NextFunction } from "express";
import { prisma } from "@/config/database";
import { PLAN_LIMITS, PlanName } from "@/config/constants";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

type UsageAction = "search" | "analysis" | "ai_generation";

const actionToLimitKey: Record<UsageAction, keyof typeof PLAN_LIMITS.FREE> = {
  search: "searchesPerMonth",
  analysis: "analysesPerMonth",
  ai_generation: "aiGenerationsPerMonth",
};

// Verifica se o utilizador ainda está dentro do limite do seu plano para a ação dada.
// Uso: router.post('/search', requireAuth, enforcePlanLimit('search'), controller)
export function enforcePlanLimit(action: UsageAction) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(401).json({ message: "Utilizador não encontrado." });
      }

      const plan = user.plan as PlanName;
      const limit = PLAN_LIMITS[plan][actionToLimitKey[action]];

      if (limit !== Infinity) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const usageCount = await prisma.usageLog.count({
          where: { userId, action, createdAt: { gte: startOfMonth } },
        });

        if (usageCount >= limit) {
          return res.status(403).json({
            message: "Limite do plano atingido para esta funcionalidade.",
            upgradeRequired: true,
          });
        }
      }

      // Regista o uso (fire-and-forget não é ideal aqui; aguardamos para consistência)
      await prisma.usageLog.create({ data: { userId, action } });

      next();
    } catch (err) {
      next(err);
    }
  };
}
