"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Search, Gauge, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, AdminUserDetail, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [forbidden, setForbidden] = useState(false);

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
      <Link href="/admin/users" className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-white">
        <ArrowLeft size={14} /> Voltar aos utilizadores
      </Link>

      {!detail ? (
        <p className="text-sm text-[var(--text-muted)]">A carregar...</p>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">
            <div className="glass-panel rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold">{detail.name}</h1>
                  <p className="text-sm text-[var(--text-muted)]">{detail.email}</p>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                  {detail.plan}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--text-muted)]">
                <p>Vende: {detail.serviceType ?? "—"}</p>
                <p>Cidade: {detail.city ?? "—"}</p>
                <p>Registado em: {new Date(detail.createdAt).toLocaleDateString("pt-PT")}</p>
                <p>Role: {detail.role}</p>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6">
              <p className="mb-4 text-sm text-[var(--text-muted)]">Leads recentes</p>
              {detail.leads.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Ainda não guardou nenhum lead.</p>
              ) : (
                <div className="space-y-2">
                  {detail.leads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between text-sm">
                      <span>{lead.company.name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{lead.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <UsageTile icon={Search} label="Pesquisas (total)" value={detail.usageTotals.searches} />
            <UsageTile icon={Gauge} label="Análises (total)" value={detail.usageTotals.analyses} />
            <UsageTile icon={Sparkles} label="Gerações de IA (total)" value={detail.usageTotals.aiGenerations} />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function UsageTile({ icon: Icon, label, value }: { icon: typeof Search; label: string; value: number }) {
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
