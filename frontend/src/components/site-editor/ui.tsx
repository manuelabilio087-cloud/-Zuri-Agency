"use client";

import { ReactNode, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Plus, X } from "lucide-react";

// Peças de formulário partilhadas pelo editor de sites.

export function Section({
  title,
  hint,
  status,
  defaultOpen = false,
  onOpen,
  children,
}: {
  title: string;
  hint?: string;
  // Linha por baixo do título quando a secção está fechada (ex: "3 pratos · no site").
  status?: { text: string; shown: boolean };
  defaultOpen?: boolean;
  // Chamado ao abrir (a pré-visualização salta para essa parte do site).
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-panel rounded-3xl">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) onOpen?.();
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          {status && (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span
                className={`inline-block h-1.5 w-1.5 flex-none rounded-full ${status.shown ? "bg-emerald-400" : "bg-white/25"}`}
                aria-hidden="true"
              />
              <span className="truncate">{status.text}</span>
            </span>
          )}
        </span>
        <ChevronDown size={18} className={`flex-none text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-5 sm:px-5">
          {hint && <p className="-mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-3 text-base text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none sm:py-2.5 sm:text-sm";

export function Input({
  value,
  onChange,
  placeholder,
  max,
  label,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  label?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={max}
      aria-label={label ?? placeholder}
      inputMode={inputMode}
      className={inputClass}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows,
  placeholder,
  max,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
  max?: number;
  label?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      maxLength={max}
      aria-label={label ?? placeholder}
      className={`${inputClass} resize-y`}
    />
  );
}

export function Toggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg py-2 text-sm ${value === opt.value ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 flex-none accent-[var(--accent)]"
      />
      {children}
    </label>
  );
}

// Cartão de um item numa lista (prato, membro da equipa, plano…), com mover e remover.
export function ItemCard({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-[var(--text-muted)]">{title}</span>
        <div className="flex flex-none items-center">
          {count > 1 && (
            <>
              <IconButton label="Mover para cima" disabled={index === 0} onClick={() => onMove(index, index - 1)}>
                <ArrowUp size={14} />
              </IconButton>
              <IconButton label="Mover para baixo" disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
                <ArrowDown size={14} />
              </IconButton>
            </>
          )}
          <IconButton label="Remover" onClick={onRemove}>
            <X size={14} />
          </IconButton>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 py-1 text-sm text-[var(--accent)]">
      <Plus size={14} /> {children}
    </button>
  );
}

// Etiquetas rápidas para adicionar com um toque.
export function Suggestions({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className="rounded-full border border-dashed border-white/20 px-2.5 py-1 text-xs text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-white"
        >
          + {s}
        </button>
      ))}
    </div>
  );
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = list.slice();
  const [it] = copy.splice(from, 1);
  copy.splice(to, 0, it);
  return copy;
}

export function count(n: number, unit: [string, string] | undefined): string {
  const [one, many] = unit ?? ["item", "itens"];
  return `${n} ${n === 1 ? one : many}`;
}
