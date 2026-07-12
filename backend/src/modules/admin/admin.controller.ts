import { Response, NextFunction } from "express";
import { adminService } from "@/modules/admin/admin.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

export const adminController = {
  async listUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await adminService.listUsers();
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  },

  async getMetrics(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await adminService.getMetrics();
      res.status(200).json(metrics);
    } catch (err) {
      next(err);
    }
  },

  async getUserDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await adminService.getUserDetail(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Utilizador não encontrado." });
      }
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },
};
