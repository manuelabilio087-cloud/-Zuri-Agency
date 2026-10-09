"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowUpRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, Lead, LeadStatus } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TemperatureBadge } from "@/components/temperature-badge";
import { StatusSelect } from "@/components/status-select";
import { formatCategory } from "@/lib/format";

const STATUS_TABS: { value: LeadStatus | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "NOVO", label: "Novo" },
  { value: "CONTACTADO", label: "Contactado" },
  { value: "EM_NEGOCIACAO", label: "Em negociação" },
  { value: "FECHADO", label: "Fechado" },
  { value: "PERDIDO", label: "Perdido" },
];

export default function LeadsPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [activeTab, setActiveTab] = useState<LeadStatus | "TODOS">("TODOS");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  const loadLeads = useCallback(() => {
    if (!accessToken) return;
    const filters = activeTab === "TODOS" ? undefined : { status: activeTab };
    api.listLeads(accessToken, filters).then(setLeads).catch(() => setLeads([]));
  }, [accessToken, activeTab]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Analisa de uma vez os leads guardados sem análise (respeitando o limite do plano).
  const [bulk, setBulk] = useState<"idle" | "running" | "limit">("idle");
  const unanalyzed = leads?.filter((l) => !l.company.analysis) ?? [];

  async function handleAnalyzePending() {
    if (!accessToken || unanalyzed.length === 0) return;
    setBulk("running");
    let hitLimit = false;
    for (const lead of unanalyzed) {
      try {
        await api.analyzeCompany(accessToken, lead.company.id);
      } catch (err) {
        if (err instanceof ApiError && err.upgradeRequired) {
          hitLimit = true;
          break;
        }
      }
    }
    // As análises correm em segundo plano: recarrega a lista algumas vezes.
    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      loadLeads();
    }
    setBulk(hitLimit ? "limit" : "idle");
  }

  async function handleStatusChange(leadId: string, status: LeadStatus) {
    if (!accessToken) return;
    setLeads((prev) => prev?.map((l) => (l.id === leadId ? { ...l, status } : l)) ?? null);
    await api.updateLeadStatus(accessToken, leadId, status).catch(() => loadLeads());
  }

  if (isLoading || !user) return null;

  return (
    <DashboardShell>
      <PageHeader
        title="Leads"
        description="Acompanha o estado de cada empresa que guardaste."
        actions={
          <Link
            href="/search"
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} />
            Nova pesquisa
          </Link>
        }
      />

      {unanalyzed.length > 0 && (
        <div className="glass-panel mb-5 flex flex-col gap-3 rounded-2xl p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              {unanalyzed.length} {unanalyzed.length === 1 ? "lead ainda sem análise" : "leads ainda sem análise"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {bulk === "limit"
                ? "Atingiste o limite de análises do plano este mês."
                : "Cada lead analisado gasta 1 análise do teu plano."}
            </p>
          </div>
          {bulk === "limit" ? (
            <Link href="/plan" className="rounded-full bg-[var(--accent)] px-4 py-2 text-center text-sm font-medium text-white">
              Ver planos
            </Link>
          ) : (
            <button
              onClick={handleAnalyzePending}
              disabled={bulk === "running"}
              className="flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {bulk === "running" && <Loader2 size={14} className="animate-spin" />}
              {bulk === "running" ? "A analisar…" : "Analisar agora"}
            </button>
          )}
        </div>
      )}

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-[var(--accent)] text-white"
                : "glass-panel text-[var(--text-muted)] hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-3xl p-1 sm:p-2">
        {leads === null ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">A carregar...</p>
        ) : leads.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">
            Nenhum lead nesta categoria.{" "}
            <Link href="/search" className="text-[var(--accent)] underline">
              Fazer uma pesquisa
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-[var(--panel-border)]">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <Link href={`/leads/${lead.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold">
                    {lead.company.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium group-hover:underline">
                      <span className="truncate">{lead.company.name}</span>
                      <ArrowUpRight size={13} className="flex-shrink-0 text-[var(--text-muted)]" />
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {formatCategory(lead.company.category)} · {lead.company.city}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {lead.company.analysis ? (
                    <div className="flex items-center gap-3">
                      <TemperatureBadge temperature={lead.company.analysis.leadTemperature} />
                      <span className="w-8 text-right tabular-nums text-sm font-semibold" title="Sales score">
                        {lead.company.analysis.salesScore}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Sem análise</span>
                  )}
                  <StatusSelect value={lead.status} onChange={(status) => handleStatusChange(lead.id, status)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
