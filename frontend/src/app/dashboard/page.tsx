"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowUpRight, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, Lead, UsageResponse } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { TemperatureDonut } from "@/components/temperature-donut";
import { UsageBar } from "@/components/usage-bar";

const TEMPERATURE_LABELS: Record<string, string> = {
  frio: "Frio",
  morno: "Morno",
  quente: "Quente",
  muito_quente: "Muito Quente",
};

const TEMPERATURE_COLORS: Record<string, string> = {
  frio: "var(--temp-frio)",
  morno: "var(--temp-morno)",
  quente: "var(--temp-quente)",
  muito_quente: "var(--temp-muito-quente)",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [followUps, setFollowUps] = useState<Lead[] | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api.listLeads(accessToken).then(setLeads).catch(() => setLeads([]));
    api.getFollowUps(accessToken).then(setFollowUps).catch(() => setFollowUps([]));
    api.getUsage(accessToken).then(setUsage).catch(() => setUsage(null));
  }, [accessToken]);

  if (isLoading || !user) return null;

  const temperatureCounts = { frio: 0, morno: 0, quente: 0, muitoQuente: 0 };
  leads?.forEach((lead) => {
    const temp = lead.company.analysis?.leadTemperature;
    if (temp === "frio") temperatureCounts.frio++;
    else if (temp === "morno") temperatureCounts.morno++;
    else if (temp === "quente") temperatureCounts.quente++;
    else if (temp === "muito_quente") temperatureCounts.muitoQuente++;
  });

  const recentLeads = leads?.slice(0, 5) ?? [];

  return (
    <DashboardShell>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Olá, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Bem-vindo de volta. Aqui está o resumo da tua atividade comercial.
          </p>
        </div>
        <Link
          href="/search"
          className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Nova Pesquisa
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Total de leads */}
        <div className="glass-panel col-span-2 rounded-3xl p-6">
          <p className="text-sm text-[var(--text-muted)]">Total de Leads Guardados</p>
          <p className="font-display mt-1 text-4xl font-bold tabular-nums">{leads?.length ?? "—"}</p>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {(["frio", "morno", "quente", "muito_quente"] as const).map((temp) => {
              const key = temp === "muito_quente" ? "muitoQuente" : temp;
              const count = temperatureCounts[key as keyof typeof temperatureCounts];
              return (
                <div key={temp} className="rounded-2xl border border-[var(--panel-border)] bg-white/5 p-4">
                  <span
                    className="mb-2 block h-2 w-2 rounded-full"
                    style={{ backgroundColor: TEMPERATURE_COLORS[temp] }}
                  />
                  <p className="text-lg font-semibold tabular-nums">{count}</p>
                  <p className="text-xs text-[var(--text-muted)]">{TEMPERATURE_LABELS[temp]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Uso do plano */}
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Uso do Plano</p>
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
              {user.plan}
            </span>
          </div>
          {usage ? (
            <div className="space-y-4">
              <UsageBar label="Pesquisas" used={usage.searches.used} limit={usage.searches.limit} />
              <UsageBar label="Análises" used={usage.analyses.used} limit={usage.analyses.limit} />
              <UsageBar label="Gerações de IA" used={usage.aiGenerations.used} limit={usage.aiGenerations.limit} />
              {user.plan !== "PRO" && (
                <Link
                  href="/plan"
                  className="block rounded-xl border border-[var(--panel-border)] py-2 text-center text-xs font-medium text-[var(--accent)] hover:bg-white/5"
                >
                  Fazer Upgrade
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">A carregar...</p>
          )}
        </div>

        {/* Temperatura dos leads (elemento de assinatura) */}
        <div className="glass-panel flex flex-col items-center rounded-3xl p-6 text-center">
          <p className="mb-4 self-start text-sm text-[var(--text-muted)]">Temperatura dos Leads</p>
          <TemperatureDonut
            frio={temperatureCounts.frio}
            morno={temperatureCounts.morno}
            quente={temperatureCounts.quente}
            muitoQuente={temperatureCounts.muitoQuente}
          />
        </div>

        {/* Leads recentes */}
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Leads Recentes</p>
            <Link href="/leads" className="flex items-center gap-1 text-xs text-[var(--accent)]">
              Ver todos <ArrowUpRight size={12} />
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <EmptyState text="Ainda não guardaste nenhum lead. Faz uma pesquisa para começar." />
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold">
                    {lead.company.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lead.company.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{lead.company.category}</p>
                  </div>
                  {lead.company.analysis && (
                    <span className="tabular-nums text-sm font-semibold">{lead.company.analysis.salesScore}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Follow-ups pendentes */}
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Follow-ups Pendentes</p>
            <Clock size={14} className="text-[var(--text-muted)]" />
          </div>

          {followUps === null ? (
            <p className="text-sm text-[var(--text-muted)]">A carregar...</p>
          ) : followUps.length === 0 ? (
            <EmptyState text="Sem follow-ups em atraso. Bom trabalho." />
          ) : (
            <div className="space-y-3">
              {followUps.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{lead.company.name}</span>
                  <span className="flex-shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-xs text-[var(--text-muted)]">
                    7+ dias
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-4 text-sm text-[var(--text-muted)]">{text}</p>;
}
