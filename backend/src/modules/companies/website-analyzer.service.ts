import { env } from "@/config/env";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"; // modelo custo-eficiente para scoring (PRD secção "Prompt 3", nota de custo)
const FETCH_TIMEOUT_MS = 8_000;
const TEXT_SAMPLE_LIMIT = 3_000;

export interface TechnicalSignals {
  accessible: boolean;
  https: boolean;
  mobileFriendly: boolean;
  loadTimeMs: number | null;
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  hasStructuredData: boolean;
  bodyTextSample: string;
  rawHtml: string;
}

export interface QualitativeSignals {
  contentQuality: number; // 0-10
  contactClarity: number; // 0-10
  ctaPresence: number; // 0-10
  visualFreshness: number; // 0-10
  summary: string;
}

export interface WebsiteAnalysisResult {
  websiteScore: number;
  seoScore: number;
  technical: TechnicalSignals;
  qualitative: QualitativeSignals | null;
}

async function fetchTechnicalSignals(url: string): Promise<TechnicalSignals> {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const loadTimeMs = Date.now() - start;
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
    const hasStructuredData = /application\/ld\+json|schema\.org/i.test(html);

    return {
      accessible: true,
      https: url.startsWith("https://"),
      mobileFriendly: hasViewport,
      loadTimeMs,
      title: titleMatch?.[1]?.trim() ?? null,
      metaDescription: metaDescMatch?.[1]?.trim() ?? null,
      h1Count,
      hasStructuredData,
      bodyTextSample: extractVisibleText(html).slice(0, TEXT_SAMPLE_LIMIT),
      rawHtml: html.slice(0, 20_000), // suficiente para deteção de redes sociais, sem carregar demasiado texto em memória
    };
  } catch {
    // Site inacessível (timeout, fora do ar, bloqueio de scraping): não trava o pipeline,
    // é tratado como sinal de baixa maturidade digital (PRD secção 5.2).
    return {
      accessible: false,
      https: url.startsWith("https://"),
      mobileFriendly: false,
      loadTimeMs: null,
      title: null,
      metaDescription: null,
      h1Count: 0,
      hasStructuredData: false,
      bodyTextSample: "",
      rawHtml: "",
    };
  }
}

function extractVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getQualitativeSignals(signals: TechnicalSignals): Promise<QualitativeSignals | null> {
  if (!env.ANTHROPIC_API_KEY || !signals.accessible) return null;

  const prompt = `Você é um analista digital especializado em avaliar a maturidade digital de pequenas empresas.

Analise o seguinte conteúdo extraído do website de uma empresa:

Título: ${signals.title ?? "(não encontrado)"}
Meta description: ${signals.metaDescription ?? "(não encontrada)"}
Texto visível (resumo): ${signals.bodyTextSample || "(sem conteúdo textual extraído)"}

Avalie os seguintes fatores, cada um numa escala de 0 a 10:
1. Qualidade e clareza do conteúdo (o texto comunica bem o que a empresa faz?)
2. Presença de informação de contacto clara (telefone, email, endereço visíveis)
3. Presença de chamada para ação (CTA) visível (ex: "Contacte-nos", "Marque agora", "Compre já")
4. Sinais de design/atualidade visual (baseado no texto e estrutura, a empresa parece ter um site atual e profissional, ou desatualizado)

Responda APENAS em JSON, sem texto adicional, no seguinte formato:
{
  "content_quality": 0-10,
  "contact_clarity": 0-10,
  "cta_presence": 0-10,
  "visual_freshness": 0-10,
  "summary": "uma frase curta resumindo o estado geral do website"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const textBlock = data.content?.find((block) => block.type === "text")?.text;
    if (!textBlock) return null;

    const cleaned = textBlock.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      content_quality: number;
      contact_clarity: number;
      cta_presence: number;
      visual_freshness: number;
      summary: string;
    };

    return {
      contentQuality: clamp(parsed.content_quality, 0, 10),
      contactClarity: clamp(parsed.contact_clarity, 0, 10),
      ctaPresence: clamp(parsed.cta_presence, 0, 10),
      visualFreshness: clamp(parsed.visual_freshness, 0, 10),
      summary: parsed.summary ?? "",
    };
  } catch {
    // IA indisponível ou resposta malformada: não bloqueia o pipeline, apenas fica sem os fatores qualitativos.
    return null;
  }
}

function scoreSpeed(loadTimeMs: number | null): number {
  if (loadTimeMs === null) return 0;
  if (loadTimeMs < 2_000) return 15;
  if (loadTimeMs < 4_000) return 8;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value ?? 0));
}

export const websiteAnalyzerService = {
  // Empresas sem website: websiteScore = 0 direto, sem chamada à IA (PRD 2.4).
  async analyze(website: string | null): Promise<WebsiteAnalysisResult | null> {
    if (!website) return null;

    const technical = await fetchTechnicalSignals(website);
    const qualitative = await getQualitativeSignals(technical);

    const httpsScore = technical.https ? 10 : 0;
    const mobileScore = technical.mobileFriendly ? 15 : 0;
    const speedScore = scoreSpeed(technical.loadTimeMs);
    const metaScore = (technical.title ? 5 : 0) + (technical.metaDescription ? 5 : 0);

    const contentQuality = qualitative?.contentQuality ?? 0;
    const contactClarity = qualitative?.contactClarity ?? 0;
    const ctaPresence = qualitative?.ctaPresence ?? 0;
    const visualFreshness = qualitative?.visualFreshness ?? 0;

    const websiteScore = clamp(
      httpsScore + mobileScore + speedScore + metaScore + contentQuality * 2 + contactClarity + ctaPresence + visualFreshness,
      0,
      100
    );

    // SEO Score: inteiramente determinístico (parsing de HTML), sem IA (PRD secção 3).
    const titleLengthOk = (technical.title?.length ?? 0) >= 30 && (technical.title?.length ?? 0) <= 60;
    const descLengthOk = (technical.metaDescription?.length ?? 0) >= 120 && (technical.metaDescription?.length ?? 0) <= 160;
    const headingsOk = technical.h1Count === 1;

    const seoScore = clamp(
      (technical.title && titleLengthOk ? 20 : technical.title ? 10 : 0) +
        (technical.metaDescription && descLengthOk ? 20 : technical.metaDescription ? 10 : 0) +
        (headingsOk ? 20 : 0) +
        (technical.https ? 15 : 0) +
        scoreSpeed(technical.loadTimeMs) +
        (technical.hasStructuredData ? 10 : 0),
      0,
      100
    );

    return { websiteScore, seoScore, technical, qualitative };
  },
};
