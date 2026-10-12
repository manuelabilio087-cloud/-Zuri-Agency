import { env } from "@/config/env";
import { KIND_PROFILE, kindFromCategory, titleCaseCity } from "@/modules/websites/websites.kinds";
import { SiteKind, WebsiteContent, websiteContentSchema } from "@/modules/websites/websites.types";

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

// Restaurantes por tipo de cozinha (categorias Google como "portuguese_restaurant").
const CUISINE: Record<string, string> = {
  portuguese: "restaurante de cozinha portuguesa",
  italian: "restaurante italiano",
  chinese: "restaurante chinês",
  indian: "restaurante indiano",
  japanese: "restaurante japonês",
  sushi: "restaurante de sushi",
  seafood: "marisqueira",
  brazilian: "restaurante brasileiro",
  mexican: "restaurante mexicano",
  african: "restaurante de cozinha africana",
  french: "restaurante francês",
  thai: "restaurante tailandês",
  american: "restaurante americano",
  mediterranean: "restaurante mediterrânico",
  vegetarian: "restaurante vegetariano",
  vegan: "restaurante vegano",
  steak_house: "churrascaria",
  barbecue: "restaurante de grelhados",
  fast_food: "fast food",
  pizza: "pizzaria",
  hamburger: "hamburgueria",
  korean: "restaurante coreano",
  turkish: "restaurante turco",
  lebanese: "restaurante libanês",
  greek: "restaurante grego",
  spanish: "restaurante espanhol",
  middle_eastern: "restaurante do Médio Oriente",
};

