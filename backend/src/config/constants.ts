// Limites por plano (secção 6 do PRD)
export const PLAN_LIMITS = {
  FREE: {
    searchesPerMonth: 10,
    analysesPerMonth: 5,
    aiGenerationsPerMonth: 0,
    crm: false,
    exportExcel: false,
    exportPdf: false,
  },
  STARTER: {
    searchesPerMonth: 100,
    analysesPerMonth: 50,
    aiGenerationsPerMonth: 30,
    crm: true,
    exportExcel: true,
    exportPdf: false,
  },
  PRO: {
    searchesPerMonth: Infinity,
    analysesPerMonth: Infinity,
    aiGenerationsPerMonth: Infinity,
    crm: true,
    exportExcel: true,
    exportPdf: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

// Preços mensais em Metical (PRD secção 6). Usado para calcular o MRR no painel administrativo.
export const PLAN_PRICES: Record<PlanName, number> = {
  FREE: 0,
  STARTER: 499,
  PRO: 999,
};
