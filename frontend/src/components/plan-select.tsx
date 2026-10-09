"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Plan } from "@/lib/api";

const PLAN_OPTIONS: { value: Plan; label: string }[] = [
  { value: "FREE", label: "Free" },
  { value: "STARTER", label: "Starter" },
  { value: "PRO", label: "Pro" },
];

interface PlanSelectProps {
  value: Plan;
  onChange: (plan: Plan) => Promise<void>;
}

// Selector de plano para o painel admin: guarda logo ao mudar e mostra o estado.
export function PlanSelect({ value, onChange }: PlanSelectProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleChange(next: Plan) {
    if (next === value) return;
    setState("saving");
    try {
      await onChange(next);
      setState("saved");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={state === "saving"}
        onChange={(e) => handleChange(e.target.value as Plan)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Plano"
        className="rounded-lg border border-[var(--panel-border)] bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
      >
        {PLAN_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[var(--bg-deep-2)]">
            {opt.label}
          </option>
        ))}
      </select>
      <span className="flex w-4 justify-center" aria-live="polite">
        {state === "saving" && <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />}
        {state === "saved" && <Check size={14} className="text-emerald-400" />}
        {state === "error" && <span className="text-xs text-[var(--temp-muito-quente)]">!</span>}
      </span>
    </div>
  );
}