export function readableCategory(category: string): string {
  const key = category.trim().toLowerCase();
  if (CATEGORY_PT[key]) return CATEGORY_PT[key];
  if (key.endsWith("_restaurant")) return CUISINE[key.slice(0, -"_restaurant".length)] ?? "restaurante";
  return category.replace(/_/g, " ").trim();
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Estrutura inicial de cada tipo: só nomes de categorias e títulos — nada de pratos,
// preços, médicos ou planos inventados (esses ficam vazios e as secções escondidas).
// Categorias vazias já prontas a preencher no editor (os títulos das secções vêm do
// tipo de negócio no renderer, por isso não se guardam aqui).
function kindStructure(kind: SiteKind) {
  if (kind === "restaurante") {
    return { catalog: { title: "", categories: ["Entradas", "Pratos principais", "Bebidas", "Sobremesas"].map((name) => ({ name, items: [] })) } };
  }
  if (kind === "salao") return { catalog: { title: "", categories: [{ name: "Serviços", items: [] }] } };
  return {};
}

// Conteúdo base, sem IA: usado quando a chave da IA não está configurada ou a IA falha.
// Tudo é editável no editor.
export function fallbackContent(data: SiteSourceData): WebsiteContent {
  const kind = kindFromCategory(data.category);
  const cat = readableCategory(data.category);
  const city = titleCaseCity(data.city);
  const profile = KIND_PROFILE[kind];
  return websiteContentSchema.parse({
    kind,
    seo: {
      title: `${data.businessName} | ${city}`.slice(0, 70),
      description: `${data.businessName} — ${cat} em ${city}. Contacte-nos por telefone ou WhatsApp.`.slice(0, 160),
    },
    hero: {
      headline: data.businessName.slice(0, 90),
      subheadline: `${capitalize(cat)} em ${city}, com atendimento próximo e de confiança.`.slice(0, 220),
      ctaLabel: profile.cta,
      imageUrl: "",
      rotating: [capitalize(cat).slice(0, 40), `Em ${city}`.slice(0, 40), "Fale connosco pelo WhatsApp"],
    },
    booking: { message: profile.message },
    brand: { logoUrl: "", showName: true },
    about: {
      title: `Sobre a ${data.businessName}`.slice(0, 60),
      text: `A ${data.businessName} está em ${city} para servir os seus clientes com qualidade e dedicação.`,
      imageUrl: "",
    },
    // Sem IA não há serviços: melhor uma secção escondida do que texto de exemplo publicado.
    services: { title: kind === "geral" ? "O que oferecemos" : "", items: [] },
    ...kindStructure(kind),
    // Testemunhos começam vazios: só o utilizador os escreve, com palavras reais de clientes.
    testimonials: { title: "O que dizem os nossos clientes", items: [] },
    contact: {
      phone: data.phone ?? "",
      whatsapp: data.phone ?? "",
      email: "",
      address: data.address ?? city,
      hours: "",
      showMap: Boolean(data.address),
    },
    rating: data.rating !== null && (data.reviewsCount ?? 0) > 0 ? { value: data.rating, count: data.reviewsCount ?? 0 } : null,
  });
}

const SERVICES_HINT: Record<SiteKind, string> = {
  restaurante: "3 a 4 serviços gerais muito prováveis num restaurante deste tipo (ex.: refeições no local, take-away). Não inventes pratos.",
  clinica: "3 a 6 especialidades ou tratamentos típicos deste tipo de clínica, descritos de forma genérica.",
  ginasio: "3 a 6 modalidades típicas de um ginásio (ex.: musculação, aulas de grupo, cardio), descritas de forma genérica.",
  salao: "3 a 6 serviços típicos deste tipo de salão ou barbearia, descritos de forma genérica.",
  geral: "3 a 6 serviços típicos deste tipo de negócio, descritos de forma genérica e credível.",
};

function buildPrompt(data: SiteSourceData, kind: SiteKind): string {
  return `Escreve o texto de um site de uma página para uma empresa em Moçambique, em português de Moçambique.

Dados reais da empresa:
- Nome: ${data.businessName}
- Tipo de negócio: ${readableCategory(data.category)}
- Cidade: ${titleCaseCity(data.city)}
- Morada: ${data.address ?? "não indicada"}

Regras:
- Não inventes factos: nada de prémios, anos de experiência, números de clientes, preços, pratos, nomes de pessoas ou testemunhos.
- Serviços: ${SERVICES_HINT[kind]}
- "rotating": 3 frases muito curtas (2 a 4 palavras) que descrevem o tipo de negócio sem inventar factos (ex.: "Cozinha portuguesa").
- Tom profissional, caloroso e direto. Frases curtas. Sem emojis.
- Respeita os limites de caracteres.

Responde APENAS com JSON válido neste formato:
{
  "seo": { "title": "até 60 caracteres", "description": "até 155 caracteres" },
  "hero": { "headline": "até 70 caracteres", "subheadline": "até 180 caracteres", "rotating": ["…", "…", "…"] },
  "about": { "title": "até 50 caracteres", "text": "2 parágrafos curtos separados por linha em branco" },
  "services": { "title": "até 50 caracteres", "items": [ { "name": "até 50 caracteres", "description": "até 200 caracteres" } ] }
}`;
}

const cut = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

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
        max_tokens: 1600,
        messages: [{ role: "user", content: buildPrompt(data, base.kind) }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`IA respondeu ${res.status}`);

    const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = json.content?.find((b) => b.type === "text")?.text ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as any;

    // Só os textos vêm da IA (cortados aos limites); tudo o resto fica o da base.
    const rotating = Array.isArray(parsed?.hero?.rotating)
      ? parsed.hero.rotating.map((r: unknown) => cut(r, 40)).filter(Boolean).slice(0, 4)
      : base.hero.rotating;
    const items = Array.isArray(parsed?.services?.items) ? parsed.services.items : [];
    const candidate = {
      ...base,
      seo: { title: cut(parsed?.seo?.title, 70) || base.seo.title, description: cut(parsed?.seo?.description, 160) || base.seo.description },
      hero: {
        ...base.hero,
        headline: cut(parsed?.hero?.headline, 90) || base.hero.headline,
        subheadline: cut(parsed?.hero?.subheadline, 220) || base.hero.subheadline,
        rotating: rotating.length >= 2 ? rotating : base.hero.rotating,
      },
      about: { ...base.about, title: cut(parsed?.about?.title, 60) || base.about.title, text: cut(parsed?.about?.text, 1200) || base.about.text },
      services: {
        title: cut(parsed?.services?.title, 60) || base.services.title,
        items: items
          .map((item: { name?: unknown; description?: unknown }) => ({ name: cut(item?.name, 60), description: cut(item?.description, 240), imageUrl: "" }))
          .filter((item: { name: string }) => item.name)
          .slice(0, 6),
      },
    };
    const result = websiteContentSchema.safeParse(candidate);
    if (!result.success) return { content: base, usedAi: false };
    return { content: result.data, usedAi: true };
  } catch (err) {
    console.error("Falha ao gerar o site com IA — a usar conteúdo base:", err);
    return { content: base, usedAi: false };
  }
}
