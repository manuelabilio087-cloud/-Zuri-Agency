"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";

export default function SettingsPage() {
  const router = useRouter();
  const { user, accessToken, isLoading, setSession } = useAuth();

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setServiceType(user.serviceType ?? "");
      setCity(user.city ?? "");
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { user: updatedUser } = await api.updateProfile(accessToken, { name, serviceType, city });
      setSession(updatedUser, accessToken);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao guardar. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !user) return null;

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Definições</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Gere os dados do teu perfil.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel max-w-lg space-y-4 rounded-3xl p-6">
        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white focus:border-[var(--accent)] focus:outline-none"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">Email</label>
          <input
            value={user.email}
            disabled
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/[0.02] px-3 py-2.5 text-sm text-[var(--text-muted)]"
          />
          <p className="text-xs text-[var(--text-muted)]">O email não pode ser alterado por agora.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">O que vendes?</label>
          <input
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="Ex: Criação de Websites"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-[var(--text-muted)]">Cidade</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Maputo"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-[var(--temp-muito-quente)]">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saved && <Check size={15} />}
          {saving ? "A guardar..." : saved ? "Guardado" : "Guardar alterações"}
        </button>
      </form>
    </DashboardShell>
  );
}
