"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

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
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-ambient flex min-h-screen items-center justify-center px-4 text-[var(--text-primary)]">
      <form onSubmit={handleSubmit} className="glass-panel w-full max-w-sm space-y-4 rounded-3xl p-8">
        <div className="mb-2 flex items-center gap-2">
          <Logo />
        </div>
        <h1 className="font-display text-xl font-semibold">Criar conta</h1>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">Nome</label>
          <input
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">Password</label>
          <input
            type="password"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && <p className="text-sm text-[var(--temp-muito-quente)]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "A criar conta..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-[var(--text-muted)]">
          Já tens conta?{" "}
          <a href="/login" className="font-medium text-white underline">
            Entrar
          </a>
        </p>
      </form>
    </main>
  );
}
