import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(err: AppError | ZodError, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Dados inválidos.",
      errors: err.flatten().fieldErrors,
    });
  }

  const statusCode = err.statusCode ?? 500;
  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    message: err.message || "Erro interno do servidor.",
  });
}
