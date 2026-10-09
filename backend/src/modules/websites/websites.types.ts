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
  hero: z.object({
    headline: z.string().trim().min(1).max(90),
    subheadline: z.string().trim().max(220),
    ctaLabel: z.string().trim().min(1).max(30),
    imageUrl: photo,
  }),
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
          name: z.string().trim().min(1).max(60),
          description: z.string().trim().max(240),
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
