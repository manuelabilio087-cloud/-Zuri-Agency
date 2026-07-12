"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Phone, MapPin, Star, Loader2, FileDown, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, Lead, ContentType, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { TemperatureBadge } from "@/components/temperature-badge";
import { StatusSelect } from "@/components/status-select";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "script", label: "Script de Chamada" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "proposta", label: "Proposta Comercial" },
];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [noteText, setNoteText] = useState("");
  const [generating, setGenerating] = useState<ContentType | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api.getLead(accessToken, id).then(setLead).catch(() => setLead(null));
  }, [accessToken, id]);

  async function handleStatusChange(status: Lead["status"]) {
    if (!accessToken || !lead) return;
    const updated = await api.updateLeadStatus(accessToken, lead.id, status);
    setLead(updated);
  }

  async function handleAddNote() {
    if (!accessToken || !lead || !noteText.trim()) return;
    const updated = await api.addLeadNote(accessToken, lead.id, noteText.trim());
    setLead(updated);
    setNoteText("");
  }

  async function handleGenerate(type: ContentType) {
    if (!accessToken || !lead) return;
    setGenerating(type);
    setGenError(null);
    try {
      await api.generateContent(accessToken, { leadId: lead.id, type });
      const refreshed = await api.getLead(accessToken, lead.id);
      setLead(refreshed);
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : "Erro ao gerar conteúdo.");
    } finally {
      setGenerating(null);
    }
  }

  async function handleDownloadPdf() {
    if (!accessToken || !lead) return;
    setDownloadingPdf(true);
    try {
      await api.downloadProposalPdf(accessToken, lead.id, lead.company.name);
    } catch (err) {
      setGenError(err instanceof ApiError ? err.message : "Erro ao gerar PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (isLoading || !user) return null;

  return (
    <DashboardShell>
      <Link href="/leads" className="mb-4 flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-white">
        <ArrowLeft size={14} /> Voltar aos leads
      </Link>

      {!lead ? (
        <p className="text-sm text-[var(--text-muted)]">A carregar...</p>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {/* Coluna principal */}
          <div className="col-span-2 space-y-5">
            {/* Cabeçalho da empresa */}
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl font-bold">{lead.company.name}</h1>
                  <p className="text-sm text-[var(--text-muted)]">{lead.company.category}</p>
                </div>
                {lead.company.analysis && <TemperatureBadge temperature={lead.company.analysis.leadTemperature} />}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-[var(--text-muted)]">
                <p className="flex items-center gap-1.5">
                  <MapPin size={13} /> {lead.company.address || lead.company.city}
                </p>
                {lead.company.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={13} /> {lead.company.phone}
                  </p>
                )}
                {lead.company.website ? (
                  <p className="flex items-center gap-1.5 truncate">
                    <Globe size={13} /> {lead.company.website}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-[var(--temp-muito-quente)]">
                    <Globe size={13} /> Sem website
                  </p>
                )}
                {lead.company.rating !== null && (
                  <p className="flex items-center gap-1.5">
                    <Star size={13} /> {lead.company.rating} ({lead.company.reviewsCount ?? 0})
                  </p>
                )}
              </div>
            </div>

            {/* Scores da análise */}
            {lead.company.analysis && (
              <div className="glass-panel rounded-3xl p-6">
                <p className="mb-4 text-sm text-[var(--text-muted)]">Análise de Maturidade Digital</p>
                <div className="grid grid-cols-4 gap-3">
                  <ScoreTile label="Sales Score" value={lead.company.analysis.salesScore} highlight />
                  <ScoreTile label="Website" value={lead.company.analysis.websiteScore ?? 0} />
                  <ScoreTile label="SEO" value={lead.company.analysis.seoScore ?? 0} />
                  <ScoreTile label="Fecho" value={lead.company.analysis.closeProbability} suffix="%" />
                </div>
                <div className="mt-4 rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-[var(--text-muted)]">Serviço recomendado</p>
                  <p className="text-sm font-medium">{lead.company.analysis.recommendedService}</p>
                </div>
              </div>
            )}

            {/* Geração de conteúdo comercial */}
            <div className="glass-panel rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                  <Sparkles size={14} /> Gerar Abordagem Comercial
                </p>
                {lead.generatedContents?.some((c) => c.type === "proposta") && (
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium hover:bg-white/5"
                  >
                    {downloadingPdf ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                    Descarregar PDF
                  </button>
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    onClick={() => handleGenerate(ct.value)}
                    disabled={generating !== null || !lead.company.analysis}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent)] transition-opacity hover:opacity-80 disabled:opacity-40"
                  >
                    {generating === ct.value && <Loader2 size={12} className="animate-spin" />}
                    {ct.label}
                  </button>
                ))}
              </div>

              {!lead.company.analysis && (
                <p className="text-xs text-[var(--text-muted)]">A análise ainda não está pronta — aguarda uns instantes.</p>
              )}
              {genError && <p className="mb-3 text-xs text-[var(--temp-muito-quente)]">{genError}</p>}

              <div className="space-y-3">
                {lead.generatedContents?.length ? (
                  lead.generatedContents.map((gc) => <GeneratedContentCard key={gc.id} content={gc} />)
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">Ainda não geraste nenhum conteúdo para este lead.</p>
                )}
              </div>
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-5">
            <div className="glass-panel rounded-3xl p-5">
              <p className="mb-2 text-sm text-[var(--text-muted)]">Status</p>
              <StatusSelect value={lead.status} onChange={handleStatusChange} />
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <p className="mb-3 text-sm text-[var(--text-muted)]">Notas</p>
              <div className="mb-3 space-y-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Adicionar nota..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim()}
                  className="w-full rounded-xl bg-[var(--accent)] py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Adicionar
                </button>
              </div>

              <div className="max-h-72 space-y-3 overflow-y-auto">
                {lead.notes?.length ? (
                  lead.notes.map((note) => (
                    <div key={note.id} className="rounded-xl bg-white/5 p-3 text-sm">
                      <p>{note.content}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {new Date(note.createdAt).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Sem notas ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function ScoreTile({ label, value, suffix = "", highlight = false }: { label: string; value: number; suffix?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${highlight ? "bg-[var(--accent-soft)]" : "bg-white/5"}`}>
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <p className={`font-display text-xl font-bold tabular-nums ${highlight ? "text-[var(--accent)]" : ""}`}>
        {value}
        {suffix}
      </p>
    </div>
  );
}

function GeneratedContentCard({ content }: { content: Lead["generatedContents"] extends (infer U)[] | undefined ? U : never }) {
  const typeLabels: Record<string, string> = { script: "Script", email: "Email", whatsapp: "WhatsApp", proposta: "Proposta" };

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
          {typeLabels[content.type] ?? content.type}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          {new Date(content.createdAt).toLocaleDateString("pt-PT")}
        </span>
      </div>

      {content.type === "email" && (
        <>
          <p className="mb-1 text-sm font-medium">{content.content.subject}</p>
          <p className="whitespace-pre-line text-sm text-[var(--text-muted)]">{content.content.body}</p>
        </>
      )}

      {content.type === "proposta" && (
        <div className="space-y-2 text-sm text-[var(--text-muted)]">
          <p><span className="font-medium text-white">Diagnóstico: </span>{content.content.diagnostico}</p>
          <p><span className="font-medium text-white">Oportunidade: </span>{content.content.oportunidade}</p>
          <p><span className="font-medium text-white">Solução: </span>{content.content.solucao}</p>
          <p><span className="font-medium text-white">Próximos passos: </span>{content.content.proximos_passos}</p>
        </div>
      )}

      {(content.type === "script" || content.type === "whatsapp") && (
        <p className="whitespace-pre-line text-sm text-[var(--text-muted)]">{content.content.text}</p>
      )}
    </div>
  );
}
