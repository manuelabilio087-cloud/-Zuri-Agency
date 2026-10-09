"use client";

/* eslint-disable @next/next/no-img-element -- as fotos vêm do Vercel Blob e mostram-se tal como estão */
import { useRef, useState, DragEvent } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { api, ApiError, SitePhotoKind } from "@/lib/api";
import { compressImage, ImageError } from "@/lib/image";

const SETTINGS: Record<SitePhotoKind, { maxSize: number; quality: number; keepTransparency: boolean }> = {
  capa: { maxSize: 2000, quality: 0.8, keepTransparency: false },
  sobre: { maxSize: 1400, quality: 0.82, keepTransparency: false },
  servico: { maxSize: 1100, quality: 0.82, keepTransparency: false },
  logo: { maxSize: 600, quality: 0.9, keepTransparency: true },
};

type Status = { stage: "idle" } | { stage: "working"; text: string } | { stage: "error"; text: string };

export function PhotoField({
  value,
  onChange,
  kind,
  accessToken,
  emptyLabel = "Carregar foto",
  layout = "box",
}: {
  value: string;
  onChange: (url: string) => void;
  kind: SitePhotoKind;
  accessToken: string | null;
  emptyLabel?: string;
  layout?: "box" | "row";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ stage: "idle" });
  const [dragging, setDragging] = useState(false);
  const busy = status.stage === "working";

  async function handleFile(file: File | undefined) {
    if (!file || !accessToken || busy) return;
    try {
      setStatus({ stage: "working", text: "A otimizar…" });
      const compressed = await compressImage(file, SETTINGS[kind]);
      setStatus({ stage: "working", text: "A enviar…" });
      const url = await api.uploadSitePhoto(accessToken, compressed, kind);
      onChange(url);
      setStatus({ stage: "idle" });
    } catch (err) {
      const text =
        err instanceof ImageError || err instanceof ApiError ? err.message : "Não foi possível enviar a foto. Tenta de novo.";
      setStatus({ stage: "error", text });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/*"
      className="hidden"
      onChange={(e) => void handleFile(e.target.files?.[0])}
    />
  );

  const isLogo = kind === "logo";
  const previewBg = isLogo ? "bg-white" : "bg-white/5";
  const fit = isLogo ? "object-contain p-2" : "object-cover";

  const dropHandlers = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop,
  };

  const errorText = status.stage === "error" && <p className="mt-1.5 text-xs text-[var(--temp-muito-quente)]">{status.text}</p>;

  // Linha compacta (fotos dos serviços)
  if (layout === "row") {
    return (
      <div>
        {picker}
        <div className="flex items-center gap-3" {...dropHandlers}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={`relative grid h-16 w-20 flex-none place-items-center overflow-hidden rounded-xl border ${
              dragging ? "border-[var(--accent)]" : value ? "border-[var(--panel-border)]" : "border-dashed border-white/20"
            } ${previewBg}`}
            aria-label={value ? "Trocar foto" : emptyLabel}
          >
            {value ? (
              <img src={value} alt="" className={`h-full w-full ${fit}`} />
            ) : (
              <ImagePlus size={18} className="text-[var(--text-muted)]" />
            )}
            {busy && (
              <span className="absolute inset-0 grid place-items-center bg-black/60">
                <Loader2 size={16} className="animate-spin text-white" />
              </span>
            )}
          </button>
          <div className="min-w-0 text-xs">
            {busy ? (
              <span className="text-[var(--text-muted)]">{status.text}</span>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <button type="button" onClick={() => inputRef.current?.click()} className="text-[var(--accent)]">
                  {value ? "Trocar foto" : emptyLabel}
                </button>
                {value && (
                  <button type="button" onClick={() => onChange("")} className="text-[var(--text-muted)] hover:text-white">
                    Remover
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {errorText}
      </div>
    );
  }

  // Caixa grande (logotipo, capa, sobre)
  const aspect = kind === "capa" ? "aspect-[16/9]" : kind === "sobre" ? "aspect-[4/3]" : "h-24";
  return (
    <div>
      {picker}
      {value ? (
        <div className={`group relative overflow-hidden rounded-2xl border border-[var(--panel-border)] ${previewBg} ${aspect}`} {...dropHandlers}>
          <img src={value} alt="" className={`h-full w-full ${fit}`} />
          <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white"
            >
              <RefreshCw size={12} /> Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/70"
            >
              <Trash2 size={12} /> Remover
            </button>
          </div>
          {(busy || dragging) && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm text-white">
              {busy ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> {status.text}
                </span>
              ) : (
                "Larga a foto aqui"
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          {...dropHandlers}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 text-center transition ${
            dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-white/20 bg-white/[0.03] hover:border-white/35 hover:bg-white/[0.06]"
          } ${kind === "logo" ? "py-5" : "py-8"}`}
        >
          {busy ? (
            <>
              <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
              <span className="text-sm">{status.text}</span>
            </>
          ) : (
            <>
              <ImagePlus size={22} className="text-[var(--accent)]" />
              <span className="text-sm font-medium">{emptyLabel}</span>
              <span className="text-[11px] text-[var(--text-muted)]">Do telemóvel ou do computador · JPG, PNG ou WebP</span>
            </>
          )}
        </button>
      )}
      {errorText}
    </div>
  );
}
