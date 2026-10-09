"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, AdminUserSummary, ApiError, Plan } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { PlanSelect } from "@/components/plan-select";
import { Restricted } from "@/components/restricted";

const PLAN_FILTERS: { value: Plan | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "FREE", label: "Free" },
  { value: "STARTER", label: "Starter" },
  { value: "PRO", label: "Pro" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<Plan | "ALL">("ALL");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .adminListUsers(accessToken)
      .then(setUsers)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      });
  }, [accessToken]);

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (planFilter === "ALL" || u.plan === planFilter) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, query, planFilter]);

  async function handlePlanChange(userId: string, plan: Plan) {
    if (!accessToken) return;
    const updated = await api.adminUpdateUser(accessToken, userId, { plan });
    setUsers((prev) => prev?.map((u) => (u.id === userId ? { ...u, plan: updated.plan } : u)) ?? prev);
  }

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
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-white">
        <ArrowLeft size={14} /> Painel admin
      </Link>

      <PageHeader
        title="Utilizadores"
        description={`${users?.length ?? 0} registados. Muda o plano de um cliente diretamente na lista.`}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar por nome ou email"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 py-3 pl-9 pr-3 text-base text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none sm:py-2.5 sm:text-sm"
          />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {PLAN_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setPlanFilter(f.value)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                planFilter === f.value ? "bg-[var(--accent)] text-white" : "glass-panel text-[var(--text-muted)] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-1 sm:p-2">
        {filtered === null ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">A carregar…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">Nenhum utilizador encontrado.</p>
        ) : (
          <>
            {/* Cabeçalho da tabela — só no PC */}
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_80px_110px_24px] gap-4 px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a79fc2]/70 md:grid">
              <span>Utilizador</span>
              <span>Plano</span>
              <span className="text-right">Leads</span>
              <span className="text-right">Registo</span>
              <span />
            </div>
            <div className="divide-y divide-[var(--panel-border)]">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 p-4 md:grid md:grid-cols-[minmax(0,1fr)_120px_80px_110px_24px] md:items-center md:gap-4"
                >
                  <Link href={`/admin/users/${u.id}`} className="group flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium group-hover:underline">
                        <span className="truncate">{u.name}</span>
                        {u.role === "ADMIN" && (
                          <span className="flex-shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                            ADMIN
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{u.email}</p>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between gap-3 pl-[52px] md:contents">
                    <PlanSelect value={u.plan} onChange={(plan) => handlePlanChange(u.id, plan)} />
                    <span className="text-xs text-[var(--text-muted)] md:text-right md:text-sm md:tabular-nums">
                      {u._count.leads}
                      <span className="md:hidden"> leads</span>
                    </span>
                    <span className="hidden text-right text-xs text-[var(--text-muted)] md:block">
                      {new Date(u.createdAt).toLocaleDateString("pt-PT")}
                    </span>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="hidden text-[var(--text-muted)] hover:text-white md:block"
                      aria-label={`Ver ${u.name}`}
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
