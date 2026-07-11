import { prisma } from "@/config/database";
import { placesService } from "@/modules/companies/places.service";
import { companyAnalysisService } from "@/modules/companies/company-analysis.service";
import { PLAN_LIMITS, PlanName } from "@/config/constants";

const CACHE_VALIDITY_DAYS = 30;
// Se houver menos resultados em cache do que isto, vale a pena ir buscar dados frescos à API.
const MIN_CACHE_RESULTS = 5;

export interface SearchCompaniesInput {
  category: string;
  city: string;
  userId: string;
}

export type SearchSource = "cache" | "google_places" | "cache_stale";

async function getRemainingAnalysisQuota(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 0;

  const limit = PLAN_LIMITS[user.plan as PlanName].analysesPerMonth;
  if (limit === Infinity) return Infinity;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await prisma.usageLog.count({
    where: { userId, action: "analysis", createdAt: { gte: startOfMonth } },
  });

  return Math.max(0, limit - used);
}

// Dispara a análise (Website Analyzer + Scoring) para empresas ainda sem CompanyAnalysis,
// respeitando o limite de análises do plano do utilizador. Fire-and-forget: o pedido de
// pesquisa não espera pela análise terminar (PRD 4.2, ponto 6 — polling no frontend).
async function triggerAnalysisForNewCompanies(companies: Array<{ id: string; [key: string]: unknown }>, userId: string) {
  const pending = companies.filter((c) => !("analysis" in c) || c.analysis === null);
  if (pending.length === 0) return;

  const remaining = await getRemainingAnalysisQuota(userId);
  const toAnalyze = pending.slice(0, remaining);

  for (const company of toAnalyze) {
    prisma.usageLog
      .create({ data: { userId, action: "analysis" } })
      .then(() => companyAnalysisService.analyzeCompany(company as never))
      .catch((err: unknown) => console.error("Falha ao registar/disparar análise:", err));
  }
}

export const companiesService = {
  async search({ category, city, userId }: SearchCompaniesInput) {
    const cacheThreshold = new Date();
    cacheThreshold.setDate(cacheThreshold.getDate() - CACHE_VALIDITY_DAYS);

    const cached = await prisma.company.findMany({
      where: {
        category: { equals: category, mode: "insensitive" },
        city: { equals: city, mode: "insensitive" },
        lastFetchedAt: { gte: cacheThreshold },
      },
      include: { analysis: true },
      orderBy: { lastFetchedAt: "desc" },
    });

    if (cached.length >= MIN_CACHE_RESULTS) {
      void triggerAnalysisForNewCompanies(cached, userId);
      return { companies: cached, source: "cache" as SearchSource };
    }

    let fetched;
    try {
      fetched = await placesService.searchPlaces({ category, city });
    } catch (err) {
      // Graceful degradation (RNF04): se a Google Places API falhar, devolve o que
      // houver em cache — mesmo fora da janela de validade — em vez de rebentar o pedido.
      if (cached.length > 0) {
        return { companies: cached, source: "cache_stale" as SearchSource };
      }
      throw err;
    }

    const companies = await Promise.all(
      fetched.map((input) =>
        prisma.company.upsert({
          where: { placeId: input.placeId },
          update: { ...input, lastFetchedAt: new Date() },
          create: input,
          include: { analysis: true },
        })
      )
    );

    void triggerAnalysisForNewCompanies(companies, userId);

    return { companies, source: "google_places" as SearchSource };
  },

  async getById(id: string) {
    return prisma.company.findUnique({ where: { id }, include: { analysis: true } });
  },

  async getAnalysisStatus(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { analysis: true },
    });

    if (!company) return null;

    return {
      status: company.analysis ? ("done" as const) : ("pending" as const),
      analysis: company.analysis,
    };
  },
};
