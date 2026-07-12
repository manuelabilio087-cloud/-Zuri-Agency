import { Router } from "express";
import { requireAuth } from "@/modules/auth/auth.middleware";
import { enforcePlanLimit } from "@/middlewares/plan-limit.middleware";
import { aiController } from "@/modules/ai/ai.controller";

export const aiRoutes = Router();

// Gera conteúdo comercial (script/email/whatsapp/proposta) para um lead, com base na
// análise já calculada. Respeita o limite `aiGenerationsPerMonth` do plano.
aiRoutes.post("/generate-content", requireAuth, enforcePlanLimit("ai_generation"), aiController.generateContent);
