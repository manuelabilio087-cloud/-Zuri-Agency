import { LeadTemperature } from "@/lib/api";

const CONFIG: Record<LeadTemperature, { label: string; color: string }> = {
  frio: { label: "Frio", color: "var(--temp-frio)" },
  morno: { label: "Morno", color: "var(--temp-morno)" },
  quente: { label: "Quente", color: "var(--temp-quente)" },
  muito_quente: { label: "Muito quente", color: "var(--temp-muito-quente)" },
};

export function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  const config = CONFIG[temperature];
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
      // `${var}22` não é CSS válido — color-mix dá o fundo translúcido a partir da variável.
      style={{ backgroundColor: `color-mix(in srgb, ${config.color} 14%, transparent)`, color: config.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
