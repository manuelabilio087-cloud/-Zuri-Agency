"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Monitor,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, Website, WebsiteContent, WebsiteTheme } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";

const COLOR_PRESETS = ["#6d4aff", "#0f766e", "#2563eb", "#c2410c", "#be123c", "#15803d", "#a16207", "#111827"];
const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;

type Draft = { businessName: string; slug: string; content: WebsiteContent; theme: WebsiteTheme };

export default function SiteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [site, setSite] = useState<Website | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");
  const [mobileTab, setMobileTab] = useState<"editar" | "ver">("editar");
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .getWebsite(accessToken, id)
      .then((loaded) => {
        setSite(loaded);
        setDraft({ businessName: loaded.businessName, slug: loaded.slug, content: loaded.content, theme: loaded.theme });
      })
      .catch(() => setNotFound(true));
  }, [accessToken, id]);

  // Pré-visualização ao vivo (rascunho por guardar), 600 ms depois da última alteração.
  useEffect(() => {
    if (!accessToken || !draft) return;
    const timer = setTimeout(() => {
      api
        .previewWebsite(accessToken, id, { businessName: draft.businessName, content: draft.content, theme: draft.theme })
        .then((res) => setPreviewHtml(res.html))
        .catch(() => {
          // campos inválidos a meio da edição — mantém a última pré-visualização
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [accessToken, id, draft]);

  // Aviso ao sair com alterações por guardar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function update(mutator: (d: Draft) => Draft) {
    setDraft((prev) => (prev ? mutator(prev) : prev));
    setDirty(true);
    setMessage(null);
  }

  function setContent<K extends keyof WebsiteContent>(key: K, value: WebsiteContent[K]) {
    update((d) => ({ ...d, content: { ...d.content, [key]: value } }));
  }

  async function save(extra?: { published?: boolean }) {
    if (!accessToken || !draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api.updateWebsite(accessToken, id, { ...draft, ...extra });
      setSite(saved);
      setDraft({ businessName: saved.businessName, slug: saved.slug, content: saved.content, theme: saved.theme });
      setDirty(false);
      setMessage({
        type: "ok",
        text:
          extra?.published === true
            ? "Site publicado."
            : extra?.published === false
              ? "Site despublicado."
              : "Alterações guardadas.",
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Não foi possível guardar." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !site) return;
    if (!window.confirm(`Apagar o site "${site.businessName}"? Esta ação não pode ser desfeita.`)) return;
    await api.deleteWebsite(accessToken, id);
    router.push("/sites");
  }

  async function handleCopyLink() {
    if (!site) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${site.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignora
    }
  }

  if (isLoading || !user) return null;

  if (notFound) {
    return (
      <DashboardShell>
        <div className="glass-panel rounded-3xl p-6 text-sm">
          <p className="font-medium">Site não encontrado</p>
          <Link href="/sites" className="mt-3 inline-block text-[var(--accent)] underline">
            Voltar aos sites
          </Link>
        </div>
      </DashboardShell>
    );
  }

  if (!site || !draft) {
    return (
      <DashboardShell>
        <p className="text-sm text-[var(--text-muted)]">A carregar…</p>
      </DashboardShell>
    );
  }

  const { content, theme } = draft;

  return (
    <DashboardShell>
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link href="/sites" className="mb-1 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-white">
            <ArrowLeft size={14} /> Sites
          </Link>
          <h1 className="font-display flex flex-wrap items-center gap-2 text-xl font-bold sm:text-2xl">
            <span className="truncate">{draft.businessName}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                site.published ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-[var(--text-muted)]"
              }`}
            >
              {site.published ? "Publicado" : "Rascunho"}
            </span>
            {dirty && <span className="text-xs font-normal text-[var(--temp-morno)]">Alterações por guardar</span>}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => save()}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Guardar
          </button>
          <button
            onClick={() => save({ published: !site.published })}
            disabled={saving}
            className="rounded-full border border-[var(--panel-border)] px-4 py-2.5 text-sm font-medium hover:bg-white/5 disabled:opacity-40"
          >
            {site.published ? "Despublicar" : "Publicar"}
          </button>
          {site.published && (
            <a
              href={`/s/${site.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-4 py-2.5 text-sm hover:bg-white/5"
            >
              <ExternalLink size={15} /> Ver site
            </a>
          )}
          <button
            onClick={() => accessToken && api.downloadWebsite(accessToken, site.id, site.slug)}
            className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-4 py-2.5 text-sm hover:bg-white/5"
          >
            <Download size={15} /> HTML
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
            message.type === "ok" ? "bg-emerald-400/10 text-emerald-300" : "bg-[#ff5470]/10 text-[var(--temp-muito-quente)]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Telemóvel: alterna entre editar e ver */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-white/5 p-1 lg:hidden">
        {(["editar", "ver"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`rounded-full py-2 text-sm font-medium ${mobileTab === tab ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
          >
            {tab === "editar" ? "Editar" : "Pré-visualizar"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Formulário */}
        <div className={`min-w-0 space-y-4 ${mobileTab === "ver" ? "hidden lg:block" : ""}`}>
          <Section title="Publicação">
            <Field label="Nome do negócio">
              <Input value={draft.businessName} onChange={(v) => update((d) => ({ ...d, businessName: v }))} max={80} />
            </Field>
            <Field label="Endereço do site" hint="Só letras minúsculas, números e hífens.">
              <div className="flex items-center overflow-hidden rounded-xl border border-[var(--panel-border)] bg-white/5 focus-within:border-[var(--accent)]">
                <span className="whitespace-nowrap pl-3 text-sm text-[var(--text-muted)]">/s/</span>
                <input
                  value={draft.slug}
                  onChange={(e) =>
                    update((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50) }))
                  }
                  className="w-full bg-transparent px-1 py-3 text-base text-white focus:outline-none sm:py-2.5 sm:text-sm"
                />
              </div>
            </Field>
            {site.published && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-sm text-[var(--accent)]"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Link copiado" : "Copiar link do site"}
              </button>
            )}
          </Section>

          <Section title="Topo do site">
            <Field label="Título principal">
              <Input value={content.hero.headline} onChange={(v) => setContent("hero", { ...content.hero, headline: v })} max={90} />
            </Field>
            <Field label="Subtítulo">
              <TextArea
                rows={3}
                value={content.hero.subheadline}
                onChange={(v) => setContent("hero", { ...content.hero, subheadline: v })}
                max={220}
              />
            </Field>
            <Field label="Texto do botão">
              <Input value={content.hero.ctaLabel} onChange={(v) => setContent("hero", { ...content.hero, ctaLabel: v })} max={30} />
            </Field>
            <Field label="Imagem de fundo (opcional)" hint="Link https:// de uma foto do negócio.">
              <Input
                value={content.hero.imageUrl}
                onChange={(v) => setContent("hero", { ...content.hero, imageUrl: v.trim() })}
                placeholder="https://…"
                max={500}
              />
            </Field>
            {content.rating && (
              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked
                  onChange={() => setContent("rating", null)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Mostrar classificação Google ({content.rating.value.toFixed(1)} ★, {content.rating.count} avaliações)
              </label>
            )}
          </Section>

          <Section title="Sobre">
            <Field label="Título">
              <Input value={content.about.title} onChange={(v) => setContent("about", { ...content.about, title: v })} max={60} />
            </Field>
            <Field label="Texto" hint="Deixa uma linha em branco para separar parágrafos.">
              <TextArea rows={6} value={content.about.text} onChange={(v) => setContent("about", { ...content.about, text: v })} max={1200} />
            </Field>
          </Section>

          <Section title="Serviços">
            <Field label="Título da secção">
              <Input
                value={content.services.title}
                onChange={(v) => setContent("services", { ...content.services, title: v })}
                max={60}
              />
            </Field>
            <div className="space-y-3">
              {content.services.items.map((item, index) => (
                <div key={index} className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">Serviço {index + 1}</span>
                    <button
                      onClick={() =>
                        setContent("services", {
                          ...content.services,
                          items: content.services.items.filter((_, i) => i !== index),
                        })
                      }
                      className="rounded-full p-1 text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
                      aria-label="Remover serviço"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={item.name}
                      placeholder="Nome do serviço"
                      max={60}
                      onChange={(v) =>
                        setContent("services", {
                          ...content.services,
                          items: content.services.items.map((it, i) => (i === index ? { ...it, name: v } : it)),
                        })
                      }
                    />
                    <TextArea
                      rows={2}
                      value={item.description}
                      placeholder="Descrição curta"
                      max={240}
                      onChange={(v) =>
                        setContent("services", {
                          ...content.services,
                          items: content.services.items.map((it, i) => (i === index ? { ...it, description: v } : it)),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            {content.services.items.length < 9 && (
              <button
                onClick={() =>
                  setContent("services", {
                    ...content.services,
                    items: [...content.services.items, { name: "Novo serviço", description: "" }],
                  })
                }
                className="flex items-center gap-1.5 text-sm text-[var(--accent)]"
              >
                <Plus size={14} /> Adicionar serviço
              </button>
            )}
          </Section>

          <Section title="Contactos">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Field label="Telefone">
                <Input value={content.contact.phone} onChange={(v) => setContent("contact", { ...content.contact, phone: v })} max={30} />
              </Field>
              <Field label="WhatsApp">
                <Input value={content.contact.whatsapp} onChange={(v) => setContent("contact", { ...content.contact, whatsapp: v })} max={30} />
              </Field>
            </div>
            <Field label="Email">
              <Input value={content.contact.email} onChange={(v) => setContent("contact", { ...content.contact, email: v.trim() })} max={120} />
            </Field>
            <Field label="Morada">
              <Input value={content.contact.address} onChange={(v) => setContent("contact", { ...content.contact, address: v })} max={200} />
            </Field>
            <Field label="Horário">
              <TextArea
                rows={2}
                value={content.contact.hours}
                placeholder={"Seg–Sex: 08h00–17h00\nSáb: 08h00–13h00"}
                onChange={(v) => setContent("contact", { ...content.contact, hours: v })}
                max={200}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={content.contact.showMap}
                onChange={(e) => setContent("contact", { ...content.contact, showMap: e.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Mostrar mapa (usa a morada)
            </label>
          </Section>

          <Section title="Aparência">
            <Field label="Cor principal">
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    onClick={() => update((d) => ({ ...d, theme: { ...d.theme, primary: color } }))}
                    className={`h-8 w-8 rounded-full border-2 ${theme.primary === color ? "border-white" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Cor ${color}`}
                  />
                ))}
                <input
                  type="color"
                  value={theme.primary}
                  onChange={(e) => update((d) => ({ ...d, theme: { ...d.theme, primary: e.target.value } }))}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-transparent"
                  aria-label="Escolher outra cor"
                />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fundo">
                <Toggle
                  value={theme.mode}
                  options={[
                    { value: "claro", label: "Claro" },
                    { value: "escuro", label: "Escuro" },
                  ]}
                  onChange={(v) => update((d) => ({ ...d, theme: { ...d.theme, mode: v } }))}
                />
              </Field>
              <Field label="Letra">
                <Toggle
                  value={theme.font}
                  options={[
                    { value: "moderna", label: "Moderna" },
                    { value: "classica", label: "Clássica" },
                  ]}
                  onChange={(v) => update((d) => ({ ...d, theme: { ...d.theme, font: v } }))}
                />
              </Field>
            </div>
          </Section>

          <Section title="Google (SEO)">
            <Field label="Título na pesquisa">
              <Input value={content.seo.title} onChange={(v) => setContent("seo", { ...content.seo, title: v })} max={70} />
            </Field>
            <Field label="Descrição na pesquisa">
              <TextArea rows={3} value={content.seo.description} onChange={(v) => setContent("seo", { ...content.seo, description: v })} max={160} />
            </Field>
          </Section>

          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-1 text-sm text-[var(--temp-muito-quente)] hover:underline"
          >
            <Trash2 size={14} /> Apagar site
          </button>
        </div>

        {/* Pré-visualização */}
        <div className={`min-w-0 ${mobileTab === "editar" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-6">
            <div className="mb-3 hidden items-center justify-between lg:flex">
              <p className="text-sm text-[var(--text-muted)]">Pré-visualização</p>
              <div className="flex gap-1 rounded-full bg-white/5 p-1">
                <DeviceButton active={device === "desktop"} onClick={() => setDevice("desktop")} label="PC">
                  <Monitor size={14} />
                </DeviceButton>
                <DeviceButton active={device === "mobile"} onClick={() => setDevice("mobile")} label="Telemóvel">
                  <Smartphone size={14} />
                </DeviceButton>
              </div>
            </div>
            <PreviewFrame html={previewHtml} device={device} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// Iframe com o HTML do site, à escala do espaço disponível. Sandbox sem same-origin:
// a página do site nunca tem acesso à sessão do Zuri Agency.
function PreviewFrame({ html, device }: { html: string; device: "mobile" | "desktop" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLargeScreen(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // No telemóvel/tablet, mostra sempre a versão de telemóvel a ocupar a largura toda.
  // No PC respeita o botão PC/Telemóvel (a versão PC aparece à escala).
  const isNarrow = !isLargeScreen;
  const virtualWidth = isNarrow || device === "mobile" ? MOBILE_WIDTH : DESKTOP_WIDTH;
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / virtualWidth) : 1;
  const visibleHeight = isNarrow ? 640 : 720;

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white"
        style={{ width: virtualWidth * scale, height: visibleHeight }}
      >
        {html ? (
          <iframe
            title="Pré-visualização do site"
            srcDoc={html}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            style={{
              width: virtualWidth,
              height: visibleHeight / scale,
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
              border: 0,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            <Loader2 size={16} className="mr-2 animate-spin" /> A preparar a pré-visualização…
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass-panel space-y-3 rounded-3xl p-4 sm:p-5">
      <p className="text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-[var(--text-muted)]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-3 text-base text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none sm:py-2.5 sm:text-sm";

function Input({
  value,
  onChange,
  placeholder,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={max} className={inputClass} />
  );
}

function TextArea({
  value,
  onChange,
  rows,
  placeholder,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
  max?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      maxLength={max}
      className={`${inputClass} resize-y`}
    />
  );
}

function Toggle<T extends string>({
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
          onClick={() => onChange(opt.value)}
          className={`rounded-lg py-2 text-sm ${value === opt.value ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)]"
      }`}
    >
      {children}
      {label}
    </button>
  );
}
