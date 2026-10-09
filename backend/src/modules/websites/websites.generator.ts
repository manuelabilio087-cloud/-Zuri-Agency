import { env } from "@/config/env";
import { WebsiteContent, websiteContentSchema } from "@/modules/websites/websites.types";

const SITE_MODEL = "claude-sonnet-5-5";

export interface SiteSourceData {
  businessName: string;
  category: string;
  city: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  reviewsCount: number | null;
  recommendedService: string | null;
}

// Tipos da Google Places mais comuns, em português.
const CATEGORY_PT: Record<string, string> = {
  restaurant: "restaurante",
  cafe: "café",
  coffee_shop: "café",
  bakery: "padaria",
  bar: "bar",
  meal_takeaway: "take-away",
  fast_food_restaurant: "fast food",
  pizza_restaurant: "pizzaria",
  hotel: "hotel",
  lodging: "alojamento",
  guest_house: "casa de hóspedes",
  hospital: "hospital",
  health: "saúde",
  medical_clinic: "clínica médica",
  doctor: "consultório médico",
  dentist: "clínica dentária",
  dental_clinic: "clínica dentária",
  pharmacy: "farmácia",
  drugstore: "farmácia",
  beauty_salon: "salão de beleza",
  hair_salon: "cabeleireiro",
  hair_care: "cabeleireiro",
  barber_shop: "barbearia",
  spa: "spa",
  nail_salon: "manicure",
  gym: "ginásio",
  fitness_center: "ginásio",
  school: "escola",
  primary_school: "escola primária",
  secondary_school: "escola secundária",
  university: "universidade",
  car_repair: "oficina",
  car_dealer: "stand automóvel",
  car_wash: "lavagem auto",
  real_estate_agency: "imobiliária",
  lawyer: "advogados",
  accounting: "contabilidade",
  insurance_agency: "seguros",
  travel_agency: "agência de viagens",
  supermarket: "supermercado",
  grocery_store: "mercearia",
  store: "loja",
  clothing_store: "loja de roupa",
  shoe_store: "sapataria",
  electronics_store: "loja de eletrónica",
  furniture_store: "loja de mobiliário",
  hardware_store: "ferragens",
  jewelry_store: "joalharia",
  florist: "florista",
  veterinary_care: "veterinário",
  pet_store: "loja de animais",
  church: "igreja",
  event_venue: "espaço de eventos",
  wedding_venue: "espaço para casamentos",
  night_club: "discoteca",
  photographer: "fotógrafo",
  electrician: "eletricista",
  plumber: "canalizador",
  locksmith: "serralharia",
  laundry: "lavandaria",
  bank: "banco",
  gas_station: "bomba de combustível",
  tourist_attraction: "atração turística",
};

function readableCategory(category: string): string {
  const key = category.trim().toLowerCase();
  return CATEGORY_PT[key] ?? category.replace(/_/g, " ").trim();
}

// Conteúdo base, sem IA: usado quando a chave da IA não está configurada ou a IA falha.
// Tudo é editável no editor.
export function fallbackContent(data: SiteSourceData): WebsiteContent {
  const cat = readableCategory(data.category);
  return {
    seo: {
      title: `${data.businessName} | ${data.city}`.slice(0, 70),
      description: `${data.businessName} — ${cat} em ${data.city}. Contacte-nos por telefone ou WhatsApp.`.slice(0, 160),
    },
    hero: {
      headline: data.businessName.slice(0, 90),
      subheadline: `${cat.charAt(0).toUpperCase()}${cat.slice(1)} em ${data.city}, com atendimento próximo e de confiança.`.slice(0, 220),
      ctaLabel: "Falar connosco",
      imageUrl: "",
    },
    about: {
      title: `Sobre a ${data.businessName}`.slice(0, 60),
      text: `A ${data.businessName} está em ${data.city} para servir os seus clientes com qualidade e dedicação.\n\nEdite este texto para contar a história do negócio, o que o torna diferente e porque os clientes confiam em si.`,
    },
    services: {
      title: "O que oferecemos",
      items: [
        { name: "Serviço principal", description: "Descreva aqui o serviço mais procurado pelos seus clientes." },
        { name: "Atendimento personalizado", description: "Explique como acompanha cada cliente do início ao fim." },
        { name: "Contacto rápido", description: "Fale connosco por telefone ou WhatsApp e responderemos o mais depressa possível." },
      ],
    },
    contact: {
      phone: data.phone ?? "",
      whatsapp: data.phone ?? "",
      email: "",
      address: data.address ?? data.city,
      hours: "",
      showMap: Boolean(data.address),
    },
    rating: data.rating !== null && (data.reviewsCount ?? 0) > 0 ? { value: data.rating, count: data.reviewsCount ?? 0 } : null,
  };
}

