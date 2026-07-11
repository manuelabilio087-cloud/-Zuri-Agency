import { prisma } from "@/config/database";
import { placesService } from "@/modules/companies/places.service";

const CACHE_VALIDITY_DAYS = 30;
// Se houver menos resultados em cache do que isto, vale a pena ir buscar dados frescos à API.
const MIN_CACHE_RESULTS = 5;

export interface SearchCompaniesInput {
  category: string;
  city: string;
}

export type SearchSource = "cache" | "google_places" | "cache_stale";

export const companiesService = {
  async search({ category, city }: SearchCompaniesInput) {
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

    return { companies, source: "google_places" as SearchSource };
  },
};
