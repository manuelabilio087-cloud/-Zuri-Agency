const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ApiErrorBody {
  message?: string;
  upgradeRequired?: boolean;
}

export class ApiError extends Error {
  status: number;
  upgradeRequired: boolean;
  constructor(message: string, status: number, upgradeRequired = false) {
    super(message);
    this.status = status;
    this.upgradeRequired = upgradeRequired;
  }
}

// ---------------------------------------------------------------------------
// Renovação automática da sessão
// O access token dura 15 min. Quando um pedido autenticado recebe 401, renovamos
// o token com o cookie de refresh e repetimos o pedido uma vez — o utilizador
// nunca vê "Token de acesso inválido ou expirado".
// ---------------------------------------------------------------------------
interface SessionListener {
  onRefreshed?: (user: AuthUser, accessToken: string) => void;
  onExpired?: () => void;
}

let sessionListener: SessionListener = {};

export function setSessionListener(listener: SessionListener) {
  sessionListener = listener;
}

let refreshInFlight: Promise<AuthResponse> | null = null;

// Partilhada entre pedidos simultâneos: só um pedido de refresh vai ao servidor.
export function refreshSession(): Promise<AuthResponse> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new ApiError("Sessão expirada. Entra novamente.", res.status);
        return (await res.json()) as AuthResponse;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function hasBearer(headers: HeadersInit | undefined): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has("Authorization");
  if (Array.isArray(headers)) return headers.some(([key]) => key.toLowerCase() === "authorization");
  return Object.keys(headers).some((key) => key.toLowerCase() === "authorization");
}

