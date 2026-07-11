"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, clearSession } = useAuth();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  if (!user) return null;

  async function handleLogout() {
    await api.logout();
    clearSession();
    router.push("/login");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {user.name}</h1>
          <p className="text-sm text-slate-500">Plano atual: {user.plan}</p>
        </div>
        <button onClick={handleLogout} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          Sair
        </button>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Aqui entra o fluxo de pesquisa de empresas, scores e CRM (próxima fase de desenvolvimento).
      </div>
    </main>
  );
}
