import { prisma } from "@/config/database";
import { env } from "@/config/env";

// Modelo mais avançado, reservado para geração de conteúdo comercial (qualidade do texto
// tem impacto direto na conversão) — diferente do modelo económico usado no scoring.
const CONTENT_MODEL = "claude-sonnet-5";

export type ContentType = "script" | "email" | "whatsapp" | "proposta";

interface ContentGenerationContext {
  userServiceType: string;
  companyName: string;
  companyCategory: string;
  recommendedService: string;
  keyGaps: string[];
  websiteScore: number;
  tone: "formal" | "casual";
}

interface GenerateInput {
  leadId: string;
  userId: string;
  type: ContentType;
}

function deriveKeyGaps(analysis: {
  websiteScore: number | null;
  seoScore: number | null;
  scoreBreakdown: unknown;
}): string[] {
  const breakdown = (analysis.scoreBreakdown ?? {}) as Record<string, number>;
  const gaps: string[] = [];

  if ((analysis.websiteScore ?? 0) === 0) gaps.push("sem website");
  else if ((analysis.websiteScore ?? 0) < 50) gaps.push("website desatualizado ou de baixa qualidade");

  if ((analysis.seoScore ?? 0) < 50) gaps.push("sem otimização SEO local");
  if ((breakdown.reviewsScore ?? 100) < 40) gaps.push("poucas avaliações online");
  if ((breakdown.socialPresence ?? 100) < 40) gaps.push("sem presença ativa em redes sociais");
  if ((breakdown.googleBusinessScore ?? 100) < 60) gaps.push("perfil do Google Business incompleto");

  return gaps.length ? gaps : ["baixa maturidade digital geral"];
}

async function buildContext(leadId: string, userId: string): Promise<ContentGenerationContext> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
    include: { company: { include: { analysis: true } }, user: true },
  });

  if (!lead) {
    throw Object.assign(new Error("Lead não encontrado."), { statusCode: 404 });
  }

  if (!lead.company.analysis) {
    throw Object.assign(
      new Error("A análise desta empresa ainda não está pronta. Tenta novamente dentro de momentos."),
      { statusCode: 409 }
    );
  }

  return {
    userServiceType: lead.user.serviceType ?? "serviços de marketing digital",
    companyName: lead.company.name,
    companyCategory: lead.company.category,
    recommendedService: lead.company.analysis.recommendedService,
    keyGaps: deriveKeyGaps(lead.company.analysis),
    websiteScore: lead.company.analysis.websiteScore ?? 0,
    tone: "casual",
  };
}

function buildPrompt(type: ContentType, ctx: ContentGenerationContext): string {
  const gaps = ctx.keyGaps.join(", ");

  switch (type) {
    case "script":
      return `Você é um especialista em vendas B2B para pequenas empresas.

Crie um script de chamada curto (máximo 150 palavras) para ${ctx.userServiceType} contactar a empresa "${ctx.companyName}" (${ctx.companyCategory}).

Dados da análise:
- Principais lacunas identificadas: ${gaps}
- Serviço recomendado: ${ctx.recommendedService}

O script deve:
- Abrir com uma frase natural, não robótica.
- Mencionar UM insight específico e real sobre a presença digital da empresa (baseado nas lacunas).
- Apresentar o valor de forma breve, sem ser insistente.
- Terminar com uma pergunta aberta que convide a uma conversa (não um fecho agressivo).
- Usar tom ${ctx.tone}.

Responda apenas com o script, sem explicações adicionais.`;

    case "email":
      return `Você é um especialista em copywriting comercial B2B.

Escreva um email curto e persuasivo de ${ctx.userServiceType} para a empresa "${ctx.companyName}" (${ctx.companyCategory}).

Dados da análise:
- Principais lacunas identificadas: ${gaps}
- Serviço recomendado: ${ctx.recommendedService}

Regras:
- Assunto do email: curto e específico (evitar genérico como "Proposta de Serviços").
- Corpo: máximo 120 palavras.
- Deve referenciar um dado concreto e real da análise (ex: ausência de website, avaliações baixas).
- Não deve soar como um template genérico de spam.
- Fechar com uma chamada para ação simples (ex: agendar uma chamada de 10 minutos).
- Tom: ${ctx.tone}.

Responda em JSON:
{
  "subject": "...",
  "body": "..."
}`;

    case "whatsapp":
      return `Você é um especialista em vendas via WhatsApp para pequenas empresas.

Escreva uma mensagem de WhatsApp curta (máximo 60 palavras) para ${ctx.userServiceType} contactar "${ctx.companyName}".

Dados da análise:
- Principais lacunas identificadas: ${gaps}
- Serviço recomendado: ${ctx.recommendedService}

Regras:
- Tom conversacional, direto, como uma pessoa real escreveria (não formal como email).
- Pode usar 1 emoji relevante, no máximo.
- Referenciar UM insight real da análise.
- Terminar com uma pergunta simples e de baixo compromisso.

Responda apenas com a mensagem.`;

    case "proposta":
      return `Você é um consultor comercial especializado em criar propostas para pequenas empresas.

Crie uma proposta comercial estruturada de ${ctx.userServiceType} para a empresa "${ctx.companyName}" (${ctx.companyCategory}).

Dados da análise completa:
- Website Score: ${ctx.websiteScore}/100
- Principais lacunas identificadas: ${gaps}
- Serviço(s) recomendado(s): ${ctx.recommendedService}

Estruture a proposta com as seguintes secções:
1. Diagnóstico (resumo objetivo da situação digital atual da empresa, baseado nos dados reais)
2. Oportunidade (o que está a ser perdido por não resolver essas lacunas)
3. Solução Proposta (o que o serviço recomendado vai entregar, em termos práticos)
4. Próximos Passos (call to action claro)

Regras:
- Tom profissional mas acessível, sem jargão técnico excessivo.
- Máximo 300 palavras no total.
- Basear-se sempre nos dados reais fornecidos, nunca inventar métricas.

Responda em JSON:
{
  "diagnostico": "...",
  "oportunidade": "...",
  "solucao": "...",
  "proximos_passos": "..."
}`;
  }
}

const JSON_RESPONSE_TYPES: ContentType[] = ["email", "proposta"];

async function callAnthropic(prompt: string): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    throw Object.assign(new Error("IA não está configurada (falta ANTHROPIC_API_KEY)."), { statusCode: 503 });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CONTENT_MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Falha ao gerar conteúdo com IA (${res.status}): ${body}`), { statusCode: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((block) => block.type === "text")?.text;

  if (!text) {
    throw Object.assign(new Error("A IA não devolveu conteúdo."), { statusCode: 502 });
  }

  return text;
}

export const contentGenerationService = {
  async generate({ leadId, userId, type }: GenerateInput) {
    const ctx = await buildContext(leadId, userId);
    const prompt = buildPrompt(type, ctx);
    const rawText = await callAnthropic(prompt);

    let content: unknown;
    if (JSON_RESPONSE_TYPES.includes(type)) {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      try {
        content = JSON.parse(cleaned);
      } catch {
        throw Object.assign(new Error("A IA devolveu um formato inesperado. Tenta novamente."), { statusCode: 502 });
      }
    } else {
      content = { text: rawText.trim() };
    }

    return prisma.generatedContent.create({
      data: { leadId, type, content: content as never },
    });
  },
};
