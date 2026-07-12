import { Response, NextFunction } from "express";
import { exportService } from "@/modules/leads/export.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

export const exportController = {
  async excel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await exportService.generateLeadsExcel(req.userId!);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="zuri-agency-leads-${Date.now()}.xlsx"`);
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  },

  async pdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const buffer = await exportService.generateProposalPdf(req.userId!, req.params.id);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="proposta-${req.params.id}.pdf"`);
      res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  },
};
