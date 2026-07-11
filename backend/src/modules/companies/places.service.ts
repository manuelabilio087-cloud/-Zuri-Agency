import { env } from "@/config/env";

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
].join(",");

interface RawPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
}

export interface CompanyInput {
  placeId: string;
  name: string;
  category: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewsCount: number | null;
  city: string;
}

export interface SearchPlacesParams {
  category: string;
  city: string;
}

// Encapsula toda a comunicação com a Google Places API.
// Usa a Places API (New) — um único request devolve os campos necessários
// via fieldMask, o que reduz custo face a Text Search + Place Details separados.
export const placesService = {
  async searchPlaces({ category, city }: SearchPlacesParams): Promise<CompanyInput[]> {
    if (!env.GOOGLE_PLACES_API_KEY) {
      throw Object.assign(
        new Error("Google Places API não está configurada (falta GOOGLE_PLACES_API_KEY)."),
        { statusCode: 503 }
      );
    }

    const response = await fetch(SEARCH_TEXT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: `${category} em ${city}`,
        languageCode: "pt",
      }),
      // Evita ficar pendurado se a API externa estiver lenta/indisponível (RNF04)
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw Object.assign(
        new Error(`Google Places API respondeu com erro (${response.status}): ${body}`),
        { statusCode: 502 }
      );
    }

    const data = (await response.json()) as { places?: RawPlace[] };
    return (data.places ?? []).map((place) => mapToCompanyInput(place, city, category));
  },
};

function mapToCompanyInput(place: RawPlace, city: string, fallbackCategory: string): CompanyInput {
  return {
    placeId: place.id,
    name: place.displayName?.text ?? "Empresa sem nome",
    category: place.primaryType ?? fallbackCategory,
    address: place.formattedAddress ?? "",
    phone: place.internationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    rating: place.rating ?? null,
    reviewsCount: place.userRatingCount ?? null,
    city,
  };
}
