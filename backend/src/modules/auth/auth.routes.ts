import { Router } from "express";
import { authController } from "@/modules/auth/auth.controller";

export const authRoutes = Router();

authRoutes.post("/register", authController.register);
authRoutes.post("/login", authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
