"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, accessToken } = await api.register({ name, email, password });
      setSession(user, accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Criar conta na Zuri Agency</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium">Nome</label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "A criar conta..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Já tens conta?{" "}
          <a href="/login" className="font-medium text-slate-900 underline">
            Entrar
          </a>
        </p>
      </form>
    </main>
  );
}
