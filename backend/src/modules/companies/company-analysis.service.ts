import type { Company, Prisma } from "@prisma/client";
import { prisma } from "@/config/database";
import { websiteAnalyzerService } from "@/modules/companies/website-analyzer.service";
import { scoringService } from "@/modules/companies/scoring.service";

// Equivalente ao `website-analysis.job.ts` do PRD. Corre hoje in-process (fire-and-forget,
// chamado a partir de companies.service.ts); numa fase seguinte deve mover para uma fila
// real (BullMQ + Redis) para não competir por recursos com pedidos HTTP em produção.
export const companyAnalysisService = {
  async analyzeCompany(company: Company): Promise<void> {
    try {
      const websiteResult = await websiteAnalyzerService.analyze(company.website);

      const websiteScore = websiteResult?.websiteScore ?? 0;
      const seoScore = websiteResult?.seoScore ?? 0;
      const technical = websiteResult?.technical ?? null;

      const scoring = scoringService.score(company, websiteScore, seoScore, technical);
      // ScoreBreakdown é uma interface concreta (sem index signature); o campo `Json` do
      // Prisma exige InputJsonValue, que requer uma index signature. O shape é sempre
      // serializável (só números e um objeto de pesos), por isso o cast é seguro aqui.
      const scoreBreakdownJson = scoring.scoreBreakdown as unknown as Prisma.InputJsonValue;

      await prisma.companyAnalysis.upsert({
        where: { companyId: company.id },
        update: {
          websiteScore,
          seoScore,
          salesScore: scoring.salesScore,
          leadTemperature: scoring.leadTemperature,
          recommendedService: scoring.recommendedService,
          closeProbability: scoring.closeProbability,
          scoreBreakdown: scoreBreakdownJson,
          analyzedAt: new Date(),
        },
        create: {
          companyId: company.id,
          websiteScore,
          seoScore,
          salesScore: scoring.salesScore,
          leadTemperature: scoring.leadTemperature,
          recommendedService: scoring.recommendedService,
          closeProbability: scoring.closeProbability,
          scoreBreakdown: scoreBreakdownJson,
        },
      });
    } catch (err) {
      // Uma falha na análise de uma empresa não deve travar as restantes nem o pedido de pesquisa.
      console.error(`Falha ao analisar empresa ${company.id}:`, err);
    }
  },
};
