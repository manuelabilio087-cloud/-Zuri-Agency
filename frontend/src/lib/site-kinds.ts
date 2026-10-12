import type { SiteKind, WebsiteContent, WeekDay } from "@/lib/api";

// Tipos de negócio do criador de sites. Espelha o backend (websites.kinds.ts e a ordem
// das secções no renderer): o tipo decide que secções aparecem primeiro e os nomes.

export type SectionKey =
  | "highlight"
  | "catalog"
  | "about"
  | "services"
  | "gallery"
  | "team"
  | "plans"
  | "schedule"
  | "partners"
  | "faq"
  | "band"
  | "testimonials";

export const KIND_OPTIONS: Array<{ value: SiteKind; label: string }> = [
  { value: "restaurante", label: "Restaurante" },
  { value: "clinica", label: "Clínica" },
  { value: "ginasio", label: "Ginásio" },
  { value: "salao", label: "Salão / barbearia" },
  { value: "geral", label: "Outro negócio" },
];

// Botão principal e mensagem já escrita no WhatsApp (iguais ao backend).
export const KIND_PROFILE: Record<SiteKind, { cta: string; message: string }> = {
  restaurante: { cta: "Reservar mesa", message: "Olá! Gostaria de reservar uma mesa para __ pessoas, no dia __, às __." },
  clinica: { cta: "Marcar consulta", message: "Olá! Gostaria de marcar uma consulta. Qual é a próxima disponibilidade?" },
  ginasio: { cta: "Agendar visita", message: "Olá! Gostaria de visitar o ginásio e saber mais sobre os planos." },
  salao: { cta: "Marcar horário", message: "Olá! Gostaria de marcar __ para o dia __, às __." },
  geral: { cta: "Falar connosco", message: "Olá! Vi o vosso site e gostaria de mais informações." },
};

// Secções principais de cada tipo, pela ordem em que aparecem no site.
// As restantes ficam em "Mais secções" (opcionais).
const KIND_MAIN: Record<SiteKind, SectionKey[]> = {
  restaurante: ["highlight", "catalog", "band", "about", "gallery", "partners", "faq", "testimonials"],
  clinica: ["services", "team", "band", "about", "partners", "gallery", "faq", "testimonials"],
  ginasio: ["services", "plans", "schedule", "band", "team", "gallery", "about", "faq", "testimonials"],
  salao: ["catalog", "highlight", "gallery", "band", "team", "about", "testimonials", "faq"],
  geral: ["about", "services", "highlight", "catalog", "band", "gallery", "team", "partners", "faq", "testimonials"],
};

const ALL_SECTIONS: SectionKey[] = [
  "highlight",
  "catalog",
  "about",
  "services",
  "gallery",
  "team",
  "plans",
  "schedule",
  "partners",
  "faq",
  "band",
  "testimonials",
];

// Âncora de cada secção no site (ids do renderer), para a pré-visualização saltar lá.
export const SECTION_ANCHOR: Record<SectionKey, string> = {
  highlight: "destaque",
  catalog: "menu",
  about: "sobre",
  services: "servicos",
  gallery: "galeria",
  team: "equipa",
  plans: "planos",
  schedule: "horario",
  partners: "parceiros",
  faq: "faq",
  band: "faixa",
  testimonials: "testemunhos",
};

export function sectionsFor(kind: SiteKind): { main: SectionKey[]; extra: SectionKey[] } {
  const main = KIND_MAIN[kind] ?? KIND_MAIN.geral;
  return { main, extra: ALL_SECTIONS.filter((k) => !main.includes(k)) };
}

type Copy = {
  // Nome no editor
  name: string;
  // Explicação curta por baixo do nome
  hint: string;
  // Título que o site usa quando o campo "Título" fica vazio
  siteTitle: string;
  // Palavra para contar itens ("3 pratos")
  unit?: [string, string];
};

