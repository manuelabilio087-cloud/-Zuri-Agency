"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, Lock, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, PrioritizedLead, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TemperatureBadge } from "@/components/temperature-badge";
import { formatCategory } from "@/lib/format";

export default function PrioritiesPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [priorities, setPriorities] = useState<PrioritizedLead[] | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .getDailyPriorities(accessToken)
      .then(setPriorities)
      .catch((err) => {
        if (err instanceof ApiError && err.upgradeRequired) setUpgradeRequired(true);
        setPriorities([]);
      });
  }, [accessToken]);

  if (isLoading || !user) return null;

  return (
    <DashboardShell>
      <PageHeader
        title="Prioridades de hoje"
        description="Os leads que mais vale a pena contactares hoje, ordenados por oportunidade."
      />

      {upgradeRequired ? (
        <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-6 text-center sm:p-10">
          <Lock size={28} className="text-[var(--accent)]" />
          <p className="font-medium">Esta funcionalidade é exclusiva do plano Pro</p>
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Faz upgrade para desbloquear a priorização diária de leads com justificação gerada por IA.
          </p>
          <Link href="/plan" className="mt-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Ver planos
          </Link>
        </div>
      ) : priorities === null ? (
        <p className="text-sm text-[var(--text-muted)]">A carregar...</p>
      ) : priorities.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Sem leads ativos para priorizar.{" "}
          <Link href="/search" className="text-[var(--accent)] underline">
            Faz uma pesquisa
          </Link>{" "}
          para começar.
        </p>
      ) : (
        <div className="space-y-3">
          {priorities.map((p, index) => (
            <Link
              key={p.leadId}
              href={`/leads/${p.leadId}`}
              className="glass-panel flex items-start gap-3 rounded-2xl p-4 transition-colors hover:bg-white/5 sm:items-center sm:gap-4"
            >
              <span className="font-display flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.companyName}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{formatCategory(p.companyCategory)}</p>
                {p.justification && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--accent)]">
                    <Flame size={11} className="mt-0.5 flex-shrink-0" /> {p.justification}
                  </p>
                )}
              </div>

              <div className="flex flex-shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <span className="font-display order-first tabular-nums text-lg font-bold sm:order-last sm:w-10 sm:text-right">
                  {p.salesScore}
                </span>
                <TemperatureBadge temperature={p.leadTemperature} />
                <span className="flex items-center gap-1 whitespace-nowrap text-xs text-[var(--text-muted)]">
                  <Clock size={11} /> {p.daysSinceContact}d
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
