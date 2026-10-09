"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, TrendingUp, Search, Gauge, Sparkles, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, AdminMetrics, AdminUserSummary, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { Restricted } from "@/components/restricted";

const PLAN_LABELS = { FREE: "Free", STARTER: "Starter", PRO: "Pro" } as const;

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUserSummary[] | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    const onError = (err: unknown) => {
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
    };
    api.adminGetMetrics(accessToken).then(setMetrics).catch(onError);
    api
      .adminListUsers(accessToken)
      .then((users) => setRecentUsers(users.slice(0, 6)))
      .catch(onError);
  }, [accessToken]);

  if (isLoading || !user) return null;

  if (forbidden) {
    return (
      <DashboardShell>
        <Restricted />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Painel administrativo"
        description="Visão geral do Zuri Agency este mês."
        actions={
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Users size={16} />
            Gerir utilizadores
          </Link>
        }
      />

      {!metrics ? (
        <p className="text-sm text-[var(--text-muted)]">A carregar…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            <StatCard icon={Users} label="Utilizadores" value={metrics.totalUsers} />
            <StatCard icon={TrendingUp} label="MRR" value={`${metrics.mrr.toLocaleString("pt-PT")} MT`} />
            <StatCard icon={Search} label="Pesquisas" value={metrics.usageThisMonth.searches} />
            <StatCard icon={Gauge} label="Análises" value={metrics.usageThisMonth.analyses} />
          </div>

          <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-3 lg:gap-5">
            <div className="glass-panel rounded-3xl p-5 sm:p-6">
              <p className="mb-4 text-sm text-[var(--text-muted)]">Distribuição por plano</p>
              <div className="space-y-3">
                {(["FREE", "STARTER", "PRO"] as const).map((plan) => {
                  const count = metrics.planDistribution[plan] ?? 0;
                  const percentage = metrics.totalUsers > 0 ? (count / metrics.totalUsers) * 100 : 0;
                  return (
                    <div key={plan}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-[var(--text-muted)]">{PLAN_LABELS[plan]}</span>
                        <span className="tabular-nums font-medium">{count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                <span className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                  <Sparkles size={14} /> Gerações de IA
                </span>
                <span className="font-display text-lg font-bold tabular-nums">
                  {metrics.usageThisMonth.aiGenerations}
                </span>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 sm:p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[var(--text-muted)]">Registos recentes</p>
                <Link href="/admin/users" className="flex items-center gap-1 text-xs text-[var(--accent)]">
                  Ver todos <ArrowUpRight size={12} />
                </Link>
              </div>
              {recentUsers === null ? (
                <p className="text-sm text-[var(--text-muted)]">A carregar…</p>
              ) : recentUsers.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Ainda não há utilizadores.</p>
              ) : (
                <div className="space-y-1">
                  {recentUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/admin/users/${u.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-semibold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{u.email}</p>
                      </div>
                      <span className="flex-shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--text-muted)]">
                        {PLAN_LABELS[u.plan]}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={16} />
      </div>
      <p className="font-display truncate text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
