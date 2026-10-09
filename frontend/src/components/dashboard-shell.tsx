"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Search,
  Users,
  Flame,
  Download,
  CreditCard,
  Settings,
  ShieldCheck,
  UserCog,
  LogOut,
  MoreHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Logo } from "@/components/logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// Principais: aparecem na barra inferior do telemóvel.
const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutGrid },
  { href: "/search", label: "Pesquisar", icon: Search },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/priorities", label: "Prioridades", icon: Flame, badge: "PRO" },
];

const ACCOUNT: NavItem[] = [
  { href: "/leads/export", label: "Exportar", icon: Download },
  { href: "/plan", label: "Plano", icon: CreditCard },
  { href: "/settings", label: "Definições", icon: Settings },
];

const ADMIN: NavItem[] = [
  { href: "/admin", label: "Painel admin", icon: ShieldCheck },
  { href: "/admin/users", label: "Utilizadores", icon: UserCog },
];

// Escolhe o item ativo pelo prefixo mais longo, para que /leads/123 ative "Leads"
// mas /leads/export ative "Exportar".
function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const groups: NavGroup[] = [
    { title: "Prospeção", items: PRIMARY },
    { title: "Conta", items: ACCOUNT },
    ...(isAdmin ? [{ title: "Administração", items: ADMIN }] : []),
  ];
  const allItems = groups.flatMap((g) => g.items);
  const current = activeHref(pathname, allItems);
  const secondaryActive = current !== null && !PRIMARY.some((item) => item.href === current);

  // Fecha a folha "Mais" ao mudar de página.
  useEffect(() => setMoreOpen(false), [pathname]);

  async function handleLogout() {
    await api.logout().catch(() => {});
    clearSession();
    router.push("/login");
  }

  return (
    <div className="bg-ambient min-h-screen text-[var(--text-primary)]">
      {/* Barra superior — telemóvel e tablet */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--panel-border)] bg-[#0f0d14]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" aria-label="Início">
          <Logo size="sm" />
        </Link>
        {user && (
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] font-display text-sm font-semibold text-white"
            aria-label="Definições da conta"
          >
            {user.name.charAt(0).toUpperCase()}
          </Link>
        )}
      </header>

      <div className="mx-auto flex max-w-[1440px] lg:gap-6 lg:p-6">
        {/* Menu lateral — PC */}
        <aside className="glass-panel sticky top-6 hidden h-[calc(100vh-3rem)] w-64 flex-shrink-0 flex-col rounded-3xl p-5 lg:flex">
          <Link href="/dashboard" className="mb-6 px-2" aria-label="Início">
            <Logo />
          </Link>

          <nav className="thin-scroll -mx-1 flex-1 space-y-5 overflow-y-auto px-1">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a79fc2]/70">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SidebarLink key={item.href} item={item} active={current === item.href} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {user && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-white/[0.04] p-3">
              <Link href="/settings" className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-display text-sm font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Plano {user.plan}
                    {isAdmin && " · Admin"}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                aria-label="Sair"
                title="Sair"
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </aside>

        {/* Conteúdo */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-0 lg:pb-6 lg:pt-0">{children}</main>
      </div>

      {/* Barra inferior — telemóvel e tablet */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--panel-border)] bg-[#0f0d14]/90 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegação principal"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY.map((item) => (
            <BottomLink key={item.href} item={item} active={current === item.href} />
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              secondaryActive || moreOpen ? "text-white" : "text-[var(--text-muted)]"
            }`}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={21} strokeWidth={secondaryActive ? 2.4 : 2} />
            Mais
          </button>
        </div>
      </nav>

      {/* Folha "Mais" — telemóvel e tablet */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} aria-label="Fechar" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-[var(--panel-border)] bg-[var(--bg-deep-2)] p-5"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              {user && (
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                </div>
              )}
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-2 text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {groups
                .filter((group) => group.items !== PRIMARY)
                .map((group) => (
                  <div key={group.title}>
                    <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a79fc2]/70">
                      {group.title}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <SidebarLink key={item.href} item={item} active={current === item.href} large />
                      ))}
                    </div>
                  </div>
                ))}

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--temp-muito-quente)] transition-colors hover:bg-white/5"
              >
                <LogOut size={18} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({ item, active, large = false }: { item: NavItem; active: boolean; large?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between rounded-xl px-3 text-sm transition-colors ${
        large ? "py-3" : "py-2"
      } ${active ? "bg-[var(--accent-soft)] font-medium text-white" : "text-[var(--text-muted)] hover:bg-white/5 hover:text-white"}`}
    >
      <span className="flex items-center gap-3">
        <Icon size={large ? 18 : 17} strokeWidth={2} />
        {item.label}
      </span>
      {item.badge && (
        <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
        active ? "text-white" : "text-[var(--text-muted)]"
      }`}
    >
      {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--accent)]" />}
      <Icon size={21} strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}
