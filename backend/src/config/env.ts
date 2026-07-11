import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("4000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET deve ter pelo menos 10 caracteres"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(10, "JWT_REFRESH_SECRET deve ter pelo menos 10 caracteres"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
  isProduction: parsed.data.NODE_ENV === "production",
};