const BASE: Record<SectionKey, Copy> = {
  highlight: {
    name: "Destaque",
    hint: "O produto ou serviço mais procurado, com foto grande e preço.",
    siteTitle: "Em destaque",
  },
  catalog: {
    name: "Preços",
    hint: "Lista de produtos ou serviços com preço, por categorias.",
    siteTitle: "Serviços e preços",
    unit: ["item", "itens"],
  },
  about: { name: "Sobre", hint: "A história do negócio e o que o torna diferente.", siteTitle: "" },
  services: {
    name: "Serviços",
    hint: "O que o negócio faz, com uma frase cada. Foto opcional.",
    siteTitle: "O que fazemos",
    unit: ["serviço", "serviços"],
  },
  gallery: {
    name: "Galeria",
    hint: "Fotos do espaço e do trabalho. Ao tocar numa foto, abre em grande.",
    siteTitle: "Galeria",
    unit: ["foto", "fotos"],
  },
  team: { name: "Equipa", hint: "Quem atende os clientes, com nome, função e foto.", siteTitle: "A nossa equipa", unit: ["pessoa", "pessoas"] },
  plans: {
    name: "Planos",
    hint: "Até 4 planos com preço. Cada um tem um botão que abre o WhatsApp a pedir esse plano.",
    siteTitle: "Planos",
    unit: ["plano", "planos"],
  },
  schedule: { name: "Horário das aulas", hint: "Aulas por dia da semana, com hora.", siteTitle: "Horário", unit: ["aula", "aulas"] },
  partners: {
    name: "Formas de pagamento",
    hint: "M-Pesa, e-Mola, cartão… Aparecem como etiquetas.",
    siteTitle: "Formas de pagamento",
    unit: ["item", "itens"],
  },
  faq: {
    name: "Perguntas frequentes",
    hint: "Respostas às dúvidas de sempre. Só aparecem as perguntas com resposta.",
    siteTitle: "Perguntas frequentes",
    unit: ["pergunta", "perguntas"],
  },
  band: {
    name: "Faixa com foto em movimento",
    hint: "Uma foto larga que se mexe quando se desliza a página, com uma frase por cima.",
    siteTitle: "",
  },
  testimonials: {
    name: "Testemunhos",
    hint: "Só aparecem se escreveres algum. Usa palavras reais de clientes, com autorização — a IA nunca os inventa.",
    siteTitle: "O que dizem os nossos clientes",
    unit: ["testemunho", "testemunhos"],
  },
};

const OVERRIDES: Record<SiteKind, Partial<Record<SectionKey, Partial<Copy>>>> = {
  restaurante: {
    highlight: {
      name: "Prato da casa",
      hint: "O prato mais pedido, com foto grande e preço.",
      siteTitle: "A especialidade da casa",
    },
    catalog: {
      name: "Menu",
      hint: "Pratos por categoria (entradas, pratos, bebidas…), com preço e foto opcional.",
      siteTitle: "O nosso menu",
      unit: ["prato", "pratos"],
    },
    gallery: { name: "Fotos do espaço e dos pratos", siteTitle: "O nosso espaço" },
    services: { name: "Também temos", hint: "Ex: take-away, entregas, eventos, esplanada.", siteTitle: "Também temos" },
  },
  clinica: {
    services: {
      name: "Especialidades",
      hint: "As especialidades e consultas da clínica, com uma frase cada.",
      siteTitle: "As nossas especialidades",
      unit: ["especialidade", "especialidades"],
    },
    team: { name: "Equipa médica", hint: "Médicos e enfermeiros, com especialidade e foto.", siteTitle: "A nossa equipa médica" },
    partners: { name: "Seguros aceites", hint: "As seguradoras com que a clínica trabalha.", siteTitle: "Seguros aceites", unit: ["seguro", "seguros"] },
    gallery: { name: "Instalações", hint: "Fotos da receção, consultórios e sala de espera.", siteTitle: "As nossas instalações" },
    catalog: { name: "Consultas e preços", siteTitle: "Consultas e tratamentos" },
  },
  ginasio: {
    services: {
      name: "Modalidades",
      hint: "Musculação, aulas de grupo, personal trainer… com foto.",
      siteTitle: "As nossas modalidades",
      unit: ["modalidade", "modalidades"],
    },
    plans: { name: "Planos e mensalidades", siteTitle: "Planos e mensalidades" },
    schedule: { siteTitle: "Horário das aulas" },
    team: { name: "Treinadores", hint: "Os treinadores e instrutores, com foto.", siteTitle: "Os nossos treinadores" },
    gallery: { name: "Fotos do espaço", siteTitle: "O nosso espaço" },
  },
  salao: {
    catalog: {
      name: "Serviços e preços",
      hint: "Cortes, barba, tranças, unhas… com preço e duração.",
      siteTitle: "Serviços e preços",
      unit: ["serviço", "serviços"],
    },
    highlight: { name: "Serviço em destaque", hint: "O serviço mais pedido, com foto e preço." },
    gallery: { name: "Trabalhos", hint: "Fotos de cortes, penteados e unhas feitos no salão.", siteTitle: "Os nossos trabalhos" },
    services: { name: "Outros serviços" },
  },
  geral: {},
};

