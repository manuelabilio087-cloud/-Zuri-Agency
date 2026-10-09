import { z } from "zod";

// Só https e sem caracteres que possam sair de um atributo HTML ou de url("...") no CSS.
export const SAFE_HTTPS_URL = /^https:\/\/[^\s"'<>\\()]+$/i;

// Estrutura do conteúdo de um site. Tudo é texto simples (nunca HTML): o renderer
// escapa cada campo, por isso o conteúdo não consegue injetar scripts na página.

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || SAFE_HTTPS_URL.test(v), "Usa um link https:// válido.");

export const websiteContentSchema = z.object({
  seo: z.object({
    title: z.string().trim().max(70),
    description: z.string().trim().max(160),
  }),
  hero: z.object({
    headline: z.string().trim().min(1).max(90),
    subheadline: z.string().trim().max(220),
    ctaLabel: z.string().trim().min(1).max(30),
    imageUrl: httpsUrl.optional().default(""),
  }),
  about: z.object({
    title: z.string().trim().max(60),
    text: z.string().trim().max(1200),
  }),
  services: z.object({
    title: z.string().trim().max(60),
    items: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(60),
          description: z.string().trim().max(240),
        })
      )
      .max(9),
  }),
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

export const websiteThemeSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  mode: z.enum(["claro", "escuro"]),
  font: z.enum(["moderna", "classica"]),
});

export type WebsiteContent = z.infer<typeof websiteContentSchema>;
export type WebsiteTheme = z.infer<typeof websiteThemeSchema>;

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
