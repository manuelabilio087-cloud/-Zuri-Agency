import { Router } from "express";
import { authController } from "@/modules/auth/auth.controller";
import { requireAuth } from "@/modules/auth/auth.middleware";

export const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.get("/usage", requireAuth, authController.usage);
