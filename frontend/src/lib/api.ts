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

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: "FREE" | "STARTER" | "PRO";
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export const api = {
  register(input: { name: string; email: string; password: string }) {
    return request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  login(input: { email: string; password: string }) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  logout() {
    return request<void>("/api/auth/logout", { method: "POST" });
  },
};
