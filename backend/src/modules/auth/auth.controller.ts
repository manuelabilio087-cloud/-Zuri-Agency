import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authService } from "@/modules/auth/auth.service";
import { AuthenticatedRequest } from "@/modules/auth/auth.middleware";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Password deve ter pelo menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Password é obrigatória"),
});

const updateProfileSchema = z.object({
  serviceType: z.string().min(2).max(200).optional(),
  city: z.string().min(2).max(120).optional(),
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = registerSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await authService.register(input);
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await authService.login(input);
      setRefreshCookie(res, refreshToken);
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) {
        return res.status(401).json({ message: "Sem refresh token." });
      }
      const { accessToken, user } = await authService.refresh(token);
      res.status(200).json({ accessToken, user });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      if (token) {
        await authService.logout(token);
      }
      res.clearCookie("refreshToken");
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.userId!);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(req.userId!, input);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },

  async usage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const usage = await authService.getUsage(req.userId!);
      res.status(200).json(usage);
    } catch (err) {
      next(err);
    }
  },
};
