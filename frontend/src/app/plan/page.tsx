"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Plan } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";

interface PlanTier {
  id: Plan;
  name: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const TIERS: PlanTier[] = [
  {
    id: "FREE",
    name: "Free",
    price: "0 MT",
    priceSuffix: "/mês",
    description: "Para experimentar a plataforma.",
    features: [
      "10 pesquisas por mês",
      "5 análises de maturidade digital",
      "Sales Score e Lead Temperature",
      "Sem geração de conteúdo por IA",
      "Sem CRM nem exportação",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    price: "499 MT",
    priceSuffix: "/mês",
    description: "Para quem já está a prospetar a sério.",
    features: [
      "100 pesquisas por mês",
      "50 análises de maturidade digital",
      "30 gerações de conteúdo por IA",
      "CRM completo (status, notas, follow-ups)",
      "Exportação para Excel",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "999 MT",
    priceSuffix: "/mês",
    description: "Para agências com volume de leads a sério.",
    highlighted: true,
    features: [
      "Pesquisas e análises ilimitadas",
      "Gerações de IA ilimitadas",
      "CRM completo + Priorização Diária por IA",
      "Exportação para Excel e PDF",
      "Propostas comerciais em PDF",
    ],
  },
];

export default function PlanPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  function handleUpgradeClick(planId: Plan) {
    setPendingPlan(planId);
  }

  return (
    <DashboardShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold">Plano</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Escolhe o plano certo para o volume de leads que precisas de gerir.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {TIERS.map((tier) => {
          const isCurrent = user.plan === tier.id;
          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-3xl p-6 ${
                tier.highlighted
                  ? "glass-panel border-[var(--accent)]/50 shadow-[0_0_40px_-12px_var(--accent)]"
                  : "glass-panel"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-white">
                  <Sparkles size={11} /> Recomendado
                </span>
              )}

              <p className="font-display text-lg font-semibold">{tier.name}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{tier.description}</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold tabular-nums">{tier.price}</span>
                <span className="text-sm text-[var(--text-muted)]">{tier.priceSuffix}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                    <Check size={15} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-xl border border-[var(--panel-border)] py-2.5 text-center text-sm font-medium text-[var(--text-muted)]">
                    Plano Atual
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgradeClick(tier.id)}
                    className={`w-full rounded-xl py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${
                      tier.highlighted
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--panel-border)] hover:bg-white/5"
                    }`}
                  >
                    {tier.id === "FREE" ? "Voltar ao Free" : "Fazer Upgrade"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pendingPlan && (
        <div className="glass-panel mt-6 rounded-2xl p-5 text-sm">
          <p className="font-medium">Pagamentos chegam em breve 🚧</p>
          <p className="mt-1 text-[var(--text-muted)]">
            Estamos a finalizar a integração de pagamento (M-Pesa, e-Mola e cartão). Assim que estiver pronta, vais
            conseguir fazer upgrade para <strong>{TIERS.find((t) => t.id === pendingPlan)?.name}</strong> diretamente
            aqui.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
