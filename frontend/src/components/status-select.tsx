"use client";

import { LeadStatus } from "@/lib/api";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NOVO", label: "Novo" },
  { value: "CONTACTADO", label: "Contactado" },
  { value: "EM_NEGOCIACAO", label: "Em Negociação" },
  { value: "FECHADO", label: "Fechado" },
  { value: "PERDIDO", label: "Perdido" },
];

interface StatusSelectProps {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as LeadStatus)}
      className="rounded-lg border border-[var(--panel-border)] bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[var(--bg-deep-2)]">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