async function fetchWithSession(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, { ...init, credentials: "include" });
  if (res.status !== 401 || !hasBearer(init.headers)) return res;

  try {
    const session = await refreshSession();
    sessionListener.onRefreshed?.(session.user, session.accessToken);
    return fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${session.accessToken}` },
    });
  } catch {
    sessionListener.onExpired?.();
    return res;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithSession(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(body.message ?? `Erro ${res.status}`, res.status, body.upgradeRequired ?? false);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Descarrega um ficheiro binário (Excel/PDF) autenticado e força o "Save As" do browser.
async function downloadFile(path: string, token: string, filename: string): Promise<void> {
  const res = await fetchWithSession(path, { headers: authHeader(token) });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(body.message ?? `Erro ${res.status}`, res.status, body.upgradeRequired ?? false);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export type Plan = "FREE" | "STARTER" | "PRO";
export type LeadStatus = "NOVO" | "CONTACTADO" | "EM_NEGOCIACAO" | "FECHADO" | "PERDIDO";
export type LeadTemperature = "frio" | "morno" | "quente" | "muito_quente";
// done: pronta · pending: a decorrer · idle: ainda não pedida (analisa-se ao guardar o lead)
export type AnalysisStatus = "done" | "pending" | "idle";

export type ContentType = "script" | "email" | "whatsapp" | "proposta";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  role?: "USER" | "ADMIN";
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

export interface LeadNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface GeneratedContent {
  id: string;
  type: ContentType;
  content: Record<string, string>;
  createdAt: string;
}

export interface Lead {
  id: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  company: Company;
  notes?: LeadNote[];
  generatedContents?: GeneratedContent[];
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

export interface PrioritizedLead {
  leadId: string;
  companyName: string;
  companyCategory: string;
  salesScore: number;
  leadTemperature: LeadTemperature;
  daysSinceContact: number;
  justification: string | null;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: { leads: number };
}

export interface AdminMetrics {
  totalUsers: number;
  planDistribution: Partial<Record<Plan, number>>;
  mrr: number;
  usageThisMonth: { searches: number; analyses: number; aiGenerations: number };
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  role: "USER" | "ADMIN";
  serviceType: string | null;
  city: string | null;
  createdAt: string;
  leads: Array<{ id: string; status: LeadStatus; createdAt: string; company: { name: string } }>;
  usageTotals: { searches: number; analyses: number; aiGenerations: number };
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
    return refreshSession();
  },

  logout() {
    return request<void>("/api/auth/logout", { method: "POST" });
  },

  getUsage(token: string) {
    return request<UsageResponse>("/api/auth/usage", { headers: authHeader(token) });
  },

  updateProfile(token: string, input: { name?: string; serviceType?: string; city?: string }) {
    return request<{ user: AuthUser }>("/api/auth/me", {
      method: "PATCH",
      headers: authHeader(token),
      body: JSON.stringify(input),
    });
  },

  listLeads(token: string, params?: { status?: LeadStatus; temperature?: LeadTemperature }) {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.temperature) query.set("temperature", params.temperature);
    const qs = query.toString();
    return request<Lead[]>(`/api/leads${qs ? `?${qs}` : ""}`, { headers: authHeader(token) });
  },

  getLead(token: string, leadId: string) {
    return request<Lead>(`/api/leads/${leadId}`, { headers: authHeader(token) });
  },

  getFollowUps(token: string) {
    return request<Lead[]>("/api/leads/follow-ups", { headers: authHeader(token) });
  },

  updateLeadStatus(token: string, leadId: string, status: LeadStatus) {
    return request<Lead>(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: authHeader(token),
      body: JSON.stringify({ status }),
    });
  },

  addLeadNote(token: string, leadId: string, content: string) {
    return request<Lead>(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ content }),
    });
  },

  searchCompanies(token: string, input: { category: string; city: string }) {
    return request<{ companies: Company[]; source: string }>("/api/companies/search", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(input),
    });
  },

  getCompany(token: string, id: string) {
    return request<Company>(`/api/companies/${id}`, { headers: authHeader(token) });
  },

  getAnalysisStatus(token: string, id: string) {
    return request<{ status: AnalysisStatus; analysis: CompanyAnalysis | null }>(
      `/api/companies/${id}/analysis-status`,
      { headers: authHeader(token) }
    );
  },

  // Pede a análise de uma empresa; 403 com upgradeRequired quando o limite do plano acabou.
  analyzeCompany(token: string, companyId: string) {
    return request<{ status: "done" | "pending" }>(`/api/companies/${companyId}/analyze`, {
      method: "POST",
      headers: authHeader(token),
    });
  },

  saveLead(token: string, companyId: string) {
    return request<Lead & { analysisStatus: "done" | "pending" | "limit" | null }>("/api/leads", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify({ companyId }),
    });
  },

  generateContent(token: string, input: { leadId: string; type: ContentType }) {
    return request<GeneratedContent>("/api/ai/generate-content", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(input),
    });
  },

  getDailyPriorities(token: string) {
    return request<PrioritizedLead[]>("/api/ai/daily-priorities", { headers: authHeader(token) });
  },

  downloadLeadsExcel(token: string) {
    return downloadFile("/api/leads/export/excel", token, `zuri-agency-leads-${Date.now()}.xlsx`);
  },

  downloadProposalPdf(token: string, leadId: string, companyName: string) {
    return downloadFile(`/api/leads/${leadId}/export/pdf`, token, `proposta-${companyName}.pdf`);
  },

  adminListUsers(token: string) {
    return request<AdminUserSummary[]>("/api/admin/users", { headers: authHeader(token) });
  },

  adminGetMetrics(token: string) {
    return request<AdminMetrics>("/api/admin/metrics", { headers: authHeader(token) });
  },

  adminGetUserDetail(token: string, userId: string) {
    return request<AdminUserDetail>(`/api/admin/users/${userId}`, { headers: authHeader(token) });
  },

  adminUpdateUser(token: string, userId: string, input: { plan?: Plan; role?: "USER" | "ADMIN" }) {
    return request<AdminUserSummary>(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: authHeader(token),
      body: JSON.stringify(input),
    });
  },
};
