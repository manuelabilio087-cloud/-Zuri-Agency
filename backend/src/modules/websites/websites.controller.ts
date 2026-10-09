import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";
import { websitesService } from "@/modules/websites/websites.service";
import { SITE_SCRIPT_HASH } from "@/modules/websites/websites.renderer";
import { SITE_STYLES, websiteContentSchema, websiteThemeSchema } from "@/modules/websites/websites.types";

const createSchema = z.object({ leadId: z.string().uuid(), style: z.enum(SITE_STYLES).optional() });

const updateSchema = z.object({
  businessName: z.string().trim().min(1).max(80).optional(),
  slug: z.string().trim().min(3).max(50).optional(),
  content: websiteContentSchema.optional(),
  theme: websiteThemeSchema.optional(),
  published: z.boolean().optional(),
});

const draftSchema = z.object({
  businessName: z.string().trim().min(1).max(80).optional(),
  content: websiteContentSchema.optional(),
  theme: websiteThemeSchema.optional(),
});

export const websitesController = {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await websitesService.list(req.userId!));
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { leadId, style } = createSchema.parse(req.body);
      res.status(201).json(await websitesService.createFromLead(req.userId!, leadId, style));
    } catch (err) {
      next(err);
    }
  },

  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(200).json(await websitesService.get(req.userId!, req.params.id));
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = updateSchema.parse(req.body);
      res.status(200).json(await websitesService.update(req.userId!, req.params.id, input));
    } catch (err) {
      next(err);
    }
  },

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await websitesService.remove(req.userId!, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  // HTML para a pré-visualização no editor (o frontend mostra-o num iframe).
  // POST com { businessName, content, theme } pré-visualiza alterações por guardar.
  async preview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const draft = req.method === "POST" ? draftSchema.parse(req.body ?? {}) : undefined;
      const { html } = await websitesService.renderForOwner(req.userId!, req.params.id, draft);
      res.status(200).json({ html });
    } catch (err) {
      next(err);
    }
  },

  // Ficheiro .html autónomo para alojar noutro sítio.
  async download(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { html, slug } = await websitesService.renderForOwner(req.userId!, req.params.id);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${slug}.html"`);
      res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  },

  // Público (sem login): usado pela rota /s/{slug} do frontend.
  async publicSite(req: Request, res: Response, next: NextFunction) {
    try {
      const html = await websitesService.renderPublic(String(req.params.slug).toLowerCase());
      if (!html) return res.status(404).json({ message: "Site não encontrado." });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=60");
      // O frontend usa este hash na CSP de /s/{slug} para autorizar só o script do site.
      res.setHeader("X-Site-Script-Hash", SITE_SCRIPT_HASH);
      res.status(200).send(html);
    } catch (err) {
      next(err);
    }
  },
};
