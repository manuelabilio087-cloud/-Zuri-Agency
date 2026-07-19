"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const SERVICE_SUGGESTIONS = [
  "Criação de Websites",
  "SEO Local",
  "Gestão de Redes Sociais",
  "Marketing Digital",
  "Design Gráfico",
  "Consultoria Digital",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, accessToken, isLoading, setSession } = useAuth();

  const [serviceType, setServiceType] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const { user: updatedUser } = await api.updateProfile(accessToken, { serviceType, city });
      setSession(updatedUser, accessToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  if (isLoading || !user) return null;

  return (
    <main className="bg-ambient flex min-h-screen items-center justify-center px-4 text-[var(--text-primary)]">
      <form onSubmit={handleSubmit} className="glass-panel w-full max-w-md space-y-5 rounded-3xl p-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] font-display text-sm font-bold text-white">
              Z
            </div>
            <span className="font-display text-lg font-semibold">Zuri Agency</span>
          </div>
          <h1 className="font-display text-xl font-semibold">Só mais duas coisas, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Isto ajuda-nos a personalizar as abordagens comerciais geradas por IA para as empresas que encontrares.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">O que vendes?</label>
          <input
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="Ex: Criação de Websites"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {SERVICE_SUGGESTIONS.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => setServiceType(suggestion)}
                className="rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:bg-white/5 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">Em que cidade atuas?</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Maputo"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-[var(--temp-muito-quente)]">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !serviceType || !city}
            className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "A guardar..." : "Continuar"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-xl px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-white"
          >
            Pular
          </button>
        </div>
      </form>
    </main>
  );
}
