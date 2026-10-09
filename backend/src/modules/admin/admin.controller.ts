import { Response, NextFunction } from "express";
import { z } from "zod";
import { adminService } from "@/modules/admin/admin.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

const updateUserSchema = z
  .object({
    plan: z.enum(["FREE", "STARTER", "PRO"]).optional(),
    role: z.enum(["USER", "ADMIN"]).optional(),
  })
  .refine((data) => data.plan !== undefined || data.role !== undefined, {
    message: "Indica o plano ou o role a alterar.",
  });

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

  // PATCH /admin/users/:id — muda o plano (ex: ativar Pro após pagamento manual) e/ou o role.
  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = updateUserSchema.parse(req.body);
      if (req.params.id === req.userId && input.role === "USER") {
        return res.status(400).json({ message: "Não podes remover o teu próprio acesso de administrador." });
      }
      const user = await adminService.updateUser(req.params.id, input);
      if (!user) {
        return res.status(404).json({ message: "Utilizador não encontrado." });
      }
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },
};
