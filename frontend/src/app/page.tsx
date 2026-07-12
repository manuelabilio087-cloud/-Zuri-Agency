import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-ambient flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center text-[var(--text-primary)]">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] font-display text-base font-bold text-white">
          Z
        </div>
        <span className="font-display text-2xl font-semibold">Zuri Agency</span>
      </div>
      <p className="max-w-md text-[var(--text-muted)]">
        Encontra, avalia e converte empresas locais em clientes, com inteligência artificial.
      </p>
      <div className="flex gap-3">
        <Link href="/register" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
          Criar conta
        </Link>
        <Link href="/login" className="glass-panel rounded-full px-5 py-2.5 text-sm font-medium">
          Entrar
        </Link>
      </div>
    </main>
  );
}
