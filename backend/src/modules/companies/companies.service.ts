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

export async function getRemainingAnalysisQuota(userId: string): Promise<number> {
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

export type AnalysisRequestStatus = "done" | "pending" | "limit";

// Dispara a análise (Website Analyzer + Scoring) dos resultados de pesquisa — só para
// planos com análises ilimitadas (Pro). Nos planos com limite, as análises são gastas
// apenas nas empresas que o utilizador guarda como lead (ver requestAnalysis), para não
// esgotar a quota em resultados que nem lhe interessam.
async function triggerAnalysisForNewCompanies(companies: Array<{ id: string; [key: string]: unknown }>, userId: string) {
  const pending = companies.filter((c) => !("analysis" in c) || c.analysis === null);
  if (pending.length === 0) return;

  const remaining = await getRemainingAnalysisQuota(userId);
  if (remaining !== Infinity) return;

  for (const company of pending) {
    if (!companyAnalysisService.tryReserve(company.id)) continue;
    prisma.usageLog
      .create({ data: { userId, action: "analysis" } })
      .then(() => companyAnalysisService.analyzeCompany(company as never))
      .catch((err: unknown) => {
        companyAnalysisService.release(company.id);
        console.error("Falha ao registar/disparar análise:", err);
      });
  }
}

// Pede a análise de uma empresa (ao guardar um lead, ou a pedido no detalhe do lead).
// Gasta 1 análise do plano só se a empresa ainda não tiver análise nem estiver a ser analisada.
async function requestAnalysis(companyId: string, userId: string): Promise<AnalysisRequestStatus | null> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, include: { analysis: true } });
  if (!company) return null;
  if (company.analysis) return "done";
  if (!companyAnalysisService.tryReserve(companyId)) return "pending";

  try {
    const remaining = await getRemainingAnalysisQuota(userId);
    if (remaining <= 0) {
      companyAnalysisService.release(companyId);
      return "limit";
    }
    await prisma.usageLog.create({ data: { userId, action: "analysis" } });
  } catch (err) {
    companyAnalysisService.release(companyId);
    throw err;
  }

  const { analysis: _analysis, ...companyData } = company;
  void companyAnalysisService.analyzeCompany(companyData);
  return "pending";
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

  requestAnalysis,

  async getById(id: string) {
    return prisma.company.findUnique({ where: { id }, include: { analysis: true } });
  },

  async getAnalysisStatus(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { analysis: true },
    });

    if (!company) return null;

    // done: análise pronta · pending: a decorrer · idle: ainda não pedida (ex: resultado
    // de pesquisa num plano com limite — analisa-se quando for guardado como lead).
    const status = company.analysis
      ? ("done" as const)
      : companyAnalysisService.isRunning(company.id)
        ? ("pending" as const)
        : ("idle" as const);

    return { status, analysis: company.analysis };
  },
};
