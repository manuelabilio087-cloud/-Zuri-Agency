import type { Company } from "@prisma/client";
import type { TechnicalSignals } from "@/modules/companies/website-analyzer.service";

// Pesos ajustáveis via configuração, não hardcoded na fórmula (PRD secção 4.1).
const SALES_SCORE_WEIGHTS = {
  websiteScore: 0.35,
  googleBusinessScore: 0.2,
  reviewsScore: 0.2,
  contactAvailability: 0.15,
  socialPresence: 0.1,
};

const SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "wa.me", "linkedin.com", "tiktok.com"];
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export interface ScoreBreakdown {
  websiteScore: number;
  seoScore: number;
  googleBusinessScore: number;
  reviewsScore: number;
  contactAvailability: number;
  socialPresence: number;
  weights: typeof SALES_SCORE_WEIGHTS;
}

export interface ScoringResult {
  salesScore: number;
  leadTemperature: string;
  recommendedService: string;
  closeProbability: number;
  scoreBreakdown: ScoreBreakdown;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Baseado nos dados já retornados pela Google Places API. Simplificação atual:
// como o schema `Company` ainda não guarda fotos/horário de funcionamento (fase futura),
// usamos website/rating/categoria como proxies de completude do perfil (PRD 4.2).
function calculateGoogleBusinessScore(company: Company): number {
  let score = 0;
  if (company.category) score += 25;
  if (company.website) score += 25;
  if (company.rating !== null) score += 25;
  if (company.phone) score += 25;
  return score;
}

function calculateReviewsScore(company: Company): number {
  const reviewCount = company.reviewsCount ?? 0;
  const rating = company.rating ?? 0;
  return clamp(Math.min(100, reviewCount * 2) * 0.5 + (rating / 5) * 100 * 0.5, 0, 100);
}

// Telefone = 50, endereço completo = 20 (PRD). O terceiro fator do PRD é email (30 pts),
// que a Google Places API não devolve — em alternativa, tentamos detetar um email no
// próprio texto do website, quando disponível.
function calculateContactAvailability(company: Company, technical: TechnicalSignals | null): number {
  let score = 0;
  if (company.phone) score += 50;
  if (company.address) score += 20;
  if (technical?.bodyTextSample && EMAIL_REGEX.test(technical.bodyTextSample)) score += 30;
  return clamp(score, 0, 100);
}

function calculateSocialPresence(technical: TechnicalSignals | null): number {
  if (!technical?.rawHtml) return 0;
  const detected = SOCIAL_DOMAINS.filter((domain) => technical.rawHtml.includes(domain));
  return clamp(detected.length * 20, 0, 100);
}

function classifyTemperature(websiteScore: number, salesScore: number, reviewsScore: number): string {
  // Sem website = oportunidade imediata e clara → Muito Quente
  if (websiteScore === 0) return "muito_quente";
  // Website fraco + boa reputação (tem clientes, falha só na presença digital) → Muito Quente
  if (websiteScore < 40 && reviewsScore > 60) return "muito_quente";
  if (websiteScore < 50) return "quente";
  if (websiteScore < 75) return "morno";
  return "frio";
}

function recommendServices(input: {
  websiteScore: number;
  seoScore: number;
  googleBusinessScore: number;
  socialPresence: number;
}): string[] {
  const recommendations: string[] = [];
  if (input.websiteScore === 0) recommendations.push("Criação de Website");
  if (input.seoScore < 50) recommendations.push("SEO Local");
  if (input.googleBusinessScore < 60) recommendations.push("Otimização Google Business");
  if (input.socialPresence < 40) recommendations.push("Gestão de Redes Sociais");
  if (input.websiteScore > 0 && input.websiteScore < 50) recommendations.push("Redesign de Website");
  return recommendations.length ? recommendations : ["Consultoria Digital Geral"];
}

export const scoringService = {
  // Combina os sinais recolhidos (Website Score/SEO Score já calculados pelo website-analyzer,
  // mais os dados da própria empresa) em Sales Score, Lead Temperature, serviço recomendado e
  // probabilidade de fecho — determinístico, sem chamadas à IA (PRD secção 4-6).
  score(company: Company, websiteScore: number, seoScore: number, technical: TechnicalSignals | null): ScoringResult {
    const googleBusinessScore = calculateGoogleBusinessScore(company);
    const reviewsScore = calculateReviewsScore(company);
    const contactAvailability = calculateContactAvailability(company, technical);
    const socialPresence = calculateSocialPresence(technical);

    const salesScore = Math.round(
      websiteScore * SALES_SCORE_WEIGHTS.websiteScore +
        googleBusinessScore * SALES_SCORE_WEIGHTS.googleBusinessScore +
        reviewsScore * SALES_SCORE_WEIGHTS.reviewsScore +
        contactAvailability * SALES_SCORE_WEIGHTS.contactAvailability +
        socialPresence * SALES_SCORE_WEIGHTS.socialPresence
    );

    const leadTemperature = classifyTemperature(websiteScore, salesScore, reviewsScore);
    const recommendations = recommendServices({ websiteScore, seoScore, googleBusinessScore, socialPresence });

    // Nunca 100% (mantém credibilidade) nem abaixo de 20% (mesmo leads frios merecem tentativa) — PRD 6.2.
    const closeProbability = Math.round(clamp((100 - salesScore) * 0.6 + recommendations.length * 10, 20, 95));

    return {
      salesScore,
      leadTemperature,
      recommendedService: recommendations.join(", "),
      closeProbability,
      scoreBreakdown: {
        websiteScore,
        seoScore,
        googleBusinessScore,
        reviewsScore: Math.round(reviewsScore),
        contactAvailability,
        socialPresence,
        weights: SALES_SCORE_WEIGHTS,
      },
    };
  },
};
