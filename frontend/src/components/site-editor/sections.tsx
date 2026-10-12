"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, X } from "lucide-react";
import type { CatalogItem, SiteKind, WebsiteContent, WeekDay } from "@/lib/api";
import { PhotoField } from "@/components/photo-field";
import { PhotoGrid } from "@/components/site-editor/photo-grid";
import {
  AddButton,
  Check,
  Field,
  IconButton,
  Input,
  ItemCard,
  Section,
  Suggestions,
  TextArea,
  count,
  inputClass,
  move,
} from "@/components/site-editor/ui";
import {
  DAY_OPTIONS,
  FAQ_SUGGESTIONS,
  PAYMENT_SUGGESTIONS,
  SECTION_ANCHOR,
  SectionKey,
  catalogShowsDetail,
  sectionCopy,
} from "@/lib/site-kinds";

type Edit = (fn: (c: WebsiteContent) => WebsiteContent) => void;
type EditorProps = { content: WebsiteContent; edit: Edit; accessToken: string | null };

function setter<K extends keyof WebsiteContent>(edit: Edit, key: K) {
  return (fn: (v: WebsiteContent[K]) => WebsiteContent[K]) => edit((c) => ({ ...c, [key]: fn(c[key]) }));
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Estado de cada secção (aparece ou não no site) — igual às regras do renderer
// ---------------------------------------------------------------------------
export function sectionStatus(content: WebsiteContent, key: SectionKey): { shown: boolean; text: string } {
  const copy = sectionCopy(content.kind, key);
  const empty = { shown: false, text: "Vazia — não aparece no site" };
  const n = (num: number) => (num > 0 ? { shown: true, text: `${count(num, copy.unit)} · no site` } : empty);
  switch (key) {
    case "highlight":
      return content.highlight.name.trim() ? { shown: true, text: `${content.highlight.name} · no site` } : empty;
    case "catalog":
      return n(content.catalog.categories.reduce((sum, c) => sum + c.items.filter((i) => i.name.trim()).length, 0));
    case "about":
      return content.about.text.trim() ? { shown: true, text: "No site" } : empty;
    case "services":
      return n(content.services.items.filter((s) => s.name.trim()).length);
    case "gallery":
      return n(content.gallery.images.filter((g) => g.url).length);
    case "team":
      return n(content.team.members.filter((m) => m.name.trim()).length);
    case "plans":
      return n(content.plans.items.filter((p) => p.name.trim()).length);
    case "schedule":
      return n(content.schedule.entries.filter((e) => e.name.trim()).length);
    case "partners":
      return n(content.partners.items.filter((p) => p.trim()).length);
    case "faq":
      return n(content.faq.items.filter((f) => f.q.trim() && f.a.trim()).length);
    case "band":
      return content.band.imageUrl ? { shown: true, text: "No site" } : { shown: false, text: "Sem foto — não aparece no site" };
    case "testimonials":
      return n(content.testimonials.items.filter((t) => t.name.trim() && t.text.trim()).length);
  }
}

export function ContentSection({
  sectionKey,
  onJump,
  ...props
}: EditorProps & { sectionKey: SectionKey; onJump?: (anchor: string) => void }) {
  const copy = sectionCopy(props.content.kind, sectionKey);
  const Editor = EDITORS[sectionKey];
  return (
    <Section
      title={copy.name}
      hint={copy.hint}
      status={sectionStatus(props.content, sectionKey)}
      onOpen={() => onJump?.(SECTION_ANCHOR[sectionKey])}
    >
      <Editor {...props} />
    </Section>
  );
}

function TitleField({ value, onChange, kind, sectionKey }: { value: string; onChange: (v: string) => void; kind: SiteKind; sectionKey: SectionKey }) {
  const siteTitle = sectionCopy(kind, sectionKey).siteTitle;
  return (
    <Field label="Título da secção (opcional)">
      <Input value={value} onChange={onChange} placeholder={siteTitle || "Título"} max={60} />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Destaque / prato da casa
// ---------------------------------------------------------------------------
function HighlightEditor({ content, edit, accessToken }: EditorProps) {
  const set = setter(edit, "highlight");
  const hl = content.highlight;
  const copy = sectionCopy(content.kind, "highlight");
  return (
    <>
      <Field label="Nome">
        <Input
          value={hl.name}
          onChange={(v) => set((h) => ({ ...h, name: v }))}
          placeholder={content.kind === "restaurante" ? "Ex: Frango à zambeziana" : "Ex: Corte + barba"}
          max={80}
        />
      </Field>
      <Field label="Descrição">
        <TextArea
          rows={3}
          value={hl.description}
          onChange={(v) => set((h) => ({ ...h, description: v }))}
          placeholder="O que tem, como é feito, porque é que os clientes gostam…"
          max={300}
        />
      </Field>
      <Field label="Preço (opcional)" hint="Só números fica «650 MT». Deixa vazio para não mostrar preço.">
        <Input value={hl.price} onChange={(v) => set((h) => ({ ...h, price: v }))} placeholder="Ex: 650" max={30} />
      </Field>
      <Field label="Foto" hint="Uma foto bonita e bem iluminada. Mexe-se ligeiramente ao deslizar a página.">
        <PhotoField
          kind="prato"
          accessToken={accessToken}
          value={hl.imageUrl}
          emptyLabel="Carregar foto"
          onChange={(url) => set((h) => ({ ...h, imageUrl: url }))}
        />
      </Field>
      <Field label="Etiqueta por cima do nome (opcional)">
        <Input value={hl.title} onChange={(v) => set((h) => ({ ...h, title: v }))} placeholder={copy.siteTitle} max={60} />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------
// Menu / lista de preços
// ---------------------------------------------------------------------------
function CatalogEditor({ content, edit, accessToken }: EditorProps) {
  const set = setter(edit, "catalog");
  const kind = content.kind;
  const copy = sectionCopy(kind, "catalog");
  const cats = content.catalog.categories;
  const itemWord = cap(copy.unit?.[0] ?? "item");

  return (
    <>
      <TitleField kind={kind} sectionKey="catalog" value={content.catalog.title} onChange={(v) => set((c) => ({ ...c, title: v }))} />
      <p className="text-[11px] text-[var(--text-muted)]">
        Preço só com números fica «350 MT». Deixa o preço vazio para não o mostrar. Com mais de uma categoria, o site mostra
        separadores.
      </p>
      <div className="space-y-3">
        {cats.map((cat, ci) => (
          <CategoryCard
            key={ci}
            index={ci}
            total={cats.length}
            name={cat.name}
            items={cat.items}
            itemWord={itemWord}
            showDetail={catalogShowsDetail(kind)}
            accessToken={accessToken}
            onName={(v) => set((c) => ({ ...c, categories: c.categories.map((k, x) => (x === ci ? { ...k, name: v } : k)) }))}
            onMove={(from, to) => set((c) => ({ ...c, categories: move(c.categories, from, to) }))}
            onRemove={() => {
              const filled = cat.items.filter((i) => i.name.trim()).length;
              if (filled > 0 && !window.confirm(`Remover «${cat.name || "esta categoria"}» e ${count(filled, copy.unit)}?`)) return;
              set((c) => ({ ...c, categories: c.categories.filter((_, x) => x !== ci) }));
            }}
            onItems={(fn) => set((c) => ({ ...c, categories: c.categories.map((k, x) => (x === ci ? { ...k, items: fn(k.items) } : k)) }))}
          />
        ))}
      </div>
      {cats.length < 8 && (
        <AddButton onClick={() => set((c) => ({ ...c, categories: [...c.categories, { name: "", items: [] }] }))}>
          Adicionar categoria
        </AddButton>
      )}
    </>
  );
}

function CategoryCard({
  index,
  total,
  name,
  items,
  itemWord,
  showDetail,
  accessToken,
  onName,
  onMove,
  onRemove,
  onItems,
}: {
  index: number;
  total: number;
  name: string;
  items: CatalogItem[];
  itemWord: string;
  showDetail: boolean;
  accessToken: string | null;
  onName: (v: string) => void;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onItems: (fn: (items: CatalogItem[]) => CatalogItem[]) => void;
}) {
  const [open, setOpen] = useState(index === 0);
  const filled = items.filter((i) => i.name.trim()).length;
  const setItem = (ii: number, patch: Partial<CatalogItem>) => onItems((list) => list.map((it, y) => (y === ii ? { ...it, ...patch } : it)));

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.03]">
      <div className="flex items-center gap-1 p-2 pl-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Fechar categoria" : "Abrir categoria"}
          className="grid h-8 w-8 flex-none place-items-center rounded-full text-[var(--text-muted)] hover:bg-white/10"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Nome da categoria"
          aria-label="Nome da categoria"
          maxLength={40}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1.5 text-sm font-semibold text-white placeholder:font-normal placeholder:text-[var(--text-muted)] focus:bg-white/5 focus:outline-none"
        />
        <span className="flex-none text-[11px] text-[var(--text-muted)]">{filled}</span>
        {total > 1 && (
          <>
            <IconButton label="Mover categoria para cima" disabled={index === 0} onClick={() => onMove(index, index - 1)}>
              <ArrowUp size={14} />
            </IconButton>
            <IconButton label="Mover categoria para baixo" disabled={index === total - 1} onClick={() => onMove(index, index + 1)}>
              <ArrowDown size={14} />
            </IconButton>
          </>
        )}
        <IconButton label="Remover categoria" onClick={onRemove}>
          <X size={14} />
        </IconButton>
      </div>

      {open && (
        <div className="space-y-2 border-t border-[var(--panel-border)] p-3">
          {items.length === 0 && <p className="text-xs text-[var(--text-muted)]">Ainda sem {itemWord.toLowerCase()}s. Categorias vazias não aparecem no site.</p>}
          {items.map((it, ii) => (
            <ItemCard
              key={ii}
              title={it.name.trim() || `${itemWord} ${ii + 1}`}
              index={ii}
              count={items.length}
              onMove={(from, to) => onItems((list) => move(list, from, to))}
              onRemove={() => onItems((list) => list.filter((_, y) => y !== ii))}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                <Input value={it.name} onChange={(v) => setItem(ii, { name: v })} placeholder="Nome" max={80} />
                <Input value={it.price} onChange={(v) => setItem(ii, { price: v })} placeholder="Preço" label="Preço" max={30} />
              </div>
              <Input value={it.description} onChange={(v) => setItem(ii, { description: v })} placeholder="Descrição curta (opcional)" max={200} />
              {showDetail && (
                <Input value={it.detail} onChange={(v) => setItem(ii, { detail: v })} placeholder="Duração (ex: 30 min)" label="Duração" max={30} />
              )}
              <PhotoField
                kind="prato"
                layout="row"
                accessToken={accessToken}
                value={it.imageUrl}
                emptyLabel="Foto (opcional)"
                onChange={(url) => setItem(ii, { imageUrl: url })}
              />
            </ItemCard>
          ))}
          {items.length < 30 && (
            <AddButton onClick={() => onItems((list) => [...list, { name: "", description: "", price: "", detail: "", imageUrl: "" }])}>
              Adicionar {itemWord.toLowerCase()}
            </AddButton>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sobre
// ---------------------------------------------------------------------------
function AboutEditor({ content, edit, accessToken }: EditorProps) {
  const set = setter(edit, "about");
  return (
    <>
      <Field label="Título">
        <Input value={content.about.title} onChange={(v) => set((a) => ({ ...a, title: v }))} max={60} />
      </Field>
      <Field label="Texto" hint="Deixa uma linha em branco para separar parágrafos.">
        <TextArea rows={6} value={content.about.text} onChange={(v) => set((a) => ({ ...a, text: v }))} max={1200} />
      </Field>
      <Field label="Foto (opcional)" hint="Fica ao lado do texto e mexe-se ao deslizar. Fotos na vertical resultam melhor.">
        <PhotoField kind="sobre" accessToken={accessToken} value={content.about.imageUrl} onChange={(url) => set((a) => ({ ...a, imageUrl: url }))} />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------
// Serviços / especialidades / modalidades
// ---------------------------------------------------------------------------
function ServicesEditor({ content, edit, accessToken }: EditorProps) {
  const set = setter(edit, "services");
  const copy = sectionCopy(content.kind, "services");
  const word = cap(copy.unit?.[0] ?? "serviço");
  const items = content.services.items;
  const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    set((s) => ({ ...s, items: s.items.map((it, x) => (x === i ? { ...it, ...patch } : it)) }));
  return (
    <>
      <TitleField kind={content.kind} sectionKey="services" value={content.services.title} onChange={(v) => set((s) => ({ ...s, title: v }))} />
      <div className="space-y-3">
        {items.map((item, i) => (
          <ItemCard
            key={i}
            title={item.name.trim() || `${word} ${i + 1}`}
            index={i}
            count={items.length}
            onMove={(from, to) => set((s) => ({ ...s, items: move(s.items, from, to) }))}
            onRemove={() => set((s) => ({ ...s, items: s.items.filter((_, x) => x !== i) }))}
          >
            <Input value={item.name} placeholder="Nome" max={60} onChange={(v) => setItem(i, { name: v })} />
            <TextArea rows={2} value={item.description} placeholder="Descrição curta" max={240} onChange={(v) => setItem(i, { description: v })} />
            <PhotoField
              kind="servico"
              layout="row"
              accessToken={accessToken}
              value={item.imageUrl}
              emptyLabel="Adicionar foto"
              onChange={(url) => setItem(i, { imageUrl: url })}
            />
          </ItemCard>
        ))}
      </div>
      {items.length < 9 && (
        <AddButton onClick={() => set((s) => ({ ...s, items: [...s.items, { name: "", description: "", imageUrl: "" }] }))}>
          Adicionar {word.toLowerCase()}
        </AddButton>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------
function GalleryEditor({ content, edit, accessToken }: EditorProps) {
  const set = setter(edit, "gallery");
  const images = content.gallery.images;
  return (
    <>
      <TitleField kind={content.kind} sectionKey="gallery" value={content.gallery.title} onChange={(v) => set((g) => ({ ...g, title: v }))} />
      <PhotoGrid
        urls={images.map((g) => g.url)}
        max={12}
        kind="galeria"
        accessToken={accessToken}
        onAdd={(url) => set((g) => (g.images.length >= 12 ? g : { ...g, images: [...g.images, { url, caption: "" }] }))}
        onRemove={(i) => set((g) => ({ ...g, images: g.images.filter((_, x) => x !== i) }))}
        onMove={(from, to) => set((g) => ({ ...g, images: move(g.images, from, to) }))}
        renderBelow={(i) => (
          <input
            value={images[i]?.caption ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set((g) => ({ ...g, images: g.images.map((it, x) => (x === i ? { ...it, caption: v } : it)) }));
            }}
            placeholder="Legenda (opcional)"
            aria-label={`Legenda da foto ${i + 1}`}
            maxLength={80}
            className={`${inputClass} !py-2 !text-xs`}
          />
        )}
      />
      <p className="text-[11px] text-[var(--text-muted)]">Podes escolher várias fotos de uma vez.</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Equipa
// ---------------------------------------------------------------------------
function TeamEditor({ content, edit, accessToken }: EditorProps) {
  const set = setter(edit, "team");
  const members = content.team.members;
  const setMember = (i: number, patch: Partial<(typeof members)[number]>) =>
    set((t) => ({ ...t, members: t.members.map((m, x) => (x === i ? { ...m, ...patch } : m)) }));
  const rolePlaceholder =
    content.kind === "clinica" ? "Ex: Pediatria" : content.kind === "ginasio" ? "Ex: Treinador" : content.kind === "salao" ? "Ex: Barbeiro" : "Função";
  return (
    <>
      <TitleField kind={content.kind} sectionKey="team" value={content.team.title} onChange={(v) => set((t) => ({ ...t, title: v }))} />
      <div className="space-y-3">
        {members.map((m, i) => (
          <ItemCard
            key={i}
            title={m.name.trim() || `Pessoa ${i + 1}`}
            index={i}
            count={members.length}
            onMove={(from, to) => set((t) => ({ ...t, members: move(t.members, from, to) }))}
            onRemove={() => set((t) => ({ ...t, members: t.members.filter((_, x) => x !== i) }))}
          >
            <div className="grid grid-cols-2 gap-2">
              <Input value={m.name} onChange={(v) => setMember(i, { name: v })} placeholder="Nome" max={60} />
              <Input value={m.role} onChange={(v) => setMember(i, { role: v })} placeholder={rolePlaceholder} label="Função" max={80} />
            </div>
            <PhotoField
              kind="equipa"
              layout="row"
              accessToken={accessToken}
              value={m.imageUrl}
              emptyLabel="Foto (opcional)"
              onChange={(url) => setMember(i, { imageUrl: url })}
            />
          </ItemCard>
        ))}
      </div>
      {members.length < 12 && (
        <AddButton onClick={() => set((t) => ({ ...t, members: [...t.members, { name: "", role: "", imageUrl: "" }] }))}>
          Adicionar pessoa
        </AddButton>
      )}
      <p className="text-[11px] text-[var(--text-muted)]">Sem foto, aparecem as iniciais do nome. Pede autorização antes de publicar fotos de pessoas.</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------------
function PlansEditor({ content, edit }: EditorProps) {
  const set = setter(edit, "plans");
  const items = content.plans.items;
  const setPlan = (i: number, patch: Partial<(typeof items)[number]>) =>
    set((p) => ({ ...p, items: p.items.map((it, x) => (x === i ? { ...it, ...patch } : it)) }));
  return (
    <>
      <TitleField kind={content.kind} sectionKey="plans" value={content.plans.title} onChange={(v) => set((p) => ({ ...p, title: v }))} />
      <div className="space-y-3">
        {items.map((plan, i) => (
          <ItemCard
            key={i}
            title={plan.name.trim() || `Plano ${i + 1}`}
            index={i}
            count={items.length}
            onMove={(from, to) => set((p) => ({ ...p, items: move(p.items, from, to) }))}
            onRemove={() => set((p) => ({ ...p, items: p.items.filter((_, x) => x !== i) }))}
          >
            <Input value={plan.name} onChange={(v) => setPlan(i, { name: v })} placeholder="Nome (ex: Mensal)" label="Nome do plano" max={40} />
            <div className="grid grid-cols-2 gap-2">
              <Input value={plan.price} onChange={(v) => setPlan(i, { price: v })} placeholder="Preço (ex: 2500)" label="Preço" max={30} />
              <Input value={plan.period} onChange={(v) => setPlan(i, { period: v })} placeholder="Período (ex: /mês)" label="Período" max={20} />
            </div>
            <TextArea
              rows={3}
              value={plan.features.join("\n")}
              onChange={(v) => setPlan(i, { features: v.split("\n").slice(0, 8) })}
              placeholder={"O que inclui — uma coisa por linha\nEx: Acesso à musculação\nAulas de grupo"}
              label="O que inclui"
            />
            <Check
              checked={plan.featured}
              onChange={(on) => set((p) => ({ ...p, items: p.items.map((it, x) => ({ ...it, featured: x === i ? on : on ? false : it.featured })) }))}
            >
              Destacar este plano (fica em evidência)
            </Check>
          </ItemCard>
        ))}
      </div>
      {items.length < 4 && (
        <AddButton onClick={() => set((p) => ({ ...p, items: [...p.items, { name: "", price: "", period: "", features: [], featured: false }] }))}>
          Adicionar plano
        </AddButton>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Horário das aulas (agrupado por dia)
// ---------------------------------------------------------------------------
function ScheduleEditor({ content, edit }: EditorProps) {
  const set = setter(edit, "schedule");
  const entries = content.schedule.entries;
  const days = DAY_OPTIONS.filter((d) => entries.some((e) => e.day === d.value));
  const missing = DAY_OPTIONS.filter((d) => !entries.some((e) => e.day === d.value));
  const full = entries.length >= 60;
  const add = (day: WeekDay) => set((s) => (s.entries.length >= 60 ? s : { ...s, entries: [...s.entries, { day, time: "", name: "" }] }));
  const setEntry = (i: number, patch: Partial<(typeof entries)[number]>) =>
    set((s) => ({ ...s, entries: s.entries.map((e, x) => (x === i ? { ...e, ...patch } : e)) }));

  return (
    <>
      <TitleField kind={content.kind} sectionKey="schedule" value={content.schedule.title} onChange={(v) => set((s) => ({ ...s, title: v }))} />
      <div className="space-y-3">
        {days.map((d) => (
          <div key={d.value} className="rounded-2xl border border-[var(--panel-border)] bg-white/[0.03] p-3">
            <p className="mb-2 text-xs font-semibold">{d.label}</p>
            <div className="space-y-2">
              {entries.map((e, i) =>
                e.day !== d.value ? null : (
                  <div key={i} className="grid grid-cols-[76px_minmax(0,1fr)_32px] items-center gap-2">
                    <input
                      value={e.time}
                      onChange={(ev) => setEntry(i, { time: ev.target.value })}
                      placeholder="18:00"
                      aria-label="Hora"
                      maxLength={12}
                      className={`${inputClass} !px-2 text-center`}
                    />
                    <Input value={e.name} onChange={(v) => setEntry(i, { name: v })} placeholder="Aula (ex: Zumba)" label="Aula" max={50} />
                    <IconButton label="Remover aula" onClick={() => set((s) => ({ ...s, entries: s.entries.filter((_, x) => x !== i) }))}>
                      <X size={14} />
                    </IconButton>
                  </div>
                )
              )}
            </div>
            {!full && <AddButton onClick={() => add(d.value)}>Aula na {d.label.toLowerCase()}</AddButton>}
          </div>
        ))}
      </div>
      {!full && missing.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && add(e.target.value as WeekDay)}
          aria-label="Adicionar dia"
          className={`${inputClass} text-[var(--accent)]`}
        >
          <option value="">+ Adicionar dia…</option>
          {missing.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Formas de pagamento / seguros (etiquetas)
// ---------------------------------------------------------------------------
function PartnersEditor({ content, edit }: EditorProps) {
  const set = setter(edit, "partners");
  const [draft, setDraft] = useState("");
  const items = content.partners.items;
  const isClinic = content.kind === "clinica";
  const add = (raw: string) => {
    const v = raw.trim().slice(0, 40);
    if (!v) return;
    set((p) => (p.items.length >= 16 || p.items.some((x) => x.toLowerCase() === v.toLowerCase()) ? p : { ...p, items: [...p.items, v] }));
    setDraft("");
  };
  const suggestions = isClinic ? [] : PAYMENT_SUGGESTIONS.filter((s) => !items.some((x) => x.toLowerCase() === s.toLowerCase()));
  return (
    <>
      <TitleField kind={content.kind} sectionKey="partners" value={content.partners.title} onChange={(v) => set((p) => ({ ...p, title: v }))} />
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span key={`${it}-${i}`} className="flex items-center gap-1 rounded-full bg-white/10 py-1 pl-3 pr-1 text-xs">
              {it}
              <button
                type="button"
                onClick={() => set((p) => ({ ...p, items: p.items.filter((_, x) => x !== i) }))}
                aria-label={`Remover ${it}`}
                className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/15"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {items.length < 16 && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder={isClinic ? "Nome da seguradora" : "Ex: M-Pesa"}
            aria-label={isClinic ? "Nome da seguradora" : "Forma de pagamento"}
            maxLength={40}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => add(draft)}
            disabled={!draft.trim()}
            className="flex-none rounded-xl border border-[var(--panel-border)] px-3 text-sm hover:bg-white/5 disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
      )}
      {items.length < 16 && <Suggestions items={suggestions} onPick={add} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Perguntas frequentes
// ---------------------------------------------------------------------------
function FaqEditor({ content, edit }: EditorProps) {
  const set = setter(edit, "faq");
  const items = content.faq.items;
  const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    set((f) => ({ ...f, items: f.items.map((it, x) => (x === i ? { ...it, ...patch } : it)) }));
  const add = (q: string) => set((f) => (f.items.length >= 10 ? f : { ...f, items: [...f.items, { q, a: "" }] }));
  const suggestions = (FAQ_SUGGESTIONS[content.kind] ?? []).filter((s) => !items.some((it) => it.q.trim() === s));
  return (
    <>
      <TitleField kind={content.kind} sectionKey="faq" value={content.faq.title} onChange={(v) => set((f) => ({ ...f, title: v }))} />
      <div className="space-y-3">
        {items.map((it, i) => (
          <ItemCard
            key={i}
            title={`Pergunta ${i + 1}`}
            index={i}
            count={items.length}
            onMove={(from, to) => set((f) => ({ ...f, items: move(f.items, from, to) }))}
            onRemove={() => set((f) => ({ ...f, items: f.items.filter((_, x) => x !== i) }))}
          >
            <Input value={it.q} onChange={(v) => setItem(i, { q: v })} placeholder="Pergunta" max={140} />
            <TextArea rows={3} value={it.a} onChange={(v) => setItem(i, { a: v })} placeholder="Resposta (com a informação real do negócio)" label="Resposta" max={500} />
            {it.q.trim() && !it.a.trim() && <p className="text-[11px] text-[var(--temp-morno)]">Sem resposta, esta pergunta não aparece no site.</p>}
          </ItemCard>
        ))}
      </div>
      {items.length < 10 && (
        <>
          <AddButton onClick={() => add("")}>Adicionar pergunta</AddButton>
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-[var(--text-muted)]">Perguntas comuns (a resposta escreves tu):</p>
              <Suggestions items={suggestions} onPick={add} />
            </div>
          )}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Faixa com foto em movimento
// ---------------------------------------------------------------------------
function BandEditor({ content, edit, accessToken }: EditorProps) {
  const set = setter(edit, "band");
  return (
    <>
      <Field label="Foto larga">
        <PhotoField
          kind="faixa"
          accessToken={accessToken}
          value={content.band.imageUrl}
          emptyLabel="Carregar foto"
          onChange={(url) => set((b) => ({ ...b, imageUrl: url }))}
        />
      </Field>
      <Field label="Frase por cima da foto (opcional)">
        <Input
          value={content.band.text}
          onChange={(v) => set((b) => ({ ...b, text: v }))}
          placeholder={content.kind === "ginasio" ? "Ex: O primeiro passo é aparecer" : "Ex: Uma mesa sempre pronta para a família"}
          max={120}
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------
// Testemunhos
// ---------------------------------------------------------------------------
function TestimonialsEditor({ content, edit }: EditorProps) {
  const set = setter(edit, "testimonials");
  const items = content.testimonials.items;
  const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    set((t) => ({ ...t, items: t.items.map((it, x) => (x === i ? { ...it, ...patch } : it)) }));
  return (
    <>
      {items.length > 0 && (
        <TitleField kind={content.kind} sectionKey="testimonials" value={content.testimonials.title} onChange={(v) => set((t) => ({ ...t, title: v }))} />
      )}
      <div className="space-y-3">
        {items.map((item, i) => (
          <ItemCard
            key={i}
            title={`Testemunho ${i + 1}`}
            index={i}
            count={items.length}
            onMove={(from, to) => set((t) => ({ ...t, items: move(t.items, from, to) }))}
            onRemove={() => set((t) => ({ ...t, items: t.items.filter((_, x) => x !== i) }))}
          >
            <TextArea rows={3} value={item.text} placeholder="O que o cliente disse…" max={400} onChange={(v) => setItem(i, { text: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Input value={item.name} placeholder="Nome do cliente" max={60} onChange={(v) => setItem(i, { name: v })} />
              <Input value={item.role} placeholder="Ex: Cliente (opcional)" max={60} onChange={(v) => setItem(i, { role: v })} />
            </div>
            {(!item.name.trim() || !item.text.trim()) && (
              <p className="text-[11px] text-[var(--temp-morno)]">Precisa de texto e nome para aparecer no site.</p>
            )}
          </ItemCard>
        ))}
      </div>
      {items.length < 6 && (
        <AddButton onClick={() => set((t) => ({ ...t, items: [...t.items, { name: "", role: "", text: "" }] }))}>Adicionar testemunho</AddButton>
      )}
    </>
  );
}

const EDITORS: Record<SectionKey, (props: EditorProps) => JSX.Element> = {
  highlight: HighlightEditor,
  catalog: CatalogEditor,
  about: AboutEditor,
  services: ServicesEditor,
  gallery: GalleryEditor,
  team: TeamEditor,
  plans: PlansEditor,
  schedule: ScheduleEditor,
  partners: PartnersEditor,
  faq: FaqEditor,
  band: BandEditor,
  testimonials: TestimonialsEditor,
};
