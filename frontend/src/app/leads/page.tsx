"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, Lead, LeadStatus } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TemperatureBadge } from "@/components/temperature-badge";
import { StatusSelect } from "@/components/status-select";

const STATUS_TABS: { value: LeadStatus | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "NOVO", label: "Novo" },
  { value: "CONTACTADO", label: "Contactado" },
  { value: "EM_NEGOCIACAO", label: "Em Negociação" },
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

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
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
                      {lead.company.category} · {lead.company.city}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center justify-between gap-3 pl-[52px] sm:justify-end sm:pl-0">
                  {lead.company.analysis ? (
                    <div className="flex items-center gap-3">
                      <TemperatureBadge temperature={lead.company.analysis.leadTemperature} />
                      <span className="w-8 text-right tabular-nums text-sm font-semibold" title="Sales score">
                        {lead.company.analysis.salesScore}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">A analisar…</span>
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
