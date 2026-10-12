"use client";

/* eslint-disable @next/next/no-img-element -- as fotos vêm do Vercel Blob e mostram-se tal como estão */
import { DragEvent, ReactNode, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import type { SitePhotoKind } from "@/lib/api";
import { uploadErrorText, uploadSitePhotoFile } from "@/components/photo-field";

// Várias fotos de uma vez (galeria, fotos do topo). Cada foto enviada é acrescentada
// logo que chega, por isso o que se escreve entretanto não se perde.
export function PhotoGrid({
  urls,
  max,
  kind,
  accessToken,
  onAdd,
  onRemove,
  onMove,
  renderBelow,
  addLabel = "Adicionar fotos",
}: {
  urls: string[];
  max: number;
  kind: SitePhotoKind;
  accessToken: string | null;
  onAdd: (url: string) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  // Campo extra por baixo de cada foto (ex: legenda).
  renderBelow?: (index: number) => ReactNode;
  addLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const free = max - urls.length;

  async function handleFiles(list: FileList | null | undefined) {
    if (!list || !accessToken || busy) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || f.type === "");
    if (files.length === 0) return;
    const take = files.slice(0, Math.max(0, free));
    setError(files.length > take.length ? `Só cabem mais ${Math.max(0, free)} foto(s) aqui.` : null);
    let failed = 0;
    let lastError = "";
    for (let i = 0; i < take.length; i++) {
      try {
        const prefix = take.length > 1 ? `${i + 1} de ${take.length} · ` : "";
        const url = await uploadSitePhotoFile(take[i], kind, accessToken, (t) => setBusy(prefix + t));
        onAdd(url);
      } catch (err) {
        failed++;
        lastError = uploadErrorText(err);
      }
    }
    setBusy(null);
    if (failed) setError(failed === 1 ? lastError : `${failed} fotos não foram enviadas. ${lastError}`);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void handleFiles(e.dataTransfer.files);
  }

  const withExtra = Boolean(renderBelow);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <div
        className={`grid gap-2 ${withExtra ? "grid-cols-2" : "grid-cols-3"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="min-w-0">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white/5">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 top-0 flex justify-between bg-gradient-to-b from-black/60 to-transparent p-1">
                <div className="flex">
                  {urls.length > 1 && (
                    <>
                      <TinyButton label="Mover para trás" disabled={i === 0} onClick={() => onMove(i, i - 1)}>
                        <ArrowLeft size={12} />
                      </TinyButton>
                      <TinyButton label="Mover para a frente" disabled={i === urls.length - 1} onClick={() => onMove(i, i + 1)}>
                        <ArrowRight size={12} />
                      </TinyButton>
                    </>
                  )}
                </div>
                <TinyButton label="Remover foto" onClick={() => onRemove(i)}>
                  <X size={12} />
                </TinyButton>
              </div>
            </div>
            {renderBelow && <div className="mt-1.5">{renderBelow(i)}</div>}
          </div>
        ))}
        {free > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={Boolean(busy)}
            className={`flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-2 text-center transition ${
              dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-white/20 bg-white/[0.03] hover:border-white/35"
            }`}
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
                <span className="text-[11px] leading-tight">{busy}</span>
              </>
            ) : (
              <>
                <ImagePlus size={18} className="text-[var(--accent)]" />
                <span className="text-xs font-medium leading-tight">{addLabel}</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {urls.length}/{max}
                </span>
              </>
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-[var(--temp-muito-quente)]">{error}</p>}
    </div>
  );
}

function TinyButton({
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
      className="grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white hover:bg-black/70 disabled:opacity-0"
    >
      {children}
    </button>
  );
}
