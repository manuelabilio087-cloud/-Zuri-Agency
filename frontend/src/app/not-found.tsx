import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="bg-ambient flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center text-[var(--text-primary)]">
      <div className="glass-panel flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--accent)]">
        <SearchX size={24} />
      </div>
      <h1 className="font-display text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">
        O link que seguiste não existe ou foi movido. Volta ao dashboard para continuar.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Voltar ao Dashboard
      </Link>
    </main>
  );
}
