import { prisma } from "@/config/database";
import { env } from "@/config/env";
import { generateSiteContent } from "@/modules/websites/websites.generator";
import { renderWebsiteHtml } from "@/modules/websites/websites.renderer";
import {
  SLUG_REGEX,
  WebsiteContent,
  WebsiteTheme,
  slugify,
  websiteContentSchema,
  websiteThemeSchema,
} from "@/modules/websites/websites.types";

const DEFAULT_THEME: WebsiteTheme = { primary: "#6d4aff", mode: "claro", font: "moderna" };

const listSelect = {
  id: true,
  slug: true,
  businessName: true,
  published: true,
  publishedAt: true,
  leadId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function notFound(): Error {
  return Object.assign(new Error("Site não encontrado."), { statusCode: 404 });
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const existing = await prisma.website.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function publicUrl(slug: string): string {
  return `${env.FRONTEND_URL.replace(/\/$/, "")}/s/${slug}`;
}

function toRenderInput(site: { businessName: string; slug: string; content: unknown; theme: unknown }) {
  const content = websiteContentSchema.parse(site.content);
  const themeResult = websiteThemeSchema.safeParse(site.theme);
  return {
    businessName: site.businessName,
    content,
    theme: themeResult.success ? themeResult.data : DEFAULT_THEME,
    canonicalUrl: publicUrl(site.slug),
  };
}

export interface UpdateWebsiteInput {
  businessName?: string;
  slug?: string;
  content?: WebsiteContent;
  theme?: WebsiteTheme;
  published?: boolean;
}

export const websitesService = {
  publicUrl,

  async list(userId: string) {
    return prisma.website.findMany({ where: { userId }, select: listSelect, orderBy: { updatedAt: "desc" } });
  },

  // Cria um site a partir de um lead: a IA escreve os textos e os contactos/classificação
  // vêm dos dados reais da empresa (Google Places).
  async createFromLead(userId: string, leadId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: { company: { include: { analysis: true } } },
    });
    if (!lead) throw Object.assign(new Error("Lead não encontrado."), { statusCode: 404 });

    const { company } = lead;
    const { content, usedAi } = await generateSiteContent({
      businessName: company.name,
      category: company.category,
      city: company.city,
      address: company.address || null,
      phone: company.phone,
      rating: company.rating,
      reviewsCount: company.reviewsCount,
      recommendedService: company.analysis?.recommendedService ?? null,
    });

    const site = await prisma.website.create({
      data: {
        userId,
        leadId: lead.id,
        slug: await uniqueSlug(company.name),
        businessName: company.name,
        content: content as never,
        theme: DEFAULT_THEME as never,
      },
    });

    return { ...site, usedAi, publicUrl: publicUrl(site.slug) };
  },

  async get(userId: string, id: string) {
    const site = await prisma.website.findFirst({ where: { id, userId } });
    if (!site) throw notFound();
    return { ...site, publicUrl: publicUrl(site.slug) };
  },

  async update(userId: string, id: string, input: UpdateWebsiteInput) {
    const site = await prisma.website.findFirst({ where: { id, userId } });
    if (!site) throw notFound();

    let slug: string | undefined;
    if (input.slug !== undefined && input.slug !== site.slug) {
      const wanted = slugify(input.slug);
      if (!SLUG_REGEX.test(wanted)) {
        throw Object.assign(new Error("O endereço deve ter 3 a 50 letras, números ou hífens."), { statusCode: 400 });
      }
      const taken = await prisma.website.findUnique({ where: { slug: wanted }, select: { id: true } });
      if (taken && taken.id !== id) {
        throw Object.assign(new Error("Esse endereço já está a ser usado. Escolhe outro."), { statusCode: 409 });
      }
      slug = wanted;
    }

    const publishing = input.published === true && !site.published;
    const updated = await prisma.website.update({
      where: { id },
      data: {
        ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
        ...(slug ? { slug } : {}),
        ...(input.content ? { content: input.content as never } : {}),
        ...(input.theme ? { theme: input.theme as never } : {}),
        ...(input.published !== undefined ? { published: input.published } : {}),
        ...(publishing ? { publishedAt: new Date() } : {}),
      },
    });
    return { ...updated, publicUrl: publicUrl(updated.slug) };
  },

  async remove(userId: string, id: string) {
    const site = await prisma.website.findFirst({ where: { id, userId }, select: { id: true } });
    if (!site) throw notFound();
    await prisma.website.delete({ where: { id } });
  },

  // `draft` permite pré-visualizar alterações ainda não guardadas no editor.
  async renderForOwner(
    userId: string,
    id: string,
    draft?: { businessName?: string; content?: WebsiteContent; theme?: WebsiteTheme }
  ) {
    const site = await prisma.website.findFirst({ where: { id, userId } });
    if (!site) throw notFound();
    const merged = {
      ...site,
      ...(draft?.businessName ? { businessName: draft.businessName } : {}),
      ...(draft?.content ? { content: draft.content } : {}),
      ...(draft?.theme ? { theme: draft.theme } : {}),
    };
    return { html: renderWebsiteHtml(toRenderInput(merged)), slug: site.slug };
  },

  // Página pública — só sites publicados.
  async renderPublic(slug: string): Promise<string | null> {
    const site = await prisma.website.findUnique({ where: { slug } });
    if (!site || !site.published) return null;
    return renderWebsiteHtml(toRenderInput(site));
  },
};
