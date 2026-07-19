"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, AdminUserSummary, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [users, setUsers] = useState<AdminUserSummary[] | null>(null);
  const [forbidden, setForbidden] = useState(false);

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
      <Link href="/admin" className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-white">
        <ArrowLeft size={14} /> Voltar ao painel
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Utilizadores</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{users?.length ?? 0} utilizadores registados.</p>
      </div>

      <div className="glass-panel rounded-3xl p-2">
        {users === null ? (
          <p className="p-6 text-sm text-[var(--text-muted)]">A carregar...</p>
        ) : (
          <div className="divide-y divide-[var(--panel-border)]">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-white/5"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-semibold">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium">
                    {u.name}
                    <ArrowUpRight size={13} className="text-[var(--text-muted)]" />
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{u.email}</p>
                </div>
                {u.role === "ADMIN" && (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                    ADMIN
                  </span>
                )}
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--text-muted)]">{u.plan}</span>
                <span className="hidden w-20 text-right text-xs text-[var(--text-muted)] sm:block">
                  {u._count.leads} leads
                </span>
                <span className="hidden w-24 text-right text-xs text-[var(--text-muted)] md:block">
                  {new Date(u.createdAt).toLocaleDateString("pt-PT")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
