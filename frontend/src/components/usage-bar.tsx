interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
}

export function UsageBar({ label, used, limit }: UsageBarProps) {
  const isUnlimited = !Number.isFinite(limit);
  const percentage = isUnlimited ? 100 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const nearLimit = !isUnlimited && percentage >= 85;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="tabular-nums font-medium">
          {used}
          <span className="text-[var(--text-muted)]"> / {isUnlimited ? "∞" : limit}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            backgroundColor: nearLimit ? "var(--temp-muito-quente)" : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
