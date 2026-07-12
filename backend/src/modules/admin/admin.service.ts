import { prisma } from "@/config/database";
import { PLAN_PRICES, PlanName } from "@/config/constants";

export const adminService = {
  // GET /admin/users — lista todos os utilizadores com plano e status (sem dados sensíveis).
  async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        createdAt: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  // GET /admin/metrics — visão agregada de todo o produto.
  async getMetrics() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalUsers, usersByPlan, usageThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["plan"], _count: { plan: true } }),
      prisma.usageLog.groupBy({
        by: ["action"],
        _count: { action: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    const planDistribution = usersByPlan.reduce(
      (acc, row) => ({ ...acc, [row.plan]: row._count.plan }),
      {} as Record<PlanName, number>
    );

    const mrr = usersByPlan.reduce((total, row) => total + row._count.plan * PLAN_PRICES[row.plan as PlanName], 0);

    const usageCounts = usageThisMonth.reduce(
      (acc, row) => ({ ...acc, [row.action]: row._count.action }),
      {} as Record<string, number>
    );

    return {
      totalUsers,
      planDistribution,
      mrr, // em Metical
      usageThisMonth: {
        searches: usageCounts.search ?? 0,
        analyses: usageCounts.analysis ?? 0,
        aiGenerations: usageCounts.ai_generation ?? 0,
      },
    };
  },

  // GET /admin/users/:id — detalhe de uso de um utilizador específico.
  async getUserDetail(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        serviceType: true,
        city: true,
        createdAt: true,
        leads: {
          select: { id: true, status: true, createdAt: true, company: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) return null;

    const usageByAction = await prisma.usageLog.groupBy({
      by: ["action"],
      _count: { action: true },
      where: { userId: id },
    });

    const usageCounts = usageByAction.reduce(
      (acc, row) => ({ ...acc, [row.action]: row._count.action }),
      {} as Record<string, number>
    );

    return {
      ...user,
      usageTotals: {
        searches: usageCounts.search ?? 0,
        analyses: usageCounts.analysis ?? 0,
        aiGenerations: usageCounts.ai_generation ?? 0,
      },
    };
  },
};
