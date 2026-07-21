interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { text: "text-lg", dot: "0.24em", dotTop: "-0.03em" },
  md: { text: "text-xl", dot: "0.22em", dotTop: "-0.03em" },
  lg: { text: "text-3xl", dot: "0.2em", dotTop: "-0.03em" },
} as const;

// Wordmark "zuri" com o ponto do "i" substituído por um círculo laranja —
// referência visual à "Temperatura do Lead" (frio→muito quente), o conceito
// central do produto. O "i" usa o glifo sem ponto (dotless, U+0131) para o
// círculo não colidir com o ponto nativo da fonte.
export function Logo({ size = "md", className = "" }: LogoProps) {
  const { text, dot, dotTop } = SIZE_MAP[size];

  return (
    <span className={`font-display inline-flex items-baseline font-bold ${text} ${className}`}>
      zur
      <span className="relative inline-block" aria-hidden="true">
        ı
        <span
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[var(--temp-quente)]"
          style={{ width: dot, height: dot, top: dotTop, boxShadow: "0 0 8px var(--temp-quente)" }}
        />
      </span>
      <span className="sr-only">i</span>
    </span>
  );
}
