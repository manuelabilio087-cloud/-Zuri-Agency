"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Search, Users, Flame, Download, CreditCard, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/search", label: "Pesquisar", icon: Search },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/priorities", label: "Priorização", icon: Flame, badge: "PRO" },
  { href: "/leads/export", label: "Exportar", icon: Download },
  { href: "/plan", label: "Plano", icon: CreditCard },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuth();

  async function handleLogout() {
    await api.logout().catch(() => {});
    clearSession();
    router.push("/login");
  }

  return (
    <div className="bg-ambient min-h-screen text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-[1400px] gap-5 p-5">
        {/* Sidebar */}
        <aside className="glass-panel flex h-[calc(100vh-2.5rem)] w-60 flex-shrink-0 flex-col rounded-3xl p-5">
          <div className="mb-8 flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] font-display text-sm font-bold text-white">
              Z
            </div>
            <span className="font-display text-lg font-semibold">Zuri Agency</span>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] text-white"
                      : "text-[var(--text-muted)] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} strokeWidth={2} />
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-white/5 p-3">
              <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-display text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">Plano {user.plan}</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                aria-label="Sair"
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
