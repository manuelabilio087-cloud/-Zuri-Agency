"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";

export default function ExportPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  async function handleDownloadExcel() {
    if (!accessToken) return;
    setDownloading(true);
    setError(null);
    try {
      await api.downloadLeadsExcel(accessToken);
    } catch (err) {
      if (err instanceof ApiError && err.upgradeRequired) {
        setError("A exportação Excel está disponível a partir do plano Starter.");
      } else {
        setError(err instanceof ApiError ? err.message : "Erro ao gerar o ficheiro.");
      }
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading || !user) return null;

  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Exportar</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Descarrega os teus leads para partilhar ou analisar fora da plataforma.
        </p>
      </div>

      <div className="glass-panel max-w-md rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <p className="font-medium">Excel — Todos os Leads</p>
            <p className="text-xs text-[var(--text-muted)]">Empresa, contacto, scores, status</p>
          </div>
        </div>

        <button
          onClick={handleDownloadExcel}
          disabled={downloading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          Descarregar Excel
        </button>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--temp-muito-quente)]">
            <Lock size={12} /> {error}
          </p>
        )}
      </div>

      <p className="mt-4 max-w-md text-xs text-[var(--text-muted)]">
        Para exportar a proposta comercial de um lead específico em PDF, abre o lead e usa o botão &quot;Descarregar
        PDF&quot; (disponível depois de gerares uma proposta) — exclusivo do plano Pro.
      </p>
    </DashboardShell>
  );
}
