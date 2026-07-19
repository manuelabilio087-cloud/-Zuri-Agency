"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, TrendingUp, Search, Gauge, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, AdminMetrics, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .adminGetMetrics(accessToken)
      .then(setMetrics)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      });
  }, [accessToken]);

  if (isLoading || !user) return null;

  if (forbidden) {
    return (
      <DashboardShell>
        <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-10 text-center">
          <Lock size={28} className="text-[var(--accent)]" />
          <p className="font-medium">Acesso restrito a administradores</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Painel Administrativo</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Visão geral operacional do Zuri Agency.</p>
        </div>
        <Link
          href="/admin/users"
          className="rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Ver Utilizadores
        </Link>
      </div>

      {!metrics ? (
        <p className="text-sm text-[var(--text-muted)]">A carregar...</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-5">
            <StatCard icon={Users} label="Total de Utilizadores" value={metrics.totalUsers} />
            <StatCard icon={TrendingUp} label="MRR" value={`${metrics.mrr} MT`} />
            <StatCard icon={Search} label="Pesquisas (este mês)" value={metrics.usageThisMonth.searches} />
            <StatCard icon={Gauge} label="Análises (este mês)" value={metrics.usageThisMonth.analyses} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <div className="glass-panel rounded-3xl p-6">
              <p className="mb-4 text-sm text-[var(--text-muted)]">Distribuição por Plano</p>
              <div className="space-y-3">
                {(["FREE", "STARTER", "PRO"] as const).map((plan) => {
                  const count = metrics.planDistribution[plan] ?? 0;
                  const percentage = metrics.totalUsers > 0 ? (count / metrics.totalUsers) * 100 : 0;
                  return (
                    <div key={plan}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-[var(--text-muted)]">{plan}</span>
                        <span className="tabular-nums font-medium">{count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <p className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <Sparkles size={14} /> Gerações de IA (este mês)
              </p>
              <p className="font-display text-4xl font-bold tabular-nums">{metrics.usageThisMonth.aiGenerations}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">scripts, emails, WhatsApp e propostas gerados</p>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-3xl p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={16} />
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
