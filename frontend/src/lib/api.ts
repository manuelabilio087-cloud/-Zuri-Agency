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
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: authHeader(token),
  });

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
export type ContentType = "script" | "email" | "whatsapp" | "proposta";

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

  updateProfile(token: string, input: { serviceType?: string; city?: string }) {
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
    return request<{ status: "pending" | "done"; analysis: CompanyAnalysis | null }>(
      `/api/companies/${id}/analysis-status`,
      { headers: authHeader(token) }
    );
  },

  saveLead(token: string, companyId: string) {
    return request<Lead>("/api/leads", {
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
};