function buildPrompt(data: SiteSourceData): string {
  return `Escreve o texto de um site de uma página para uma empresa em Moçambique, em português de Moçambique.

Dados reais da empresa:
- Nome: ${data.businessName}
- Tipo de negócio (categoria Google): ${readableCategory(data.category)}
- Cidade: ${data.city}
- Morada: ${data.address ?? "não indicada"}

Regras:
- Não inventes factos: nada de prémios, anos de experiência, números de clientes, preços, nomes de pessoas ou testemunhos.
- Os serviços devem ser os típicos deste tipo de negócio, descritos de forma genérica e credível (3 a 6).
- Tom profissional, caloroso e direto. Frases curtas. Sem emojis.
- Respeita os limites de caracteres.

Responde APENAS com JSON válido neste formato:
{
  "seo": { "title": "até 60 caracteres", "description": "até 155 caracteres" },
  "hero": { "headline": "até 70 caracteres", "subheadline": "até 180 caracteres", "ctaLabel": "até 24 caracteres" },
  "about": { "title": "até 50 caracteres", "text": "2 parágrafos curtos separados por linha em branco" },
  "services": { "title": "até 50 caracteres", "items": [ { "name": "até 50 caracteres", "description": "até 200 caracteres" } ] }
}`;
}

const cut = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// Corta cada texto ao limite do respetivo campo, em vez de rejeitar a resposta inteira.
function clamp(c: WebsiteContent): WebsiteContent {
  return {
    ...c,
    seo: { title: cut(c.seo.title, 70), description: cut(c.seo.description, 160) },
    hero: {
      headline: cut(c.hero.headline, 90),
      subheadline: cut(c.hero.subheadline, 220),
      ctaLabel: cut(c.hero.ctaLabel, 30) || "Falar connosco",
      imageUrl: "",
    },
    about: { title: cut(c.about.title, 60), text: cut(c.about.text, 1200) },
    services: {
      title: cut(c.services.title, 60),
      items: (Array.isArray(c.services.items) ? c.services.items : [])
        .map((item) => ({ name: cut(item?.name, 60), description: cut(item?.description, 240) }))
        .filter((item) => item.name),
    },
  };
}

// Gera o texto do site com IA e junta os dados reais (contactos, classificação Google).
export async function generateSiteContent(data: SiteSourceData): Promise<{ content: WebsiteContent; usedAi: boolean }> {
  const base = fallbackContent(data);
  if (!env.ANTHROPIC_API_KEY) return { content: base, usedAi: false };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: SITE_MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: buildPrompt(data) }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`IA respondeu ${res.status}`);

    const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = json.content?.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Partial<WebsiteContent>;

    const candidate = {
      ...base,
      seo: { ...base.seo, ...parsed.seo },
      hero: { ...base.hero, ...parsed.hero, imageUrl: "" },
      about: { ...base.about, ...parsed.about },
      services: {
        title: parsed.services?.title ?? base.services.title,
        items: (parsed.services?.items ?? base.services.items).slice(0, 6),
      },
    };
    const result = websiteContentSchema.safeParse(clamp(candidate));
    if (!result.success) return { content: base, usedAi: false };
    return { content: result.data, usedAi: true };
  } catch (err) {
    console.error("Falha ao gerar o site com IA — a usar conteúdo base:", err);
    return { content: base, usedAi: false };
  }
}
