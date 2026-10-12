import { z } from "zod";

// Só https e sem caracteres que possam sair de um atributo HTML ou de url("...") no CSS.
export const SAFE_HTTPS_URL = /^https:\/\/[^\s"'<>\\()]+$/i;

// Estrutura do conteúdo de um site. Tudo é texto simples (nunca HTML): o renderer
// escapa cada campo, por isso o conteúdo não consegue injetar scripts na página.
// Os campos novos têm sempre valor por defeito — sites criados antes continuam válidos.

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || SAFE_HTTPS_URL.test(v), "Usa um link https:// válido.");

const photo = httpsUrl.optional().default("");

export const SITE_STYLES = ["elegante", "moderno", "vibrante"] as const;
export type SiteStyle = (typeof SITE_STYLES)[number];

// Tipo de negócio: decide que secções o site mostra e em que ordem.
export const SITE_KINDS = ["restaurante", "clinica", "ginasio", "salao", "geral"] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

export const WEEK_DAYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;

const txt = (max: number) => z.string().trim().max(max).optional().default("");
// Preço livre ("350", "350 MT", "a partir de 500"); vazio = não mostra preço.
const price = txt(30);

export const websiteContentSchema = z.object({
  seo: z.object({
    title: z.string().trim().max(70),
    description: z.string().trim().max(160),
  }),
  brand: z
    .object({
      logoUrl: photo,
      // Desligar quando o logotipo já inclui o nome do negócio.
      showName: z.boolean().optional().default(true),
    })
    .optional()
    .default({ logoUrl: "", showName: true }),
  kind: z.enum(SITE_KINDS).optional().default("geral"),
  hero: z.object({
    headline: z.string().trim().min(1).max(90),
    subheadline: z.string().trim().max(220),
    ctaLabel: z.string().trim().min(1).max(30),
    imageUrl: photo,
    // Mais fotos no topo: com 2 ou mais, o topo passa a uma galeria animada.
    gallery: z.array(httpsUrl).max(4).optional().default([]),
    // Frases curtas que vão mudando por baixo do título.
    rotating: z.array(z.string().trim().max(40)).max(4).optional().default([]),
  }),
  // Mensagem já escrita quando o cliente toca no botão principal (WhatsApp).
  booking: z.object({ message: txt(300) }).optional().default({ message: "" }),
  // Prato da casa / serviço em destaque.
  highlight: z
    .object({ title: txt(60), name: txt(80), description: txt(300), price, imageUrl: photo })
    .optional()
    .default({ title: "", name: "", description: "", price: "", imageUrl: "" }),
  // Menu (restaurante) ou tabela de serviços e preços (salão), por categorias.
  catalog: z
    .object({
      title: txt(60),
      categories: z
        .array(
          z.object({
            name: txt(40),
            items: z
              .array(z.object({ name: txt(80), description: txt(200), price, detail: txt(30), imageUrl: photo }))
              .max(30),
          })
        )
        .max(8),
    })
    .optional()
    .default({ title: "", categories: [] }),
  gallery: z
    .object({ title: txt(60), images: z.array(z.object({ url: httpsUrl, caption: txt(80) })).max(12) })
    .optional()
    .default({ title: "", images: [] }),
  team: z
    .object({ title: txt(60), members: z.array(z.object({ name: txt(60), role: txt(80), imageUrl: photo })).max(12) })
    .optional()
    .default({ title: "", members: [] }),
  plans: z
    .object({
      title: txt(60),
      items: z
        .array(
          z.object({
            name: txt(40),
            price,
            period: txt(20),
            features: z.array(z.string().trim().max(80)).max(8).optional().default([]),
            featured: z.boolean().optional().default(false),
          })
        )
        .max(4),
    })
    .optional()
    .default({ title: "", items: [] }),
  schedule: z
    .object({ title: txt(60), entries: z.array(z.object({ day: z.enum(WEEK_DAYS), time: txt(12), name: txt(50) })).max(60) })
    .optional()
    .default({ title: "", entries: [] }),
  // Seguros aceites (clínica) ou formas de pagamento (M-Pesa, e-Mola…).
  partners: z
    .object({ title: txt(60), items: z.array(z.string().trim().max(40)).max(16) })
    .optional()
    .default({ title: "", items: [] }),
  faq: z
    .object({ title: txt(60), items: z.array(z.object({ q: txt(140), a: txt(500) })).max(10) })
    .optional()
    .default({ title: "", items: [] }),
  // Faixa com uma imagem que se move ao deslizar a página.
  band: z.object({ imageUrl: photo, text: txt(120) }).optional().default({ imageUrl: "", text: "" }),
  about: z.object({
    title: z.string().trim().max(60),
    text: z.string().trim().max(1200),
    imageUrl: photo,
  }),
  services: z.object({
    title: z.string().trim().max(60),
    items: z
      .array(
        z.object({
          // Pode ficar vazio enquanto se edita: sem nome, o item não aparece no site.
          name: z.string().trim().max(60),
          description: z.string().trim().max(240).optional().default(""),
          imageUrl: photo,
        })
      )
      .max(9),
  }),
  // Só testemunhos reais, escritos pelo utilizador — a IA nunca os gera.
  // Itens incompletos (sem nome ou sem texto) não aparecem no site.
  testimonials: z
    .object({
      title: z.string().trim().max(60).optional().default(""),
      items: z
        .array(
          z.object({
            name: z.string().trim().max(60),
            role: z.string().trim().max(60).optional().default(""),
            text: z.string().trim().max(400),
          })
        )
        .max(6),
    })
    .optional()
    .default({ title: "", items: [] }),
  contact: z.object({
    phone: z.string().trim().max(30).optional().default(""),
    whatsapp: z.string().trim().max(30).optional().default(""),
    email: z.string().trim().max(120).optional().default(""),
    address: z.string().trim().max(200).optional().default(""),
    hours: z.string().trim().max(200).optional().default(""),
    showMap: z.boolean().default(true),
  }),
  // Classificação real da Google (nunca inventada). null = não mostrar.
  rating: z
    .object({ value: z.number().min(0).max(5), count: z.number().int().min(0) })
    .nullable()
    .optional()
    .default(null),
});

// `font` era a opção antiga (antes dos estilos): os sites guardados com ela passam a
// "elegante" (clássica) ou "moderno" (moderna).
export const websiteThemeSchema = z
  .object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
    mode: z.enum(["claro", "escuro"]),
    style: z.enum(SITE_STYLES).optional(),
    font: z.enum(["moderna", "classica"]).optional(),
  })
  .transform((t) => ({
    primary: t.primary,
    mode: t.mode,
    style: t.style ?? (t.font === "classica" ? "elegante" : "moderno"),
  }));

export type WebsiteContent = z.infer<typeof websiteContentSchema>;
export type WebsiteTheme = z.infer<typeof websiteThemeSchema>;

// Cor e fundo iniciais de cada estilo (o utilizador pode mudar depois no editor).
export const STYLE_DEFAULTS: Record<SiteStyle, WebsiteTheme> = {
  elegante: { primary: "#a1803f", mode: "claro", style: "elegante" },
  moderno: { primary: "#2563eb", mode: "claro", style: "moderno" },
  vibrante: { primary: "#7c3aed", mode: "claro", style: "vibrante" },
};

export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/;

export function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/g, "") || "site"
  );
}
