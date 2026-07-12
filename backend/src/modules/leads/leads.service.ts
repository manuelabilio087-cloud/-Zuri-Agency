import { prisma } from "@/config/database";

export const leadsService = {
  // Guarda uma empresa como lead do utilizador (idempotente: repetir não duplica).
  async create(userId: string, companyId: string) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw Object.assign(new Error("Empresa não encontrada."), { statusCode: 404 });
    }

    return prisma.lead.upsert({
      where: { userId_companyId: { userId, companyId } },
      update: {},
      create: { userId, companyId },
      include: { company: { include: { analysis: true } } },
    });
  },

  async list(userId: string) {
    return prisma.lead.findMany({
      where: { userId },
      include: { company: { include: { analysis: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
