import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { requireAdmin } from "@/middlewares/plan-limit.middleware";
import { adminController } from "@/modules/admin/admin.controller";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);

adminRoutes.get("/users", adminController.listUsers);
adminRoutes.get("/metrics", adminController.getMetrics);
adminRoutes.get("/users/:id", adminController.getUserDetail);
