"use client";

interface TemperatureDonutProps {
  frio: number;
  morno: number;
  quente: number;
  muitoQuente: number;
}

const SEGMENTS = [
  { key: "frio", label: "Frio", color: "var(--temp-frio)" },
  { key: "morno", label: "Morno", color: "var(--temp-morno)" },
  { key: "quente", label: "Quente", color: "var(--temp-quente)" },
  { key: "muitoQuente", label: "Muito Quente", color: "var(--temp-muito-quente)" },
] as const;

const RADIUS = 70;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TemperatureDonut({ frio, morno, quente, muitoQuente }: TemperatureDonutProps) {
  const values = { frio, morno, quente, muitoQuente };
  const total = frio + morno + quente + muitoQuente;

  let offsetAcc = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[168px] w-[168px] flex-shrink-0">
        <svg viewBox="0 0 168 168" className="h-full w-full -rotate-90">
          <circle cx="84" cy="84" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={STROKE} />
          {total > 0 &&
            SEGMENTS.map((seg) => {
              const value = values[seg.key];
              if (value === 0) return null;
              const fraction = value / total;
              const dash = fraction * CIRCUMFERENCE;
              const gap = CIRCUMFERENCE - dash;
              const dashoffset = -offsetAcc;
              offsetAcc += dash;
              return (
                <circle
                  key={seg.key}
                  cx="84"
                  cy="84"
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold tabular-nums">{total}</span>
          <span className="text-[11px] text-[var(--text-muted)]">leads ativos</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[var(--text-muted)]">{seg.label}</span>
            <span className="ml-auto tabular-nums font-medium">{values[seg.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
