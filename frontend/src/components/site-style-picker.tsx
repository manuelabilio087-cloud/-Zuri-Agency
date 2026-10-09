"use client";

import { Check } from "lucide-react";
import type { SiteStyle } from "@/lib/api";

export const SITE_STYLES: Array<{ value: SiteStyle; label: string; description: string; examples: string }> = [
  {
    value: "elegante",
    label: "Elegante",
    description: "Letra com serifa, dourado e linhas finas. Calmo e sofisticado.",
    examples: "Clínicas, salões, restaurantes, advogados",
  },
  {
    value: "moderno",
    label: "Moderno",
    description: "Limpo e confiante, cantos arredondados e brilhos subtis.",
    examples: "Serviços, oficinas, escolas, imobiliárias",
  },
  {
    value: "vibrante",
    label: "Vibrante",
    description: "Cores fortes, gradientes em movimento e faixa animada.",
    examples: "Ginásios, eventos, lojas, beleza",
  },
];

// Miniatura desenhada só com CSS — dá a ideia do topo do site em cada estilo.
function Thumb({ style, compact }: { style: SiteStyle; compact: boolean }) {
  if (style === "elegante") {
    return (
      <div
        className="relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden"
        style={{ background: "radial-gradient(110% 80% at 50% 0%, #6b5426 0%, #2a2112 55%, #0b0908 100%)" }}
      >
        <div className="absolute inset-1.5 border border-white/20" />
        <span
          className={`${compact ? "text-[13px]" : "text-[22px]"} whitespace-nowrap leading-none text-white`}
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Sorriso <i>&amp;</i> Co.
        </span>
        <span className="h-px w-8 bg-[#c9a35c]" />
        <span className={`mt-1 ${compact ? "h-2 w-9" : "h-3 w-14"} bg-[#a1803f]`} />
      </div>
    );
  }
  if (style === "moderno") {
    return (
      <div
        className="relative flex h-full flex-col justify-center gap-1.5 overflow-hidden px-3"
        style={{
          background:
            "radial-gradient(60% 70% at 90% 5%, rgba(37,99,235,.65), transparent 62%), radial-gradient(45% 55% at 0% 100%, rgba(124,58,237,.35), transparent 60%), #080b14",
        }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)",
            backgroundSize: "12px 12px",
          }}
        />
        <span className={`relative ${compact ? "text-[14px]" : "text-[20px]"} font-extrabold leading-none tracking-tight text-white`}>Sorriso</span>
        <span className={`relative h-1.5 ${compact ? "w-12" : "w-20"} rounded-full bg-white/40`} />
        <span className={`relative mt-1 ${compact ? "h-2.5 w-8" : "h-3.5 w-12"} rounded-md bg-[#2563eb]`} />
      </div>
    );
  }
  return (
    <div
      className="relative flex h-full flex-col justify-center gap-1.5 overflow-hidden px-3"
      style={{ background: "linear-gradient(135deg,#7c3aed,#db2777)" }}
    >
      <span className="absolute -left-4 -top-6 h-16 w-16 rounded-full bg-[#f472b6] opacity-70 blur-lg" />
      <span className="absolute -bottom-6 right-0 h-16 w-16 rounded-full bg-[#7c3aed] opacity-80 blur-lg" />
      <span className={`relative ${compact ? "text-[14px]" : "text-[21px]"} font-black leading-none tracking-tight text-white`}>Sorriso!</span>
      <span className={`relative mt-1 ${compact ? "h-2.5 w-9" : "h-3.5 w-14"} rounded-full bg-white`} />
      <span className="absolute bottom-0 left-0 right-0 h-2.5 -rotate-2 bg-[#16112a]" />
    </div>
  );
}

export function SiteStylePicker({
  value,
  onChange,
  compact = false,
}: {
  value: SiteStyle;
  onChange: (style: SiteStyle) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`} role="radiogroup" aria-label="Estilo do site">
      {SITE_STYLES.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`group overflow-hidden rounded-2xl border text-left transition ${
              active
                ? "border-[var(--accent)] ring-2 ring-[#6d4aff66]"
                : "border-[var(--panel-border)] hover:border-white/25"
            }`}
          >
            <div className={`relative ${compact ? "h-[72px]" : "h-24"}`}>
              <Thumb style={option.value} compact={compact} />
              {active && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className={compact ? "px-2 py-1.5" : "p-3"}>
              <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>{option.label}</p>
              {!compact && (
                <>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{option.description}</p>
                  <p className="mt-1.5 text-[11px] text-[var(--text-muted)] opacity-80">{option.examples}</p>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
