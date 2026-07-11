import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de acesso em falta." });
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Token de acesso inválido ou expirado." });
  }
}
