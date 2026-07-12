import { prisma } from "@/config/database";
import { env } from "@/config/env";
import { getLastActivityDate, daysSince } from "@/modules/leads/leads.service";

const MAX_PRIORITIES = 15;
const JUSTIFICATION_MODEL = "claude-haiku-4-5-20251001"; // frase curta e estruturada: modelo económico

interface PrioritizedLead {
  leadId: string;
  companyName: string;
  companyCategory: string;
  salesScore: number;
  leadTemperature: string;
  daysSinceContact: number;
  justification: string | null;
}

async function getJustification(companyName: string, keyGaps: string[], daysSinceContact: number): Promise<string | null> {
  if (!env.ANTHROPIC_API_KEY) return null;

  const prompt = `Com base nestes dados de um lead:
- Nome: ${companyName}
- Lacunas: ${keyGaps.join(", ") || "não especificadas"}
- Dias desde último contacto: ${daysSinceContact}

Escreva UMA frase curta (máximo 20 palavras) explicando por que este lead deve ser contactado hoje. Seja específico e direto.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: JUSTIFICATION_MODEL,
        max_tokens: 80,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    return data.content?.find((block) => block.type === "text")?.text?.trim() ?? null;
  } catch {
    // Justificação é um extra (PRD 8.2: "opcional") — falha aqui não deve derrubar a lista.
    return null;
  }
}

function deriveGapsFromBreakdown(scoreBreakdown: unknown): string[] {
  const breakdown = (scoreBreakdown ?? {}) as Record<string, number>;
  const gaps: string[] = [];
  if ((breakdown.websiteScore ?? 100) === 0) gaps.push("sem website");
  if ((breakdown.seoScore ?? 100) < 50) gaps.push("SEO fraco");
  if ((breakdown.reviewsScore ?? 100) < 40) gaps.push("poucas avaliações");
  if ((breakdown.socialPresence ?? 100) < 40) gaps.push("sem redes sociais");
  return gaps;
}

export const dailyPrioritiesService = {
  // Lógica de seleção determinística (PRD 8.1): leads ativos, ordenados por oportunidade
  // (sales score baixo = mais oportunidade) combinada com tempo desde o último contacto.
  async getPriorities(userId: string): Promise<PrioritizedLead[]> {
    const activeLeads = await prisma.lead.findMany({
      where: { userId, status: { notIn: ["FECHADO", "PERDIDO"] } },
      include: {
        company: { include: { analysis: true } },
        notes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const withAnalysis = activeLeads.filter((lead) => lead.company.analysis !== null);

    const ranked = withAnalysis
      .map((lead) => {
        const analysis = lead.company.analysis!;
        const daysSinceContact = daysSince(getLastActivityDate(lead));
        const priorityValue = analysis.salesScore * -1 + daysSinceContact * 2;
        return { lead, analysis, daysSinceContact, priorityValue };
      })
      .sort((a, b) => b.priorityValue - a.priorityValue)
      .slice(0, MAX_PRIORITIES);

    return Promise.all(
      ranked.map(async ({ lead, analysis, daysSinceContact }) => {
        const gaps = deriveGapsFromBreakdown(analysis.scoreBreakdown);
        const justification = await getJustification(lead.company.name, gaps, daysSinceContact);

        return {
          leadId: lead.id,
          companyName: lead.company.name,
          companyCategory: lead.company.category,
          salesScore: analysis.salesScore,
          leadTemperature: analysis.leadTemperature,
          daysSinceContact,
          justification,
        };
      })
    );
  },
};
