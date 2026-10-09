import { SAFE_HTTPS_URL, WebsiteContent, WebsiteTheme } from "@/modules/websites/websites.types";

// Gera o HTML completo e autónomo de um site (um único ficheiro, CSS inline, sem
// JavaScript). Usado na página pública /s/{slug}, na pré-visualização do editor e
// no download. Todo o texto passa por `esc` — o conteúdo nunca é interpretado como HTML.

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function digits(value: string | undefined): string {
  return (value ?? "").replace(/[^\d+]/g, "");
}

// wa.me exige o número em formato internacional só com dígitos (ex: 258841234567).
function whatsappLink(raw: string | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 9 && /^8[2-7]/.test(d)) d = `258${d}`; // número moçambicano sem indicativo
  return `https://wa.me/${d}`;
}

function telLink(raw: string | undefined): string | null {
  const d = digits(raw);
  return d.length >= 6 ? `tel:${d}` : null;
}

function isEmail(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(value));
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const FONTS = {
  moderna: {
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
    heading: "'Plus Jakarta Sans', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  classica: {
    href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;500;600&display=swap",
    heading: "'Playfair Display', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
  },
} as const;

export interface RenderOptions {
  businessName: string;
  content: WebsiteContent;
  theme: WebsiteTheme;
  canonicalUrl?: string;
}

export function renderWebsiteHtml({ businessName, content, theme, canonicalUrl }: RenderOptions): string {
  const { hero, about, services, contact, seo, rating } = content;
  const font = FONTS[theme.font] ?? FONTS.moderna;
  const dark = theme.mode === "escuro";
  const primary = /^#[0-9a-fA-F]{6}$/.test(theme.primary) ? theme.primary : "#6d4aff";

  const wa = whatsappLink(contact.whatsapp);
  const tel = telLink(contact.phone);
  const mainCta = wa ?? tel;
  const mainCtaLabel = hero.ctaLabel || (wa ? "Falar no WhatsApp" : "Ligar agora");
  const year = new Date().getFullYear();
  const hasServices = services.items.length > 0;
  const hasAbout = about.text.trim().length > 0;
  const mapQuery = contact.showMap && contact.address ? encodeURIComponent(`${businessName}, ${contact.address}`) : null;
  const heroImage = hero.imageUrl && SAFE_HTTPS_URL.test(hero.imageUrl) ? hero.imageUrl : null;

  const contactItems: string[] = [];
  if (contact.phone && tel)
    contactItems.push(`<a class="c-item" href="${esc(tel)}"><span class="c-label">Telefone</span><span class="c-value">${esc(contact.phone)}</span></a>`);
  if (contact.whatsapp && wa)
    contactItems.push(`<a class="c-item" href="${esc(wa)}" target="_blank" rel="noopener"><span class="c-label">WhatsApp</span><span class="c-value">${esc(contact.whatsapp)}</span></a>`);
  if (isEmail(contact.email))
    contactItems.push(`<a class="c-item" href="mailto:${esc(contact.email)}"><span class="c-label">Email</span><span class="c-value">${esc(contact.email)}</span></a>`);
  if (contact.address)
    contactItems.push(`<div class="c-item"><span class="c-label">Morada</span><span class="c-value">${esc(contact.address)}</span></div>`);
  if (contact.hours)
    contactItems.push(`<div class="c-item"><span class="c-label">Horário</span><span class="c-value">${esc(contact.hours).replace(/\n/g, "<br>")}</span></div>`);

  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seo.title || businessName)}</title>
