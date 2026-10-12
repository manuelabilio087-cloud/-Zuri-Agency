"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Dumbbell,
  ExternalLink,
  Loader2,
  Monitor,
  Scissors,
  Smartphone,
  Stethoscope,
  Store,
  Trash2,
  TriangleAlert,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, SiteKind, Website, WebsiteContent, WebsiteTheme } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PhotoField } from "@/components/photo-field";
import { SITE_STYLES, SiteStylePicker } from "@/components/site-style-picker";
import { PhotoGrid } from "@/components/site-editor/photo-grid";
import { ContentSection } from "@/components/site-editor/sections";
import {
  AddButton,
  Check as UICheck,
  Field,
  IconButton,
  Input,
  Section,
  TextArea,
  Toggle,
  move,
} from "@/components/site-editor/ui";
import { KIND_OPTIONS, KIND_PROFILE, placeholderSections, sectionsFor, switchKind, withDefaults } from "@/lib/site-kinds";

const COLOR_PRESETS = ["#6d4aff", "#0f766e", "#2563eb", "#c2410c", "#be123c", "#15803d", "#a16207", "#111827"];
const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;
const STYLE_NAMES = Object.fromEntries(SITE_STYLES.map((s) => [s.value, s.label])) as Record<WebsiteTheme["style"], string>;
const KIND_ICONS: Record<SiteKind, typeof Store> = {
  restaurante: UtensilsCrossed,
  clinica: Stethoscope,
  ginasio: Dumbbell,
  salao: Scissors,
  geral: Store,
};

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
  // Pedido para a pré-visualização saltar para uma secção (n muda a cada pedido).
  const [jump, setJump] = useState<{ id: string; n: number } | null>(null);
  const jumpTo = (id: string) => setJump((j) => ({ id, n: (j?.n ?? 0) + 1 }));

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .getWebsite(accessToken, id)
      .then((loaded) => {
        setSite(loaded);
        setDraft({ businessName: loaded.businessName, slug: loaded.slug, content: withDefaults(loaded.content), theme: loaded.theme });
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

  // As fotos chegam depois do upload (assíncrono): atualiza a partir do rascunho mais
  // recente, para não apagar o que foi escrito entretanto.
  function editContent(mutator: (c: WebsiteContent) => WebsiteContent) {
    update((d) => ({ ...d, content: mutator(d.content) }));
  }

  async function save(extra?: { published?: boolean }) {
    if (!accessToken || !draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await api.updateWebsite(accessToken, id, { ...draft, ...extra });
      setSite(saved);
      setDraft({ businessName: saved.businessName, slug: saved.slug, content: withDefaults(saved.content), theme: saved.theme });
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
  const heroPhotos = [content.hero.imageUrl, ...content.hero.gallery].filter(Boolean).length;
  const placeholders = placeholderSections(content);
  const sections = sectionsFor(content.kind);

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
            onClick={() => {
              if (!site.published && placeholders.length > 0) {
                const ok = window.confirm(
                  `O site ainda tem textos de exemplo em: ${placeholders.join(", ")}.\n\nPublicar mesmo assim?`
                );
                if (!ok) return;
              }
              void save({ published: !site.published });
            }}
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
        <div className={`min-w-0 space-y-3 ${mobileTab === "ver" ? "hidden lg:block" : ""}`}>
          {placeholders.length > 0 && (
            <div className="flex gap-2.5 rounded-2xl border border-[#f5b94255] bg-[#f5b9421a] px-4 py-3 text-sm">
              <TriangleAlert size={16} className="mt-0.5 flex-none text-[var(--temp-morno)]" />
              <p>
                Ainda há textos de exemplo em <b>{placeholders.join(", ")}</b>. Troca-os pelos dados reais do negócio antes de
                publicar.
              </p>
            </div>
          )}

          <Section title="Publicação" defaultOpen>
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
                  aria-label="Endereço do site"
                  className="w-full bg-transparent px-1 py-3 text-base text-white focus:outline-none sm:py-2.5 sm:text-sm"
                />
              </div>
            </Field>
            {site.published && (
              <button onClick={handleCopyLink} className="flex items-center gap-1.5 text-sm text-[var(--accent)]">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Link copiado" : "Copiar link do site"}
              </button>
            )}
          </Section>

          <Section
            title="Tipo de negócio"
            hint="Decide que secções aparecem primeiro, os nomes delas e o botão de reserva. Nada do que já escreveste se perde."
            status={{ shown: true, text: KIND_OPTIONS.find((k) => k.value === content.kind)?.label ?? "Outro negócio" }}
            defaultOpen
          >
            <KindPicker value={content.kind} onChange={(kind) => editContent((c) => switchKind(c, kind))} />
          </Section>

          <Section title="Aparência" status={{ shown: true, text: `${STYLE_NAMES[theme.style]} · fundo ${theme.mode}` }}>
            <Field label="Estilo">
              <SiteStylePicker compact value={theme.style} onChange={(style) => update((d) => ({ ...d, theme: { ...d.theme, style } }))} />
            </Field>
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
          </Section>

          <Section
            title="Logotipo"
            onOpen={() => jumpTo("topo")}
            hint="Aparece no menu e no rodapé. Um PNG com fundo transparente fica melhor."
            status={content.brand.logoUrl ? { shown: true, text: "Com logotipo" } : { shown: false, text: "Sem logotipo — usa as iniciais" }}
          >
            <PhotoField
              kind="logo"
              accessToken={accessToken}
              value={content.brand.logoUrl}
              emptyLabel="Carregar logotipo"
              onChange={(url) => editContent((c) => ({ ...c, brand: { ...c.brand, logoUrl: url } }))}
            />
            {content.brand.logoUrl && (
              <UICheck
                checked={content.brand.showName}
                onChange={(on) => editContent((c) => ({ ...c, brand: { ...c.brand, showName: on } }))}
              >
                Mostrar o nome ao lado (desliga se o logotipo já tem o nome)
              </UICheck>
            )}
          </Section>

          <Section
            title="Topo do site"
            onOpen={() => jumpTo("topo")}
            hint="A primeira coisa que o cliente vê. As fotos mexem-se ao deslizar a página."
            status={{ shown: true, text: heroPhotos === 0 ? "Sem foto — fundo animado" : heroPhotos === 1 ? "1 foto" : `${heroPhotos} fotos a mudar sozinhas` }}
          >
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
            <Field
              label="Frases que vão mudando"
              hint="Aparecem por baixo do título, uma de cada vez. São precisas pelo menos 2."
            >
              <div className="space-y-2">
                {content.hero.rotating.map((phrase, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      value={phrase}
                      onChange={(v) =>
                        editContent((c) => ({ ...c, hero: { ...c.hero, rotating: c.hero.rotating.map((r, x) => (x === i ? v : r)) } }))
                      }
                      placeholder={`Frase ${i + 1}`}
                      max={40}
                    />
                    <IconButton
                      label="Remover frase"
                      onClick={() => editContent((c) => ({ ...c, hero: { ...c.hero, rotating: c.hero.rotating.filter((_, x) => x !== i) } }))}
                    >
                      <X size={14} />
                    </IconButton>
                  </div>
                ))}
                {content.hero.rotating.length < 4 && (
                  <AddButton onClick={() => editContent((c) => ({ ...c, hero: { ...c.hero, rotating: [...c.hero.rotating, ""] } }))}>
                    Adicionar frase
                  </AddButton>
                )}
              </div>
            </Field>
            <Field
              label="Foto de capa (ecrã inteiro)"
              hint="Uma foto horizontal do espaço, da equipa ou do trabalho. Sem foto, o topo usa um fundo animado na cor do site."
            >
              <PhotoField
                kind="capa"
                accessToken={accessToken}
                value={content.hero.imageUrl}
                emptyLabel="Carregar foto de capa"
                onChange={(url) => editContent((c) => ({ ...c, hero: { ...c.hero, imageUrl: url } }))}
              />
            </Field>
            <Field label="Mais fotos para o topo (opcional)" hint="Com 2 ou mais fotos, o topo vai passando de uma para a outra sozinho.">
              <PhotoGrid
                urls={content.hero.gallery}
                max={4}
                kind="capa"
                accessToken={accessToken}
                onAdd={(url) =>
                  editContent((c) => (c.hero.gallery.length >= 4 ? c : { ...c, hero: { ...c.hero, gallery: [...c.hero.gallery, url] } }))
                }
                onRemove={(i) => editContent((c) => ({ ...c, hero: { ...c.hero, gallery: c.hero.gallery.filter((_, x) => x !== i) } }))}
                onMove={(from, to) => editContent((c) => ({ ...c, hero: { ...c.hero, gallery: move(c.hero.gallery, from, to) } }))}
              />
            </Field>
            {content.rating && (
              <UICheck checked onChange={() => setContent("rating", null)}>
                Mostrar classificação Google ({content.rating.value.toFixed(1)} ★, {content.rating.count} avaliações)
              </UICheck>
            )}
          </Section>

          <Section
            title="Botão principal (WhatsApp)"
            onOpen={() => jumpTo("topo")}
            hint="O botão de reserva aparece no topo, no menu e no fim da página."
            status={{ shown: true, text: content.hero.ctaLabel || "Sem texto" }}
          >
            <Field label="Texto do botão">
              <Input value={content.hero.ctaLabel} onChange={(v) => setContent("hero", { ...content.hero, ctaLabel: v })} max={30} />
            </Field>
            <Field
              label="Mensagem já escrita no WhatsApp"
              hint="Quando o cliente toca no botão, o WhatsApp abre com esta mensagem. Os «__» são para o cliente completar."
            >
              <TextArea
                rows={3}
                value={content.booking.message}
                onChange={(v) => setContent("booking", { message: v })}
                placeholder={KIND_PROFILE[content.kind]?.message}
                max={300}
              />
            </Field>
            {!content.contact.whatsapp.trim() && (
              <p className="text-[11px] text-[var(--temp-morno)]">
                Ainda não há número de WhatsApp nos Contactos: sem ele, o botão liga para o telefone e a mensagem não é usada.
              </p>
            )}
          </Section>

          <p className="px-1 pt-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Secções de {(KIND_OPTIONS.find((k) => k.value === content.kind)?.label ?? "negócio").toLowerCase()}
          </p>
          {sections.main.map((key) => (
            <ContentSection key={key} sectionKey={key} content={content} edit={editContent} accessToken={accessToken} onJump={jumpTo} />
          ))}

          <p className="px-1 pt-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Mais secções (opcionais)</p>
          {sections.extra.map((key) => (
            <ContentSection key={key} sectionKey={key} content={content} edit={editContent} accessToken={accessToken} onJump={jumpTo} />
          ))}

          <p className="px-1 pt-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Informações</p>
          <Section title="Contactos" onOpen={() => jumpTo("contacto")} status={{ shown: true, text: [content.contact.whatsapp && "WhatsApp", content.contact.phone && "telefone", content.contact.address && "morada"].filter(Boolean).join(" · ") || "Sem contactos" }}>
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
            <UICheck checked={content.contact.showMap} onChange={(on) => setContent("contact", { ...content.contact, showMap: on })}>
              Mostrar mapa (usa a morada)
            </UICheck>
          </Section>

          <Section title="Google (SEO)" hint="Como o site aparece nas pesquisas do Google.">
            <Field label="Título na pesquisa">
              <Input value={content.seo.title} onChange={(v) => setContent("seo", { ...content.seo, title: v })} max={70} />
            </Field>
            <Field label="Descrição na pesquisa">
              <TextArea rows={3} value={content.seo.description} onChange={(v) => setContent("seo", { ...content.seo, description: v })} max={160} />
            </Field>
          </Section>

          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-1 pt-2 text-sm text-[var(--temp-muito-quente)] hover:underline"
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
            <PreviewFrame html={previewHtml} device={device} jump={jump} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// Iframe com o HTML do site, à escala do espaço disponível. Sandbox sem same-origin:
// a página do site nunca tem acesso à sessão do Zuri Agency.
function PreviewFrame({
  html,
  device,
  jump,
}: {
  html: string;
  device: "mobile" | "desktop";
  jump: { id: string; n: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frames = useRef(new Map<number, HTMLIFrameElement>());
  const scrollRef = useRef(0);
  const nextId = useRef(0);
  const [layers, setLayers] = useState<PreviewLayer[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  // Cada versão nova abre num iframe novo por cima do anterior, que só desaparece
  // quando a nova acabou de carregar — sem piscar a branco. O nome do iframe leva a
  // posição do scroll ("zp:N"): o browser só o aplica quando o iframe é criado, e o
  // site abre logo nesse ponto em vez de saltar para o topo.
  useEffect(() => {
    if (!html) return;
    const id = ++nextId.current;
    setLayers((prev) => [...prev.filter((l) => l.ready).slice(-1), { id, html, name: `zp:${scrollRef.current}`, ready: false }]);
    // Se o "load" demorar (fotos pesadas), mostra a nova versão na mesma.
    const timer = setTimeout(() => markReady(id), 2500);
    return () => clearTimeout(timer);
  }, [html]);

  function markReady(id: number) {
    setLayers((prev) => {
      const index = prev.findIndex((l) => l.id === id);
      if (index < 0 || prev[index].ready) return prev;
      return prev.slice(index).map((l) => (l.id === id ? { ...l, ready: true } : l));
    });
  }

  // Ao abrir uma secção no editor, o site da pré-visualização desliza até ela.
  useEffect(() => {
    if (!jump) return;
    frames.current.forEach((frame) => frame.contentWindow?.postMessage({ zuriGoTo: jump.id }, "*"));
  }, [jump]);

  // O site avisa onde está o scroll (só aceitamos mensagens dos nossos iframes).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const ours = Array.from(frames.current.values()).some((frame) => frame.contentWindow === event.source);
      if (!ours) return;
      const y = (event.data as { zuriPreviewScroll?: unknown } | null)?.zuriPreviewScroll;
      if (typeof y === "number" && Number.isFinite(y) && y >= 0) scrollRef.current = Math.round(y);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
  const anyReady = layers.some((l) => l.ready);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-white"
        style={{ width: virtualWidth * scale, height: visibleHeight }}
      >
        {layers.map((layer) => (
          <iframe
            key={layer.id}
            ref={(el) => {
              if (el) frames.current.set(layer.id, el);
              else frames.current.delete(layer.id);
            }}
            title="Pré-visualização do site"
            name={layer.name}
            srcDoc={layer.html}
            onLoad={() => markReady(layer.id)}
            aria-hidden={!layer.ready}
            tabIndex={layer.ready ? undefined : -1}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: virtualWidth,
              height: visibleHeight / scale,
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
              border: 0,
              opacity: layer.ready ? 1 : 0,
              pointerEvents: layer.ready ? "auto" : "none",
            }}
          />
        ))}
        {!anyReady && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
            <Loader2 size={16} className="mr-2 animate-spin" /> A preparar a pré-visualização…
          </div>
        )}
      </div>
    </div>
  );
}

type PreviewLayer = { id: number; html: string; name: string; ready: boolean };

function KindPicker({ value, onChange }: { value: SiteKind; onChange: (kind: SiteKind) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de negócio">
      {KIND_OPTIONS.map((opt) => {
        const Icon = KIND_ICONS[opt.value];
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && onChange(opt.value)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                : "border-[var(--panel-border)] bg-white/[0.03] text-[var(--text-muted)] hover:border-white/30 hover:text-white"
            }`}
          >
            <Icon size={18} className={active ? "text-white" : "text-[var(--accent)]"} />
            <span className="leading-tight">{opt.label}</span>
          </button>
        );
      })}
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