export function sectionCopy(kind: SiteKind, key: SectionKey): Copy {
  return { ...BASE[key], ...(OVERRIDES[kind]?.[key] ?? {}) };
}

// Mostrar a duração ("30 min") nos itens da lista de preços?
export function catalogShowsDetail(kind: SiteKind): boolean {
  return kind !== "restaurante";
}

export const DAY_OPTIONS: Array<{ value: WeekDay; label: string }> = [
  { value: "seg", label: "Segunda" },
  { value: "ter", label: "Terça" },
  { value: "qua", label: "Quarta" },
  { value: "qui", label: "Quinta" },
  { value: "sex", label: "Sexta" },
  { value: "sab", label: "Sábado" },
  { value: "dom", label: "Domingo" },
];

// Sugestões rápidas (o utilizador escolhe; nada é adicionado sozinho).
export const PAYMENT_SUGGESTIONS = ["M-Pesa", "e-Mola", "mKesh", "Cartão (POS)", "Numerário", "Transferência bancária"];

export const FAQ_SUGGESTIONS: Record<SiteKind, string[]> = {
  restaurante: ["Fazem entregas?", "Aceitam reservas para grupos?", "Têm opções vegetarianas?", "Fazem eventos e aniversários?"],
  clinica: ["Preciso de marcar consulta?", "Aceitam seguros de saúde?", "Fazem análises clínicas?", "Atendem urgências?"],
  ginasio: ["Posso experimentar antes de me inscrever?", "Há estacionamento?", "Tenho acompanhamento de um treinador?", "Qual é o horário de funcionamento?"],
  salao: ["Preciso de marcar?", "Quanto tempo demora?", "Atendem ao domicílio?", "Que produtos usam?"],
  geral: ["Como posso fazer um pedido?", "Fazem entregas?", "Quais são as formas de pagamento?"],
};

const STARTER_CATEGORIES: Partial<Record<SiteKind, string[]>> = {
  restaurante: ["Entradas", "Pratos principais", "Bebidas", "Sobremesas"],
  salao: ["Serviços"],
};

// Muda o tipo de negócio sem perder o que já foi escrito: só troca o texto do botão e
// a mensagem do WhatsApp se ainda forem os do tipo anterior, e só prepara categorias
// do menu se a lista de preços ainda estiver vazia.
export function switchKind(content: WebsiteContent, next: SiteKind): WebsiteContent {
  const prev = KIND_PROFILE[content.kind] ?? KIND_PROFILE.geral;
  const profile = KIND_PROFILE[next];
  const label = content.hero.ctaLabel.trim();
  const message = content.booking.message.trim();
  const catalogEmpty = !content.catalog.categories.some((c) => c.items.length > 0);
  return {
    ...content,
    kind: next,
    hero: !label || label === prev.cta ? { ...content.hero, ctaLabel: profile.cta } : content.hero,
    booking: !message || message === prev.message ? { message: profile.message } : content.booking,
    catalog: catalogEmpty
      ? { ...content.catalog, categories: (STARTER_CATEGORIES[next] ?? []).map((name) => ({ name, items: [] })) }
      : content.catalog,
  };
}