<meta name="description" content="${esc(seo.description || hero.subheadline)}">
<meta property="og:title" content="${esc(seo.title || businessName)}">
<meta property="og:description" content="${esc(seo.description || hero.subheadline)}">
${heroImage ? `<meta property="og:image" content="${esc(heroImage)}">` : ""}
${canonicalUrl ? `<link rel="canonical" href="${esc(canonicalUrl)}">` : ""}
<meta name="theme-color" content="${esc(primary)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${font.href}">
<style>
:root{--p:${primary};--bg:${dark ? "#0c0a09" : "#fafaf9"};--bg2:${dark ? "#1c1917" : "#ffffff"};--tx:${dark ? "#f5f5f4" : "#1c1917"};--mut:${dark ? "#a8a29e" : "#57534e"};--ln:${dark ? "rgba(255,255,255,.1)" : "rgba(28,25,23,.1)"};--ps:color-mix(in srgb,var(--p) ${dark ? 22 : 12}%,transparent);--hf:${font.heading};--bf:${font.body}}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--tx);font-family:var(--bf);font-size:17px;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 20px}
h1,h2,h3{font-family:var(--hf);line-height:1.15;letter-spacing:-.02em}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:14px 26px;font-weight:600;font-size:16px;transition:transform .15s,opacity .15s}
.btn:hover{transform:translateY(-1px);opacity:.92}
.btn-p{background:var(--p);color:#fff}
.btn-g{border:1px solid currentColor;opacity:.9}
header{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--ln)}
header .wrap{display:flex;align-items:center;justify-content:space-between;height:68px;gap:16px}
.brand{font-family:var(--hf);font-weight:700;font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
nav{display:flex;align-items:center;gap:28px;font-size:15px;color:var(--mut)}
nav a:hover{color:var(--tx)}
nav .btn{padding:10px 18px;font-size:14px;color:#fff}
.hero{position:relative;color:#fff;overflow:hidden;background:${
    heroImage
      ? `linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.65)),url("${heroImage}") center/cover no-repeat`
      : `radial-gradient(80% 90% at 85% 0%,color-mix(in srgb,var(--p) 70%,#fff) 0%,transparent 60%),linear-gradient(135deg,var(--p),color-mix(in srgb,var(--p) 55%,#000))`
  }}
.hero .wrap{padding-top:96px;padding-bottom:104px}
.hero h1{font-size:clamp(36px,6vw,64px);max-width:15ch}
.hero p.sub{margin-top:20px;font-size:clamp(17px,2.2vw,21px);max-width:46ch;opacity:.92}
.hero .actions{margin-top:36px;display:flex;flex-wrap:wrap;gap:12px}
.hero .btn-p{background:#fff;color:#111}
.rating{display:inline-flex;align-items:center;gap:8px;margin-bottom:22px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.16);font-size:14px;font-weight:500}
section.block{padding:88px 0}
.eyebrow{display:inline-block;margin-bottom:14px;color:var(--p);font-weight:600;font-size:14px;letter-spacing:.08em;text-transform:uppercase}
section h2{font-size:clamp(28px,4vw,40px)}
.about{display:grid;gap:32px}
.about .text p{margin-top:16px;color:var(--mut);font-size:18px;max-width:62ch}
.services{background:var(--bg2);border-top:1px solid var(--ln);border-bottom:1px solid var(--ln)}
.grid{margin-top:40px;display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.card{border:1px solid var(--ln);border-radius:22px;padding:28px;background:var(--bg)}
.card .n{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;background:var(--ps);color:var(--p);font-weight:700;font-family:var(--hf);margin-bottom:18px}
.card h3{font-size:20px}
.card p{margin-top:8px;color:var(--mut);font-size:16px}
.contact{display:grid;gap:36px}
.c-list{margin-top:28px;display:grid;gap:12px}
.c-item{display:flex;flex-direction:column;gap:2px;border:1px solid var(--ln);border-radius:18px;padding:16px 20px;background:var(--bg2)}
a.c-item:hover{border-color:var(--p)}
.c-label{font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
.c-value{font-weight:600;word-break:break-word}
.map{width:100%;min-height:320px;height:100%;border:0;border-radius:22px;background:var(--bg2)}
footer{border-top:1px solid var(--ln);padding:32px 0;color:var(--mut);font-size:14px}
footer .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px}
.wa-float{position:fixed;right:18px;bottom:18px;z-index:30;display:none;align-items:center;gap:8px;border-radius:999px;padding:14px 20px;background:#25d366;color:#fff;font-weight:600;box-shadow:0 10px 30px -8px rgba(0,0,0,.45)}
@media (min-width:860px){.about{grid-template-columns:1fr 1.4fr;align-items:start}.contact{grid-template-columns:1fr 1.2fr}}
@media (max-width:760px){nav a.lnk{display:none}.hero .wrap{padding-top:64px;padding-bottom:72px}section.block{padding:64px 0}.wa-float{display:inline-flex}.card{padding:22px}}
</style>
</head>
<body>
<header>
  <div class="wrap">
    <a class="brand" href="#topo">${esc(businessName)}</a>
    <nav>
      ${hasAbout ? `<a class="lnk" href="#sobre">Sobre</a>` : ""}
      ${hasServices ? `<a class="lnk" href="#servicos">Serviços</a>` : ""}
      <a class="lnk" href="#contacto">Contacto</a>
      ${mainCta ? `<a class="btn btn-p" href="${esc(mainCta)}"${wa ? ' target="_blank" rel="noopener"' : ""}>${esc(wa ? "WhatsApp" : "Ligar")}</a>` : ""}
    </nav>
  </div>
</header>

<main id="topo">
  <section class="hero">
    <div class="wrap">
      ${rating && rating.count > 0 ? `<span class="rating">★ ${esc(rating.value.toFixed(1))} no Google · ${esc(rating.count)} avaliações</span>` : ""}
      <h1>${esc(hero.headline)}</h1>
      ${hero.subheadline ? `<p class="sub">${esc(hero.subheadline)}</p>` : ""}
      <div class="actions">
        ${mainCta ? `<a class="btn btn-p" href="${esc(mainCta)}"${wa ? ' target="_blank" rel="noopener"' : ""}>${esc(mainCtaLabel)}</a>` : ""}
        ${hasServices ? `<a class="btn btn-g" href="#servicos">Ver serviços</a>` : `<a class="btn btn-g" href="#contacto">Contactos</a>`}
      </div>
    </div>
  </section>

  ${
    hasAbout
      ? `<section class="block" id="sobre">
    <div class="wrap about">
      <div><span class="eyebrow">Sobre nós</span><h2>${esc(about.title || businessName)}</h2></div>
      <div class="text">${paragraphs(about.text)}</div>
    </div>
  </section>`
      : ""
  }

  ${
    hasServices
      ? `<section class="block services" id="servicos">
    <div class="wrap">
      <span class="eyebrow">Serviços</span>
      <h2>${esc(services.title || "O que fazemos")}</h2>
      <div class="grid">
        ${services.items
          .map(
            (item, i) =>
              `<div class="card"><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(item.name)}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ""}</div>`
          )
          .join("")}
      </div>
    </div>
  </section>`
      : ""
  }

  <section class="block" id="contacto">
    <div class="wrap contact">
      <div>
        <span class="eyebrow">Contacto</span>
        <h2>Fale connosco</h2>
        <div class="c-list">${contactItems.join("")}</div>
      </div>
      ${
        mapQuery
          ? `<iframe class="map" title="Mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${mapQuery}&output=embed"></iframe>`
          : ""
      }
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <span>© ${year} ${esc(businessName)}</span>
    ${contact.address ? `<span>${esc(contact.address)}</span>` : ""}
  </div>
</footer>

${wa ? `<a class="wa-float" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
</body>
</html>`;
}
