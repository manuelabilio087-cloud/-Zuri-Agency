import { LeadTemperature } from "@/lib/api";

const CONFIG: Record<LeadTemperature, { label: string; color: string }> = {
  frio: { label: "Frio", color: "var(--temp-frio)" },
  morno: { label: "Morno", color: "var(--temp-morno)" },
  quente: { label: "Quente", color: "var(--temp-quente)" },
  muito_quente: { label: "Muito Quente", color: "var(--temp-muito-quente)" },
};

export function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  const config = CONFIG[temperature];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `${config.color}22`, color: config.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
