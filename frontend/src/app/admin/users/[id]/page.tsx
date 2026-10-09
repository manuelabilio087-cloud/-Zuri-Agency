"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Gauge, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, AdminUserDetail, ApiError, Plan } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlanSelect } from "@/components/plan-select";
import { Restricted } from "@/components/restricted";

const STATUS_LABELS: Record<string, string> = {
  NOVO: "Novo",
  CONTACTADO: "Contactado",
  EM_NEGOCIACAO: "Em negociação",
  FECHADO: "Fechado",
  PERDIDO: "Perdido",
};

export default function AdminUserDetailPage() {
  // useParams funciona em Next 14 e 15 (em Next 14 `params` não é uma Promise).
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .adminGetUserDetail(accessToken, id)
      .then(setDetail)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      });
  }, [accessToken, id]);

  async function handlePlanChange(plan: Plan) {
    if (!accessToken) return;
    const updated = await api.adminUpdateUser(accessToken, id, { plan });
    setDetail((prev) => (prev ? { ...prev, plan: updated.plan } : prev));
  }

  async function handleToggleAdmin() {
    if (!accessToken || !detail) return;
    setRoleSaving(true);
    setRoleError(null);
    try {
      const role = detail.role === "ADMIN" ? "USER" : "ADMIN";
      const updated = await api.adminUpdateUser(accessToken, id, { role });
      setDetail((prev) => (prev ? { ...prev, role: updated.role } : prev));
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.message : "Não foi possível alterar o acesso.");
    } finally {
      setRoleSaving(false);
    }
  }

  if (isLoading || !user) return null;

  if (forbidden) {
    return (
      <DashboardShell>
        <Restricted />
      </DashboardShell>
    );
  }

  const isSelf = detail?.id === user.id;

  return (
    <DashboardShell>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-white">
        <ArrowLeft size={14} /> Utilizadores
      </Link>

      {!detail ? (
        <p className="text-sm text-[var(--text-muted)]">A carregar…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
          <div className="space-y-4 lg:col-span-2 lg:space-y-5">
            <div className="glass-panel rounded-3xl p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-display text-lg font-semibold text-white">
                  {detail.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display flex flex-wrap items-center gap-2 text-xl font-bold sm:text-2xl">
                    <span className="truncate">{detail.name}</span>
                    {detail.role === "ADMIN" && (
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                        ADMIN
                      </span>
                    )}
                  </h1>
                  <p className="truncate text-sm text-[var(--text-muted)]">{detail.email}</p>
                </div>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="O que vende" value={detail.serviceType ?? "—"} />
                <Info label="Cidade" value={detail.city ?? "—"} />
                <Info label="Registado em" value={new Date(detail.createdAt).toLocaleDateString("pt-PT")} />
                <Info label="Acesso" value={detail.role === "ADMIN" ? "Administrador" : "Cliente"} />
              </dl>
            </div>

            <div className="glass-panel rounded-3xl p-5 sm:p-6">
              <p className="mb-4 text-sm text-[var(--text-muted)]">Leads recentes</p>
              {detail.leads.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Ainda não guardou nenhum lead.</p>
              ) : (
                <div className="divide-y divide-[var(--panel-border)]">
                  {detail.leads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="truncate">{lead.company.name}</span>
                      <span className="flex-shrink-0 rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:space-y-5">
            {/* Gestão da conta */}
            <div className="glass-panel rounded-3xl p-5">
              <p className="mb-3 text-sm text-[var(--text-muted)]">Plano</p>
              <PlanSelect value={detail.plan} onChange={handlePlanChange} />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Usa isto para ativar o plano de um cliente depois de confirmares o pagamento.
              </p>

              <div className="mt-5 border-t border-[var(--panel-border)] pt-4">
                <p className="mb-3 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                  <ShieldCheck size={14} /> Acesso de administrador
                </p>
                <button
                  onClick={handleToggleAdmin}
                  disabled={roleSaving || (isSelf && detail.role === "ADMIN")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] py-2.5 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {roleSaving && <Loader2 size={14} className="animate-spin" />}
                  {detail.role === "ADMIN" ? "Remover admin" : "Tornar admin"}
                </button>
                {isSelf && detail.role === "ADMIN" && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">Não podes remover o teu próprio acesso.</p>
                )}
                {roleError && <p className="mt-2 text-xs text-[var(--temp-muito-quente)]">{roleError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-5">
              <UsageTile icon={Search} label="Pesquisas" value={detail.usageTotals.searches} />
              <UsageTile icon={Gauge} label="Análises" value={detail.usageTotals.analyses} />
              <UsageTile icon={Sparkles} label="Gerações IA" value={detail.usageTotals.aiGenerations} />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}

function UsageTile({ icon: Icon, label, value }: { icon: typeof Search; label: string; value: number }) {
  return (
    <div className="glass-panel rounded-3xl p-4 lg:p-5">
      <div className="mb-3 hidden h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] lg:flex">
        <Icon size={16} />
      </div>
      <p className="font-display text-xl font-bold tabular-nums lg:text-2xl">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label} (total)</p>
    </div>
  );
}
