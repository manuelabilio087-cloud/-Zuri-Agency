import type { Company } from "@prisma/client";
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

      await prisma.companyAnalysis.upsert({
        where: { companyId: company.id },
        update: {
          websiteScore,
          seoScore,
          salesScore: scoring.salesScore,
          leadTemperature: scoring.leadTemperature,
          recommendedService: scoring.recommendedService,
          closeProbability: scoring.closeProbability,
          scoreBreakdown: scoring.scoreBreakdown,
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
          scoreBreakdown: scoring.scoreBreakdown,
        },
      });
    } catch (err) {
      // Uma falha na análise de uma empresa não deve travar as restantes nem o pedido de pesquisa.
      console.error(`Falha ao analisar empresa ${company.id}:`, err);
    }
  },
};
