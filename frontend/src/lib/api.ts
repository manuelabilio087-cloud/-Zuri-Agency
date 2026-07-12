const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ApiErrorBody {
  message?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include", // envia o cookie httpOnly com o refresh token
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.message ?? `Erro ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type Plan = "FREE" | "STARTER" | "PRO";
export type LeadStatus = "NOVO" | "CONTACTADO" | "EM_NEGOCIACAO" | "FECHADO" | "PERDIDO";
export type LeadTemperature = "frio" | "morno" | "quente" | "muito_quente";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  serviceType?: string | null;
  city?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface CompanyAnalysis {
  websiteScore: number | null;
  seoScore: number | null;
  salesScore: number;
  leadTemperature: LeadTemperature;
  recommendedService: string;
  closeProbability: number;
}

export interface Company {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewsCount: number | null;
  city: string;
  analysis: CompanyAnalysis | null;
}

export interface Lead {
  id: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  company: Company;
}

export interface UsageMetric {
  used: number;
  limit: number;
}

export interface UsageResponse {
  plan: Plan;
  searches: UsageMetric;
  analyses: UsageMetric;
  aiGenerations: UsageMetric;
}

export const api = {
  register(input: { name: string; email: string; password: string }) {
    return request<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
  },

  login(input: { email: string; password: string }) {
    return request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
  },

  // Restaura a sessão a partir do cookie httpOnly (usado ao recarregar a página).
  refresh() {
    return request<AuthResponse>("/api/auth/refresh", { method: "POST" });
  },

  logout() {
    return request<void>("/api/auth/logout", { method: "POST" });
  },

  getUsage(token: string) {
    return request<UsageResponse>("/api/auth/usage", { headers: authHeader(token) });
  },

  listLeads(token: string, params?: { status?: LeadStatus; temperature?: LeadTemperature }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.temperature) query.set("temperature", params.temperature);
    const qs = query.toString();
    return request<Lead[]>(`/api/leads${qs ? `?${qs}` : ""}`, { headers: authHeader(token) });
  },

  getFollowUps(token: string) {
    return request<Lead[]>("/api/leads/follow-ups", { headers: authHeader(token) });
  },

  searchCompanies(token: string, input: { category: string; city: string }) {
    return request<{ companies: Company[]; source: string }>("/api/companies/search", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(input),
    });
  },

  saveLead(token: string, companyId: string) {
    return request<Lead>("/api/leads", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ companyId }),
    });
  },
};