// Sites antigos (antes dos tipos de negócio) podem chegar sem as secções novas: o
// backend já as preenche, mas o editor garante-as também para nunca falhar.
const KINDS = new Set<SiteKind>(["restaurante", "clinica", "ginasio", "salao", "geral"]);

export function withDefaults(raw: WebsiteContent): WebsiteContent {
  const c = (raw ?? {}) as Partial<WebsiteContent>;
  const arr = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const hero = (c.hero ?? {}) as Partial<WebsiteContent["hero"]>;
  return {
    ...(c as WebsiteContent),
    seo: { title: str(c.seo?.title), description: str(c.seo?.description) },
    brand: { logoUrl: str(c.brand?.logoUrl), showName: c.brand?.showName !== false },
    kind: c.kind && KINDS.has(c.kind) ? c.kind : "geral",
    hero: {
      headline: str(hero.headline),
      subheadline: str(hero.subheadline),
      ctaLabel: str(hero.ctaLabel),
      imageUrl: str(hero.imageUrl),
      gallery: arr(hero.gallery),
      rotating: arr(hero.rotating),
    },
    booking: { message: str(c.booking?.message) },
    highlight: {
      title: str(c.highlight?.title),
      name: str(c.highlight?.name),
      description: str(c.highlight?.description),
      price: str(c.highlight?.price),
      imageUrl: str(c.highlight?.imageUrl),
    },
    catalog: { title: str(c.catalog?.title), categories: arr(c.catalog?.categories).map((k) => ({ name: str(k?.name), items: arr(k?.items) })) },
    gallery: { title: str(c.gallery?.title), images: arr(c.gallery?.images) },
    team: { title: str(c.team?.title), members: arr(c.team?.members) },
    plans: { title: str(c.plans?.title), items: arr(c.plans?.items).map((p) => ({ ...p, features: arr(p?.features), featured: Boolean(p?.featured) })) },
    schedule: { title: str(c.schedule?.title), entries: arr(c.schedule?.entries) },
    partners: { title: str(c.partners?.title), items: arr(c.partners?.items) },
    faq: { title: str(c.faq?.title), items: arr(c.faq?.items) },
    band: { imageUrl: str(c.band?.imageUrl), text: str(c.band?.text) },
    about: { title: str(c.about?.title), text: str(c.about?.text), imageUrl: str(c.about?.imageUrl) },
    services: { title: str(c.services?.title), items: arr(c.services?.items) },
    testimonials: { title: str(c.testimonials?.title), items: arr(c.testimonials?.items) },
    contact: {
      phone: str(c.contact?.phone),
      whatsapp: str(c.contact?.whatsapp),
      email: str(c.contact?.email),
      address: str(c.contact?.address),
      hours: str(c.contact?.hours),
      showMap: c.contact?.showMap !== false,
    },
    rating: c.rating ?? null,
  };
}

// Textos de exemplo que ainda não foram trocados pelos dados reais do negócio.
const PLACEHOLDERS = ["Descreva aqui", "Edite este texto", "Explique como", "Serviço principal"];

export function placeholderSections(content: WebsiteContent): string[] {
  const found: string[] = [];
  const hit = (text: string) => PLACEHOLDERS.some((p) => text.includes(p));
  if (hit(content.about.text) || hit(content.about.title)) found.push(sectionCopy(content.kind, "about").name);
  if (content.services.items.some((s) => hit(s.name) || hit(s.description))) found.push(sectionCopy(content.kind, "services").name);
  if (hit(content.hero.headline) || hit(content.hero.subheadline)) found.unshift("Topo do site");
  return found;
}
