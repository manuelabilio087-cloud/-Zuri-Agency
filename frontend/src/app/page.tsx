import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold">Zuri Agency</h1>
      <p className="max-w-md text-slate-600">
        Encontra, avalia e converte empresas locais em clientes, com inteligência artificial.
      </p>
      <div className="flex gap-3">
        <Link href="/register" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Criar conta
        </Link>
        <Link href="/login" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">
          Entrar
        </Link>
      </div>
    </main>
  );
}
