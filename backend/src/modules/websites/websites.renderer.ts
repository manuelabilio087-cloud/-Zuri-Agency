import { createHash } from "crypto";
import { SAFE_HTTPS_URL, SiteKind, SiteStyle, WEEK_DAYS, WebsiteContent, WebsiteTheme } from "@/modules/websites/websites.types";

// Gera o HTML completo e autónomo de um site (um único ficheiro, CSS e JS inline).
// Usado na página pública /s/{slug}, na pré-visualização do editor e no download.
//
// Segurança: todo o texto do utilizador passa por `esc` (nunca é interpretado como
// HTML) e o único JavaScript da página é SITE_SCRIPT — uma constante nossa, autorizada
// por hash na CSP. Nenhum conteúdo do utilizador consegue executar código.

// ---------------------------------------------------------------------------
// Utilitários de texto
// ---------------------------------------------------------------------------
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

function safeUrl(url: string | undefined): string | null {
  return url && SAFE_HTTPS_URL.test(url) ? url : null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

// Palavras do título em spans, para a animação de entrada palavra a palavra.
function animatedWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => `<span class="w"><span style="--i:${i}">${esc(word)}</span></span>`)
    .join(" ");
}

// ---------------------------------------------------------------------------
// Cores — calculadas aqui para não depender de CSS moderno (color-mix) no browser
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

// t = peso da segunda cor (0 → a, 1 → b)
function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex([ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t]);
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Escurece (fundo claro) ou clareia (fundo escuro) a cor até ser legível como texto.
function readableOn(color: string, bg: string, dark: boolean): string {
  let out = color;
  for (let i = 1; i <= 10 && contrast(out, bg) < 4.5; i++) out = mix(color, dark ? "#ffffff" : "#000000", i * 0.1);
  return out;
}

function rotateHue(hex: string, degrees: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 0.08) return mix(hex, "#ffffff", 0.35); // cinzentos: gradiente para mais claro
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------
const FONTS: Record<SiteStyle, { href: string; heading: string; body: string }> = {
  elegante: {
    href: "https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap",
    heading: "'Playfair Display', Georgia, serif",
    body: "'Jost', system-ui, sans-serif",
  },
  moderno: {
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
    heading: "'Plus Jakarta Sans', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  vibrante: {
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Sora:wght@600;700;800&display=swap",
    heading: "'Sora', system-ui, sans-serif",
    body: "'DM Sans', system-ui, sans-serif",
  },
};

interface Palette {
  bg: string;
  bg2: string;
  surface: string;
  tx: string;
  mut: string;
}

const PALETTES: Record<SiteStyle, { claro: Palette; escuro: Palette }> = {
  elegante: {
    claro: { bg: "#faf7f2", bg2: "#f2ece3", surface: "#ffffff", tx: "#1f1a16", mut: "#6b6158" },
    escuro: { bg: "#100e0c", bg2: "#171411", surface: "#1d1915", tx: "#f3eee7", mut: "#a99f94" },
  },
  moderno: {
    claro: { bg: "#ffffff", bg2: "#f5f7fa", surface: "#ffffff", tx: "#0d1526", mut: "#596476" },
    escuro: { bg: "#090c13", bg2: "#0f131c", surface: "#141925", tx: "#eef2f7", mut: "#95a0b3" },
  },
  vibrante: {
    claro: { bg: "#fffdfb", bg2: "#f7f3ff", surface: "#ffffff", tx: "#16112a", mut: "#5d5672" },
    escuro: { bg: "#0d0a18", bg2: "#140f25", surface: "#1a142f", tx: "#f5f2ff", mut: "#a59dbf" },
  },
};

function themeVars(style: SiteStyle, theme: WebsiteTheme): string {
  const dark = theme.mode === "escuro";
  const p = /^#[0-9a-fA-F]{6}$/.test(theme.primary) ? theme.primary.toLowerCase() : "#6d4aff";
  const base = PALETTES[style][dark ? "escuro" : "claro"];
  // No vibrante, o fundo claro leva um toque da cor principal.
  const pal: Palette =
    style === "vibrante" && !dark ? { ...base, bg: mix("#ffffff", p, 0.025), bg2: mix("#ffffff", p, 0.07) } : base;
  const p2 = style === "vibrante" ? rotateHue(p, 42) : style === "moderno" ? rotateHue(p, 28) : mix(p, "#000000", 0.25);
  const onP = contrast("#ffffff", p) >= 3 ? "#ffffff" : "#111111";
  const pt = readableOn(p, pal.bg, dark);
  const heroBase =
    style === "elegante"
      ? `radial-gradient(110% 80% at 50% 0%,${mix(p, "#000000", 0.45)} 0%,${mix(p, "#000000", 0.78)} 55%,#0b0908 100%)`
      : style === "moderno"
        ? `radial-gradient(55% 65% at 88% 8%,${rgba(p, 0.55)},transparent 62%),radial-gradient(45% 55% at 5% 95%,${rgba(p2, 0.32)},transparent 60%),#080b14`
        : `linear-gradient(135deg,${p},${p2})`;
  return [
    `--p:${p}`,
    `--p2:${p2}`,
    `--onp:${onP}`,
    `--pt:${pt}`,
    `--p-soft:${rgba(p, dark ? 0.2 : 0.1)}`,
    `--p-glow:${rgba(p, 0.55)}`,
    `--grad:linear-gradient(135deg,${p},${p2})`,
    `--hero-base:${heroBase}`,
    `--bg:${pal.bg}`,
    `--bg2:${pal.bg2}`,
    `--surface:${pal.surface}`,
    `--tx:${pal.tx}`,
    `--mut:${pal.mut}`,
    `--ln:${dark ? "rgba(255,255,255,.09)" : rgba(pal.tx, 0.1)}`,
    `--nav-bg:${rgba(pal.bg, 0.86)}`,
    `--shadow:${dark ? "rgba(0,0,0,.65)" : rgba(mix(p, "#000000", 0.6), 0.28)}`,
    `--hf:${FONTS[style].heading}`,
    `--bf:${FONTS[style].body}`,
  ].join(";");
}

// CSS comum aos três estilos. Variáveis por estilo em STYLE_CSS.
const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--tx);font-family:var(--bf);font-size:17px;line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:hidden}
body.lock{overflow:hidden}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
button{font:inherit}
h1,h2,h3{font-family:var(--hf);font-weight:var(--hw);line-height:1.08;letter-spacing:var(--hls)}
.wrap{width:100%;max-width:1200px;margin:0 auto;padding:0 24px}
:focus-visible{outline:2px solid var(--p);outline-offset:3px}
.progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:70;pointer-events:none}
.progress span{display:block;height:100%;background:var(--grad);transform:scaleX(0);transform-origin:0 50%}
.btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:17px 30px;border-radius:var(--r-btn);font-weight:600;font-size:16px;line-height:1;white-space:nowrap;overflow:hidden;isolation:isolate;cursor:pointer;transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s,background-color .3s,color .3s,border-color .3s}
.btn svg{width:18px;height:18px;flex:none}
.btn:hover{transform:translateY(-3px)}
.btn-p{background:var(--p);color:var(--onp);box-shadow:0 14px 34px -14px var(--p-glow)}
.btn-p::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.38) 50%,transparent 75%);transform:translateX(-130%);transition:transform .9s}
.btn-p:hover::after{transform:translateX(130%)}
.btn-o{border:1px solid rgba(255,255,255,.4);color:#fff;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.btn-o:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.7)}
.btn-w{background:#fff;color:#111}
.nav{position:fixed;top:0;left:0;right:0;z-index:60;padding:14px 0;background:var(--nav-bg);color:var(--tx);box-shadow:0 1px 0 var(--ln);-webkit-backdrop-filter:saturate(1.6) blur(16px);backdrop-filter:saturate(1.6) blur(16px);transition:background-color .45s,box-shadow .45s,padding .45s,color .45s}
.js .nav:not(.solid){background:transparent;box-shadow:none;color:#fff;padding:24px 0;-webkit-backdrop-filter:none;backdrop-filter:none}
.nav-in{display:flex;align-items:center;justify-content:space-between;gap:20px}
.brand{display:flex;align-items:center;gap:12px;min-width:0;font-family:var(--hf);font-weight:var(--hw);font-size:21px;letter-spacing:var(--hls);line-height:1.1}
.brand-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.logo{flex:none;display:grid;place-items:center;height:46px;padding:5px 9px;border-radius:var(--r-logo);background:#fff;box-shadow:0 6px 18px -8px rgba(0,0,0,.35)}
.logo img{height:36px;width:auto;max-width:140px;object-fit:contain}
.mono{flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:var(--r-logo);background:var(--grad);color:#fff;font-size:16px;font-weight:700;letter-spacing:0}
.links{display:flex;align-items:center;gap:34px;font-size:15px;font-weight:500}
.links a:not(.btn){position:relative;opacity:.86;transition:opacity .25s}
.links a:not(.btn)::after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:1.5px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.links a:not(.btn):hover{opacity:1}
.links a:not(.btn):hover::after{transform:scaleX(1);transform-origin:left}
.links .btn{padding:13px 22px;font-size:14px}
.burger{display:none}
.hero{position:relative;min-height:100vh;min-height:100svh;display:flex;align-items:center;color:#fff;overflow:hidden;isolation:isolate;background:var(--hero-base)}
.hero-media{position:absolute;inset:-8% 0 0;z-index:-3;will-change:transform}
.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity 1.6s ease}
.hero-bg.on{opacity:1;animation:kb 12s cubic-bezier(.2,.6,.3,1) both}
.hero-shade{position:absolute;inset:0;z-index:-2}
.hero-in{position:relative;width:100%;padding-top:150px;padding-bottom:130px}
.hero h1{font-size:clamp(44px,7.4vw,96px);max-width:15ch}
.hero h1 .w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .07em .12em;margin:0 -.07em -.12em}
.hero h1 .w>span{display:inline-block;animation:rise 1.1s cubic-bezier(.2,.85,.25,1) both;animation-delay:calc(var(--i) * 75ms + .2s)}
.hero-sub{margin-top:28px;font-size:clamp(17px,1.9vw,21px);line-height:1.6;max-width:50ch;opacity:.88;animation:fadeUp 1.1s .65s both}
.hero-actions{margin-top:42px;display:flex;flex-wrap:wrap;gap:14px;animation:fadeUp 1.1s .85s both}
.chip{display:inline-flex;align-items:center;gap:10px;margin-bottom:30px;padding:9px 16px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:14px;font-weight:500;animation:fadeUp 1s .05s both}
.stars{color:#fbbf24;letter-spacing:2px;font-size:13px}
.scroll-cue{position:absolute;left:50%;bottom:32px;width:28px;height:46px;margin-left:-14px;border:2px solid rgba(255,255,255,.5);border-radius:20px;animation:fadeUp 1s 1.4s both}
.scroll-cue span{position:absolute;left:50%;top:9px;width:4px;height:9px;margin-left:-2px;border-radius:2px;background:#fff;animation:cue 1.9s infinite}
.sec{position:relative;padding:clamp(84px,11vw,144px) 0}
.eyebrow{display:inline-flex;align-items:center;gap:12px;margin-bottom:20px;font-size:13px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--pt)}
.eyebrow::before{content:"";width:30px;height:1px;background:currentColor}
.sec h2{font-size:clamp(34px,4.8vw,58px);max-width:20ch}
.sec-head{margin-bottom:clamp(44px,6vw,68px)}
.sec-head.center{text-align:center}
.sec-head.center h2{margin:0 auto}
.lead p{margin-top:18px;color:var(--mut);font-size:clamp(17px,1.5vw,19px);max-width:62ch}
.about-grid{display:grid;gap:clamp(44px,6vw,96px);align-items:center}
.about-media{position:relative;isolation:isolate}
.frame{position:relative;overflow:hidden;border-radius:var(--r-img);aspect-ratio:4/5;background:var(--bg2)}
.frame img{width:100%;height:100%;object-fit:cover;transform:scale(1.12);transition:transform 1.8s cubic-bezier(.2,.8,.2,1)}
.about-media.in .frame img,html:not(.js) .frame img{transform:scale(1)}
.stats{display:flex;flex-wrap:wrap;gap:18px 48px;margin-top:40px;padding-top:32px;border-top:1px solid var(--ln)}
.stat b{display:block;font-family:var(--hf);font-weight:var(--hw);font-size:clamp(38px,4vw,52px);line-height:1;letter-spacing:var(--hls)}
.stat span{display:block;margin-top:10px;font-size:14px;color:var(--mut)}
.services{background:var(--bg2)}
.cards{display:grid;gap:24px;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))}
.cards>.reveal{display:flex}
.card{position:relative;display:flex;flex-direction:column;width:100%;overflow:hidden;isolation:isolate;background:var(--surface);border:1px solid var(--ln);border-radius:var(--r-card);transition:transform .6s cubic-bezier(.2,.8,.2,1),box-shadow .6s,border-color .6s}
.card::before{content:"";position:absolute;inset:0;z-index:-1;opacity:0;background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),var(--p-soft),transparent 45%);transition:opacity .5s}
.card:hover{transform:translateY(-10px);box-shadow:0 34px 70px -34px var(--shadow)}
.card:hover::before{opacity:1}
.card .bar{position:absolute;left:0;top:0;z-index:2;height:3px;width:100%;background:var(--grad);transform:scaleX(0);transform-origin:left;transition:transform .7s cubic-bezier(.2,.8,.2,1)}
.card:hover .bar{transform:scaleX(1)}
.card-media{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--grad)}
.card-media img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
.card:hover .card-media img{transform:scale(1.08)}
.card-media.ph{display:grid;place-items:center;color:rgba(255,255,255,.92);font-family:var(--hf);font-size:72px;font-weight:var(--hw)}
.card-body{display:flex;flex-direction:column;gap:12px;flex:1;padding:32px}
.card-num{font-family:var(--hf);font-size:14px;font-weight:700;letter-spacing:.12em;color:var(--pt)}
.card h3{font-size:clamp(21px,1.9vw,25px)}
.card p{color:var(--mut);font-size:16px;line-height:1.65}
.t-grid{display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr))}
.t-grid>.reveal{display:flex}
.t-card{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:30px;width:100%;padding:38px;border-radius:var(--r-card);background:var(--surface);border:1px solid var(--ln);transition:transform .6s cubic-bezier(.2,.8,.2,1),box-shadow .6s}
.t-card:hover{transform:translateY(-6px);box-shadow:0 30px 60px -34px var(--shadow)}
.t-q{width:42px;height:42px;color:var(--pt)}
.t-card blockquote{font-size:clamp(17px,1.6vw,19px);line-height:1.7}
.t-card figcaption{display:flex;align-items:center;gap:14px}
.av{flex:none;display:grid;place-items:center;width:50px;height:50px;border-radius:50%;background:var(--grad);color:#fff;font-weight:700;font-size:16px}
.t-card figcaption b{display:block;font-size:16px;line-height:1.3}
.t-card figcaption small{display:block;margin-top:2px;color:var(--mut);font-size:14px}
.cta{padding:clamp(84px,10vw,128px) 0}
.testi+.cta{padding-top:0}
main{overflow:hidden}
.nav .brand{position:relative;z-index:2}
.cta-box{position:relative;overflow:hidden;isolation:isolate;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:30px;padding:clamp(48px,7vw,92px) clamp(28px,6vw,84px);border-radius:var(--r-cta);background:var(--hero-base);color:#fff}
.cta-box::before,.cta-box::after{content:"";position:absolute;z-index:-1;border-radius:50%;filter:blur(10px)}
.cta-box::before{width:420px;height:420px;right:-120px;top:-180px;background:radial-gradient(circle,${"rgba(255,255,255,.22)"},transparent 65%);animation:drift 14s ease-in-out infinite alternate}
.cta-box::after{width:300px;height:300px;left:-100px;bottom:-160px;background:radial-gradient(circle,var(--p-glow),transparent 65%);animation:drift 18s ease-in-out infinite alternate-reverse}
.cta-box h2{font-size:clamp(30px,4.2vw,50px);max-width:17ch}
.cta-box p{margin-top:14px;max-width:46ch;opacity:.85;font-size:18px}
.contact-grid{display:grid;gap:clamp(36px,5vw,72px);align-items:stretch}
.c-list{display:grid;gap:14px}
.c-item{display:flex;align-items:center;gap:18px;padding:20px 22px;border-radius:var(--r-item);background:var(--surface);border:1px solid var(--ln);transition:transform .45s cubic-bezier(.2,.8,.2,1),border-color .45s,box-shadow .45s}
a.c-item:hover{transform:translateX(8px);border-color:var(--p);box-shadow:0 18px 40px -26px var(--shadow)}
.c-ic{flex:none;display:grid;place-items:center;width:50px;height:50px;border-radius:var(--r-ic);background:var(--p-soft);color:var(--pt)}
.c-ic svg{width:22px;height:22px}
.c-label{display:block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.c-value{display:block;margin-top:3px;font-weight:600;font-size:17px;line-height:1.45;word-break:break-word}
.map{position:relative;min-height:400px;overflow:hidden;border-radius:var(--r-card);border:1px solid var(--ln);background:var(--bg2)}
.map iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.m-escuro .map iframe{filter:invert(.9) hue-rotate(180deg) saturate(.7) brightness(.95)}
.foot{padding:64px 0 40px;border-top:1px solid var(--ln)}
.foot-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px}
.foot-links{display:flex;flex-wrap:wrap;gap:12px 28px;color:var(--mut);font-size:15px}
.foot-links a:hover{color:var(--tx)}
.foot-bottom{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:40px;padding-top:26px;border-top:1px solid var(--ln);color:var(--mut);font-size:14px}
.wa-float{position:fixed;right:22px;bottom:22px;z-index:50;display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:#25d366;color:#fff;isolation:isolate;box-shadow:0 16px 34px -12px rgba(37,211,102,.75);transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .5s}
.wa-float svg{width:30px;height:30px}
.wa-float::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:50%;background:#25d366;animation:pulse 2.6s infinite}
.wa-float:hover{transform:scale(1.08)}
.js .wa-float:not(.show){opacity:0;transform:translateY(24px) scale(.8);pointer-events:none}
.js .reveal{opacity:0;transform:translateY(40px);transition:opacity 1.1s cubic-bezier(.2,.8,.2,1),transform 1.1s cubic-bezier(.2,.8,.2,1);transition-delay:calc(var(--d,0) * 120ms)}
.js .reveal.in{opacity:1;transform:none}
.restore .reveal,.restore .frame img{transition:none!important}
.restore .hero,.restore .hero *{animation:none!important}
@keyframes kb{from{transform:scale(1.16)}to{transform:scale(1)}}
@keyframes rise{from{transform:translateY(110%)}to{transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
@keyframes cue{0%{opacity:0;transform:translateY(0)}30%{opacity:1}100%{opacity:0;transform:translateY(15px)}}
@keyframes pulse{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.9);opacity:0}}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(-60px,50px)}}
@keyframes float{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-50px) scale(1.08)}66%{transform:translate(-30px,30px) scale(.94)}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (min-width:900px){
.about-grid.has-img{grid-template-columns:1fr 1.05fr}
.about-grid.no-img{grid-template-columns:1fr 1.25fr;align-items:start}
.contact-grid.has-map{grid-template-columns:1fr 1.15fr}
}
@media (max-width:899px){
.burger{position:relative;z-index:2;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;cursor:pointer}
.burger span{position:absolute;width:18px;height:2px;border-radius:2px;background:currentColor;transition:transform .4s cubic-bezier(.2,.8,.2,1)}
.burger span:first-child{transform:translateY(-4px)}
.burger span:last-child{transform:translateY(4px)}
.nav.open .burger span:first-child{transform:rotate(45deg)}
.nav.open .burger span:last-child{transform:rotate(-45deg)}
.links{position:fixed;inset:0;z-index:1;flex-direction:column;justify-content:center;gap:28px;padding:96px 24px 40px;background:var(--bg);color:var(--tx);font-family:var(--hf);font-size:32px;font-weight:var(--hw);letter-spacing:var(--hls);text-transform:none;opacity:0;visibility:hidden;transition:opacity .45s,visibility .45s}
.links a:not(.btn){opacity:0;transform:translateY(18px);transition:opacity .5s,transform .5s cubic-bezier(.2,.8,.2,1)}
.links a:not(.btn)::after{display:none}
.links .btn{margin-top:12px;font-family:var(--bf);font-size:16px;letter-spacing:0;text-transform:none}
.nav.open .links{opacity:1;visibility:visible}
.nav.open .links a:not(.btn){opacity:1;transform:none}
.nav.open .links a:nth-child(2){transition-delay:.06s}
.nav.open .links a:nth-child(3){transition-delay:.12s}
.nav.open .links a:nth-child(4){transition-delay:.18s}
.js .nav.open{color:var(--tx);-webkit-backdrop-filter:none;backdrop-filter:none}
html:not(.js) .burger,html:not(.js) .links a:not(.btn){display:none}
html:not(.js) .links{position:static;opacity:1;visibility:visible;padding:0;background:none}
.nav .brand{font-size:19px}
}
@media (max-width:640px){
.wrap{padding:0 20px}
body{font-size:16px}
.hero-in{padding-top:128px;padding-bottom:116px}
.hero-actions .btn{flex:1 1 auto}
.btn{padding:16px 22px}
.card-body{padding:26px}
.t-card{padding:28px}
.c-item{padding:16px 18px;gap:14px}
.c-ic{width:44px;height:44px}
.map{min-height:300px}
.wa-float{right:16px;bottom:16px;width:56px;height:56px}
.logo{height:40px}.logo img{height:30px;max-width:110px}
}
@media (prefers-reduced-motion:reduce){
*,*::before,*::after{animation:none!important;transition:none!important}
html{scroll-behavior:auto}
.js .reveal{opacity:1;transform:none}
.frame img{transform:none}
}
`;

const STYLE_CSS: Record<SiteStyle, string> = {
  // Elegante: serifa, marfim e dourado, linhas finas, tudo centrado e calmo.
  elegante: `
:root{--hw:500;--hls:-.01em;--r-btn:2px;--r-card:4px;--r-img:400px 400px 6px 6px;--r-logo:6px;--r-cta:6px;--r-item:4px;--r-ic:50%}
@media (min-width:900px){.links{font-size:13px;letter-spacing:.16em;text-transform:uppercase}}
.btn{text-transform:uppercase;letter-spacing:.16em;font-size:13px;padding:19px 34px}
.hero-in{text-align:center;display:flex;flex-direction:column;align-items:center}
.hero h1{margin:0 auto;max-width:17ch}
.hero h1 .w:last-child>span{font-style:italic}
.hero-sub{margin-left:auto;margin-right:auto}
.hero-actions{justify-content:center}
.hero-shade{background:linear-gradient(180deg,rgba(12,9,7,.62) 0%,rgba(12,9,7,.38) 42%,rgba(12,9,7,.8) 100%)}
.hero::after{content:"";position:absolute;inset:22px;z-index:-1;border:1px solid rgba(255,255,255,.18);pointer-events:none}
.sec h2{font-weight:500}
.eyebrow{letter-spacing:.3em;font-size:12px}
.sec-head.center .eyebrow::after{content:"";width:30px;height:1px;background:currentColor}
.about-media::before{content:"";position:absolute;inset:26px -26px -26px 26px;z-index:-1;border:1px solid var(--p);border-radius:inherit;border-radius:400px 400px 6px 6px;opacity:.55}
.about-grid.no-img{grid-template-columns:1fr!important;text-align:center;justify-items:center}
.about-grid.no-img .lead p{margin-left:auto;margin-right:auto}
.about-grid.no-img .stats{justify-content:center}
.about-grid.no-img .eyebrow::after{content:"";width:30px;height:1px;background:currentColor}
.card{border-color:var(--ln);background:var(--surface)}
.card:hover{border-color:var(--p)}
.card-body{text-align:center;align-items:center}
.card-num{font-family:var(--hf);font-style:italic;font-weight:500;font-size:20px;letter-spacing:0}
.card-num::after{content:"";display:block;width:24px;height:1px;margin:14px auto 0;background:var(--p)}
.card h3{font-weight:500}
.testi .t-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))}
.t-card{text-align:center;align-items:center;background:transparent;border-color:var(--ln)}
.t-card blockquote{font-family:var(--hf);font-style:italic;font-size:clamp(19px,1.9vw,23px);line-height:1.55}
.t-card figcaption{flex-direction:column;gap:10px}
.av{background:transparent;border:1px solid var(--p);color:var(--pt);font-family:var(--hf)}
.cta-box{text-align:center;justify-content:center;align-items:center;flex-direction:column}
.cta-box h2,.cta-box p{margin-left:auto;margin-right:auto}
.cta-box::before{border-radius:0}
.c-ic{background:transparent;border:1px solid var(--p)}
.mono{background:transparent;border:1px solid currentColor;color:inherit;font-family:var(--hf);font-weight:500;font-style:italic;font-size:18px}
@media (max-width:640px){.hero::after{inset:10px}.about-media::before{inset:16px -12px -16px 12px}}
`,
  // Moderno: sem serifa forte, cantos arredondados, brilhos e grelha subtil.
  moderno: `
:root{--hw:800;--hls:-.035em;--r-btn:14px;--r-card:24px;--r-img:30px;--r-logo:12px;--r-cta:32px;--r-item:18px;--r-ic:14px}
.hero-shade{background:linear-gradient(90deg,rgba(6,9,18,.88) 0%,rgba(6,9,18,.62) 45%,rgba(6,9,18,.2) 100%),linear-gradient(0deg,rgba(6,9,18,.7),transparent 40%)}
.hero::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(70% 60% at 70% 30%,#000,transparent 75%);mask-image:radial-gradient(70% 60% at 70% 30%,#000,transparent 75%)}
.hero-glow{position:absolute;z-index:-1;width:520px;height:520px;right:-120px;top:10%;border-radius:50%;background:radial-gradient(circle,var(--p-glow),transparent 65%);filter:blur(20px);animation:float 16s ease-in-out infinite}
.hero h1 .w:last-child>span{background:linear-gradient(90deg,#fff,${"rgba(255,255,255,.62)"});-webkit-background-clip:text;background-clip:text;color:transparent}
.eyebrow{padding:8px 15px;border-radius:999px;background:var(--p-soft);letter-spacing:.1em;font-size:12.5px}
.eyebrow::before{width:7px;height:7px;border-radius:50%;background:var(--p);box-shadow:0 0 0 4px var(--p-soft)}
.about-media .frame{box-shadow:0 40px 80px -40px var(--shadow)}
.about-media::after{content:"";position:absolute;z-index:-1;width:62%;height:62%;right:-22px;bottom:-22px;border-radius:var(--r-img);background:var(--grad);opacity:.9}
.card:hover{border-color:transparent}
.card-num{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:var(--p-soft);font-size:16px;letter-spacing:0;margin-bottom:6px}
.t-card::after{content:"";position:absolute;inset:-1px;z-index:-1;border-radius:inherit;background:var(--grad);opacity:0;transition:opacity .6s}
.t-card{isolation:isolate;background-clip:padding-box}
.t-card:hover::after{opacity:1}
.cta-box::before{background:radial-gradient(circle,var(--p-glow),transparent 65%)}
`,
  // Vibrante: gradientes animados, formas a flutuar, tipografia pesada e faixa em movimento.
  vibrante: `
:root{--hw:800;--hls:-.03em;--r-btn:999px;--r-card:28px;--r-img:34px;--r-logo:14px;--r-cta:36px;--r-item:22px;--r-ic:16px}
.btn-p{background:var(--grad);color:#fff;background-size:160% 160%;transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s,background-position .6s}
.btn-p:hover{background-position:100% 0;box-shadow:0 20px 44px -16px var(--p-glow)}
.hero .btn-p,.cta-box .btn-p{background:#fff;color:var(--p)}
.hero-shade{background:linear-gradient(135deg,${"var(--shade-a)"},${"var(--shade-b)"}),rgba(0,0,0,.18)}
.blob{position:absolute;z-index:-1;border-radius:50%;filter:blur(60px);opacity:.75;animation:float 18s ease-in-out infinite}
.blob.b1{width:46vw;height:46vw;max-width:620px;max-height:620px;left:-10%;top:-12%;background:var(--p2)}
.blob.b2{width:38vw;height:38vw;max-width:520px;max-height:520px;right:-8%;bottom:-14%;background:var(--p);animation-delay:-6s;animation-duration:22s}
.blob.b3{width:22vw;height:22vw;max-width:300px;max-height:300px;right:28%;top:18%;background:#ffffff;opacity:.18;animation-delay:-11s}
.hero h1{max-width:14ch}
.chip{background:rgba(255,255,255,.18)}
.eyebrow{padding:8px 16px;border-radius:999px;background:var(--grad);color:#fff;letter-spacing:.1em;font-size:12.5px}
.eyebrow::before{display:none}
.sec h2{font-weight:800}
.marquee{overflow:hidden;background:var(--tx);color:var(--bg);padding:22px 0;transform:rotate(-1.2deg) scale(1.02);margin:-14px 0 0;position:relative;z-index:2}
.marquee .track{display:flex;width:max-content;gap:0;animation:marquee 32s linear infinite}
.marquee span{display:inline-flex;align-items:center;gap:34px;padding-right:34px;font-family:var(--hf);font-weight:700;font-size:clamp(20px,2.6vw,30px);letter-spacing:-.02em;white-space:nowrap}
.marquee i{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.about-media .frame{transform:rotate(-2.5deg);transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.about-media:hover .frame{transform:rotate(0)}
.about-media::before{content:"";position:absolute;inset:-14px;z-index:-1;border-radius:calc(var(--r-img) + 12px);background:var(--grad);opacity:.95;transform:rotate(3deg)}
.card{border:1px solid var(--ln)}
.card::after{content:"";position:absolute;inset:0;z-index:-2;border-radius:inherit;padding:2px;background:var(--grad);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .6s}
.card:hover{transform:translateY(-12px) rotate(-.6deg);border-color:transparent}
.card:hover::after{opacity:1}
.card-num{display:grid;place-items:center;width:54px;height:54px;border-radius:18px;background:var(--grad);color:#fff;font-size:16px;letter-spacing:0;margin-bottom:6px;box-shadow:0 12px 26px -12px var(--p-glow)}
.t-card{background:var(--surface)}
.t-q{color:var(--p2)}
.cta-box{background:var(--grad)}
.cta-box::before{background:radial-gradient(circle,rgba(255,255,255,.35),transparent 65%)}
.cta-box::after{background:radial-gradient(circle,rgba(255,255,255,.2),transparent 65%)}
.mono{border-radius:50%}
@media (max-width:640px){.about-media::before{inset:-8px;transform:rotate(2deg)}.about-media .frame{transform:rotate(-1.5deg)}}
`,
};

// ---------------------------------------------------------------------------
// CSS das secções por tipo de negócio, do topo com galeria e das imagens em movimento
// ---------------------------------------------------------------------------
const SECTIONS_CSS = `
.hero-dots{position:absolute;right:32px;bottom:36px;z-index:2;display:flex;gap:8px}
.hero-dots i{position:relative;display:block;width:30px;height:3px;border-radius:2px;background:rgba(255,255,255,.3);overflow:hidden}
.hero-dots i.on::after{content:"";position:absolute;inset:0;background:#fff;transform-origin:left;animation:dotfill 6s linear forwards}
@keyframes dotfill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.rot{position:relative;display:block;align-self:stretch;width:100%;height:1.45em;margin-top:22px;overflow:hidden;font-family:var(--hf);font-weight:var(--hw);font-size:clamp(20px,2.4vw,30px);letter-spacing:var(--hls);animation:fadeUp 1.1s .55s both}
.rot-i{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:14px;white-space:nowrap;opacity:0;transform:translateY(100%);transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .7s}
.rot-i::before{content:"";flex:none;width:10px;height:10px;border-radius:2px;background:var(--grad);transform:rotate(45deg);box-shadow:0 0 14px var(--p-glow)}
.rot-i.on,html:not(.js) .rot-i:first-child{opacity:1;transform:none}
.rot-i.out{opacity:0;transform:translateY(-100%)}
.s-elegante .rot-i{justify-content:center;font-style:italic}
.hero-light{position:absolute;z-index:-1;left:50%;top:-30%;width:120vw;height:90vh;transform:translateX(-50%);background:radial-gradient(50% 50% at 50% 50%,rgba(255,214,140,.32),transparent 70%);animation:breathe 7s ease-in-out infinite alternate}
@keyframes breathe{from{opacity:.55;transform:translateX(-50%) scale(1)}to{opacity:1;transform:translateX(-50%) scale(1.12)}}
.sparks{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
.sparks span{position:absolute;bottom:-30px;left:var(--x);width:var(--s);height:var(--s);border-radius:50%;background:radial-gradient(circle,rgba(255,226,170,.95),rgba(255,214,140,0) 70%);opacity:0;animation:spark var(--t) linear infinite;animation-delay:var(--dl)}
@keyframes spark{0%{transform:translate3d(0,0,0);opacity:0}15%{opacity:.9}100%{transform:translate3d(var(--dx),-115vh,0);opacity:0}}
.blob{position:absolute;z-index:-1;border-radius:50%;filter:blur(70px);opacity:.5;animation:float 18s ease-in-out infinite}
.blob.b1{width:46vw;height:46vw;max-width:620px;max-height:620px;left:-10%;top:-12%;background:var(--p2)}
.blob.b2{width:38vw;height:38vw;max-width:520px;max-height:520px;right:-8%;bottom:-14%;background:var(--p);animation-delay:-6s;animation-duration:22s}
.blob.b3{width:22vw;height:22vw;max-width:300px;max-height:300px;right:28%;top:18%;background:#ffffff;opacity:.12;animation-delay:-11s}
.frame .pz,.hl-frame .pz{position:absolute;inset:-9% 0;transform:translate3d(0,var(--py,0px),0);will-change:transform}
.frame .pz img,.hl-frame .pz img{width:100%;height:100%;object-fit:cover}
.band{position:relative;display:flex;align-items:center;justify-content:center;min-height:360px;height:min(76vh,640px);overflow:hidden;isolation:isolate;color:#fff}
.band-img{position:absolute;left:0;right:0;top:-16%;bottom:-16%;z-index:-2;background-size:cover;background-position:center;transform:translate3d(0,var(--py,0px),0) scale(1.04);will-change:transform}
.band-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.55))}
.band-text{max-width:22ch;margin:0 auto;padding:0 24px;text-align:center;font-family:var(--hf);font-weight:var(--hw);font-size:clamp(28px,4.4vw,58px);line-height:1.15;letter-spacing:var(--hls);text-shadow:0 6px 30px rgba(0,0,0,.35)}
.s-elegante .band-text{font-style:italic}
.hl-grid{display:grid;gap:clamp(40px,6vw,96px);align-items:center}
.hl-media{position:relative}
.hl-frame{display:block;position:relative;overflow:hidden;aspect-ratio:5/4;border-radius:var(--r-card);background:var(--bg2);box-shadow:0 40px 80px -40px var(--shadow)}
.hl-frame img{transform:scale(1.1);transition:transform 1.8s cubic-bezier(.2,.8,.2,1)}
.hl-media.in .hl-frame img,html:not(.js) .hl-frame img{transform:scale(1)}
.hl-price{position:absolute;right:-12px;top:26px;z-index:2;padding:14px 22px;border-radius:999px;background:var(--grad);color:#fff;font-family:var(--hf);font-weight:800;font-size:clamp(18px,2vw,24px);box-shadow:0 18px 36px -14px var(--p-glow);animation:bob 4s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0) rotate(4deg)}50%{transform:translateY(-8px) rotate(4deg)}}
.hl-desc{margin-top:18px;color:var(--mut);font-size:clamp(17px,1.5vw,19px);max-width:52ch}
.hl-cta{margin-top:30px;display:flex;flex-wrap:wrap;align-items:center;gap:18px}
.hl-cta .big{font-family:var(--hf);font-weight:800;font-size:30px;color:var(--pt)}
.hl-grid.no-img{grid-template-columns:1fr!important;text-align:center;justify-items:center}
.hl-grid.no-img .hl-desc{margin-left:auto;margin-right:auto}
.hl-grid.no-img .hl-cta{justify-content:center}
.tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:-14px 0 34px}
.tab{appearance:none;cursor:pointer;padding:11px 20px;border-radius:999px;border:1px solid var(--ln);background:var(--surface);color:var(--tx);font:600 15px var(--bf);transition:background-color .3s,color .3s,box-shadow .3s,transform .3s}
.tab:hover{transform:translateY(-2px)}
.tab.on{background:var(--p);color:var(--onp);border-color:transparent;box-shadow:0 12px 26px -12px var(--p-glow)}
.panel-title{font-family:var(--hf);font-weight:var(--hw);font-size:24px;margin:30px 0 6px;color:var(--pt)}
.js .panels.multi .panel{display:none}
.js .panels.multi .panel.on{display:block;animation:fadeUp .6s cubic-bezier(.2,.8,.2,1) both}
.js .panels.multi .panel-title{display:none}
.m-list{display:grid;gap:0 56px}
.m-item{display:flex;gap:18px;align-items:flex-start;padding:20px 0;border-bottom:1px solid var(--ln)}
.m-thumb{flex:none;display:block;width:86px;height:86px;border-radius:var(--r-item);overflow:hidden;background:var(--bg2)}
.m-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.m-item:hover .m-thumb img{transform:scale(1.1)}
.m-body{flex:1;min-width:0}
.m-top{display:flex;align-items:baseline;gap:10px}
.m-top h4{font-family:var(--hf);font-weight:var(--hw);font-size:20px;line-height:1.3;letter-spacing:var(--hls)}
.m-dots{flex:1;min-width:16px;border-bottom:2px dotted var(--ln);transform:translateY(-5px)}
.m-price{flex:none;font-family:var(--hf);font-weight:800;font-size:19px;color:var(--pt);white-space:nowrap}
.m-body p{margin-top:5px;font-size:15px;line-height:1.55;color:var(--mut)}
.m-detail{display:inline-flex;align-items:center;gap:6px;margin-top:9px;padding:4px 11px;border-radius:999px;background:var(--p-soft);color:var(--pt);font-size:13px;font-weight:600}
.g-grid{columns:3 260px;column-gap:16px}
.g-item{position:relative;display:block;margin-bottom:16px;break-inside:avoid;overflow:hidden;border-radius:var(--r-item);background:var(--bg2);cursor:zoom-in}
.g-item img{width:100%;height:auto;transition:transform 1s cubic-bezier(.2,.8,.2,1)}
.g-item:hover img{transform:scale(1.07)}
.g-cap{position:absolute;left:0;right:0;bottom:0;padding:34px 16px 14px;background:linear-gradient(0deg,rgba(0,0,0,.65),transparent);color:#fff;font-size:14px;font-weight:600;opacity:0;transform:translateY(8px);transition:opacity .4s,transform .4s}
.g-item:hover .g-cap{opacity:1;transform:none}
.tm-grid{display:grid;gap:26px;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))}
.tm-photo{position:relative;display:grid;place-items:center;aspect-ratio:4/5;overflow:hidden;border-radius:var(--r-card);background:var(--grad);color:#fff;font-family:var(--hf);font-weight:var(--hw);font-size:56px}
.tm-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform 1s cubic-bezier(.2,.8,.2,1)}
.tm:hover .tm-photo img{transform:scale(1.06)}
.tm figcaption{margin-top:16px}
.tm b{display:block;font-family:var(--hf);font-weight:var(--hw);font-size:19px;letter-spacing:var(--hls)}
.tm span{display:block;margin-top:3px;font-size:15px;color:var(--mut)}
.s-elegante .tm{text-align:center}
.pl-grid{display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));align-items:stretch}
.pl-grid>.reveal{display:flex}
.plan{position:relative;display:flex;flex-direction:column;gap:18px;width:100%;padding:36px 30px 30px;border-radius:var(--r-card);background:var(--surface);border:1px solid var(--ln);transition:transform .5s cubic-bezier(.2,.8,.2,1),box-shadow .5s}
.plan:hover{transform:translateY(-8px);box-shadow:0 30px 60px -32px var(--shadow)}
.plan.feat{border:2px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,var(--grad) border-box;box-shadow:0 34px 70px -34px var(--p-glow)}
.plan.feat::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);background-size:260% 100%;animation:shine 4.5s ease-in-out infinite}
@keyframes shine{from{background-position:130% 0}to{background-position:-130% 0}}
.pl-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);padding:7px 15px;border-radius:999px;background:var(--grad);color:#fff;font:700 12px var(--bf);letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
.plan h3{font-size:22px}
.pl-price b{font-family:var(--hf);font-weight:800;font-size:clamp(34px,3.4vw,44px);letter-spacing:-.03em}
.pl-price span{margin-left:6px;color:var(--mut);font-size:15px}
.plan ul{list-style:none;display:grid;gap:11px;flex:1}
.plan li{display:flex;gap:10px;align-items:flex-start;font-size:15.5px;line-height:1.5}
.plan li svg{flex:none;width:20px;height:20px;margin-top:2px;color:var(--pt)}
.plan .btn{width:100%}
.btn-ghost{border:1px solid var(--ln);color:var(--tx)}
.btn-ghost:hover{border-color:var(--p)}
.sc-grid{display:grid;gap:14px;grid-template-columns:repeat(var(--cols),minmax(0,1fr))}
.sc-day{padding:20px 16px;border-radius:var(--r-card);background:var(--surface);border:1px solid var(--ln)}
.sc-day h4{font:700 13px var(--bf);letter-spacing:.16em;text-transform:uppercase;color:var(--pt);margin-bottom:6px}
.sc-cls{margin-top:10px;padding:12px 14px;border-radius:var(--r-item);background:var(--p-soft);transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.sc-cls:hover{transform:translateX(4px)}
.sc-cls b{display:block;font-family:var(--hf);font-weight:var(--hw);font-size:17px}
.sc-cls span{display:block;margin-top:2px;font-size:14px;color:var(--mut)}
.partners{padding:clamp(56px,7vw,96px) 0}
.pt-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
.pt-chip{display:inline-flex;align-items:center;gap:10px;padding:13px 20px;border-radius:999px;background:var(--surface);border:1px solid var(--ln);font-weight:600;font-size:15.5px;transition:transform .35s,border-color .35s}
.pt-chip:hover{transform:translateY(-3px);border-color:var(--p)}
.pt-chip svg{width:18px;height:18px;color:var(--pt)}
.faq-list{max-width:840px;margin:0 auto;display:grid;gap:12px}
.qa{padding:0 24px;border-radius:var(--r-item);background:var(--surface);border:1px solid var(--ln);transition:border-color .3s}
.qa[open]{border-color:var(--p)}
.qa summary{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:20px 0;font-weight:600;font-size:17px;cursor:pointer;list-style:none}
.qa summary::-webkit-details-marker{display:none}
.qa-ic{position:relative;flex:none;width:22px;height:22px}
.qa-ic::before,.qa-ic::after{content:"";position:absolute;left:4px;right:4px;top:10px;height:2px;border-radius:2px;background:var(--pt);transition:transform .35s,opacity .35s}
.qa-ic::after{transform:rotate(90deg)}
.qa[open] .qa-ic::after{transform:rotate(0);opacity:0}
.qa-a{padding:0 0 22px;color:var(--mut);line-height:1.7}
.qa[open] .qa-a{animation:fadeUp .45s cubic-bezier(.2,.8,.2,1) both}
.lb{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:60px 70px;background:rgba(8,6,14,.92);opacity:0;visibility:hidden;transition:opacity .35s,visibility .35s}
.lb.open{opacity:1;visibility:visible}
.lb figure{max-width:min(1100px,100%);max-height:100%;text-align:center}
.lb img{max-width:100%;max-height:78vh;border-radius:10px;box-shadow:0 30px 80px rgba(0,0,0,.5);transform:scale(.94);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.lb.open img{transform:none}
.lb p{margin-top:14px;color:#ddd;font-size:15px}
.lb button{position:absolute;display:grid;place-items:center;width:52px;height:52px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:30px;line-height:1;cursor:pointer}
.lb button:hover{background:rgba(255,255,255,.24)}
.lb-x{top:18px;right:18px}.lb-p{left:16px;top:50%;margin-top:-26px}.lb-nx{right:16px;top:50%;margin-top:-26px}
.lb-n{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#aaa;font-size:13px}
@media (min-width:900px){.hl-grid{grid-template-columns:1.1fr 1fr}.m-list.two{grid-template-columns:1fr 1fr}}
@media (max-width:899px){.sc-grid{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(200px,72%);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}.sc-day{scroll-snap-align:start}}
@media (max-width:640px){.hero-dots{right:20px;bottom:24px}.tabs{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;margin-left:-20px;margin-right:-20px;padding:0 20px 6px;scrollbar-width:none}.tab{flex:none}.m-thumb{width:70px;height:70px}.m-top h4{font-size:18px}.hl-price{right:8px}.lb{padding:60px 12px}.lb-p,.lb-nx{top:auto;bottom:16px;margin:0}.lb-p{left:calc(50% - 64px)}.lb-nx{right:calc(50% - 64px)}.band{height:62vh}.g-grid{columns:2 140px;column-gap:10px}.g-item{margin-bottom:10px}.g-cap{opacity:1;transform:none;font-size:12.5px;padding:24px 10px 9px}}
@media (prefers-reduced-motion:reduce){.band-img,.frame .pz,.hl-frame .pz{transform:none!important}.rot-i{transition:none}}
`;

// ---------------------------------------------------------------------------
// JavaScript da página (constante — autorizado pela CSP através do hash).
// Animações de entrada, topo e imagens que se movem ao deslizar, galeria no topo,
// frases rotativas, separadores do menu, fotos em ecrã inteiro, menu do telemóvel,
// barra de progresso, contadores e brilho que segue o rato.
// ---------------------------------------------------------------------------
const SITE_SCRIPT = `(function(){var d=document,h=d.documentElement,w=window;h.classList.add("js");
var rm=w.matchMedia&&w.matchMedia("(prefers-reduced-motion: reduce)").matches;
var isPv=/^zp:\\d+$/.test(w.name||""),pv=isPv?parseInt(w.name.slice(3),10):0;if(pv>0)h.classList.add("restore");
function ready(f){if(d.readyState!=="loading")f();else d.addEventListener("DOMContentLoaded",f)}
function all(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))}
ready(function(){var nav=d.getElementById("nav"),bar=d.querySelector(".progress span"),wa=d.querySelector(".wa-float"),media=d.querySelector(".hero-media"),heroIn=d.querySelector(".hero-in"),burger=d.querySelector(".burger"),framed=w.parent!==w,pars=[],ticking=false;
function frame(){ticking=false;var y=w.pageYOffset||h.scrollTop,vh=w.innerHeight;if(nav)nav.classList.toggle("solid",y>40);
if(bar){var max=h.scrollHeight-h.clientHeight;bar.style.transform="scaleX("+(max>0?Math.min(1,y/max):0)+")"}
if(wa)wa.classList.toggle("show",y>vh*.45);
if(!rm&&y<vh*1.3){if(media)media.style.transform="translate3d(0,"+(y*.42).toFixed(1)+"px,0) scale("+(1+y/vh*.14).toFixed(4)+")";
if(heroIn){heroIn.style.transform="translate3d(0,"+(y*.22).toFixed(1)+"px,0)";heroIn.style.opacity=Math.max(0,1-y/(vh*.8)).toFixed(3)}}
if(!rm)pars.forEach(function(el){var r=el.getBoundingClientRect(),amt=parseFloat(el.getAttribute("data-par"))||40,p=(r.top+r.height/2-vh/2)/(vh/2+r.height/2);p=Math.max(-1,Math.min(1,p));el.style.setProperty("--py",(-p*amt).toFixed(1)+"px")});
if(framed){try{w.parent.postMessage({zuriPreviewScroll:Math.round(y)},"*")}catch(e){}}}
function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(frame)}}
w.addEventListener("scroll",onScroll,{passive:true});w.addEventListener("resize",onScroll);
var parEls=all("[data-par]");if("IntersectionObserver" in w){var po=new IntersectionObserver(function(es){es.forEach(function(e){var i=pars.indexOf(e.target);if(e.isIntersecting){if(i<0)pars.push(e.target)}else if(i>=0)pars.splice(i,1)});onScroll()},{rootMargin:"120px 0px"});parEls.forEach(function(e){po.observe(e)})}else pars=parEls;
if(burger&&nav){var close=function(){nav.classList.remove("open");burger.setAttribute("aria-expanded","false");d.body.classList.remove("lock")};
burger.addEventListener("click",function(){var o=nav.classList.toggle("open");burger.setAttribute("aria-expanded",o?"true":"false");d.body.classList.toggle("lock",o)});
all(".links a",nav).forEach(function(a){a.addEventListener("click",close)});d.addEventListener("keydown",function(e){if(e.key==="Escape")close()})}
if(isPv&&framed)w.addEventListener("message",function(e){if(e.source!==w.parent)return;var id=e.data&&e.data.zuriGoTo;if(typeof id!=="string"||!/^[a-z]{2,20}$/.test(id))return;var t=d.getElementById(id);if(!t)return;
all(".reveal",t).forEach(function(x){x.classList.add("in")});var top=id==="topo"?0:t.getBoundingClientRect().top+(w.pageYOffset||h.scrollTop)-(nav?nav.offsetHeight:0)+1;w.scrollTo({top:Math.max(0,top),behavior:rm?"auto":"smooth"})});
var els=all(".reveal");if(pv>0){h.style.scrollBehavior="auto";w.scrollTo(0,pv);h.style.scrollBehavior=""}
if(rm||pv>0||!("IntersectionObserver" in w)){els.forEach(function(e){e.classList.add("in")})}
else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12,rootMargin:"0px 0px -40px 0px"});els.forEach(function(e){io.observe(e)})}
frame();
all("[data-count]").forEach(function(el){var t=parseFloat(el.getAttribute("data-count")),dec=parseInt(el.getAttribute("data-dec")||"0",10);if(rm||pv>0||isNaN(t)||!("IntersectionObserver" in w))return;
var fmt=function(v){return dec?v.toFixed(dec).replace(".",","):Math.round(v).toLocaleString("pt-PT")};el.textContent=fmt(0);
var o=new IntersectionObserver(function(es){if(!es[0].isIntersecting)return;o.disconnect();var s=null;var step=function(ts){if(s===null)s=ts;var p=Math.min(1,(ts-s)/1600);el.textContent=fmt(t*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)});o.observe(el)});
if(!rm)all(".card").forEach(function(c){c.addEventListener("pointermove",function(e){var r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")})});
var slides=all(".hero-bg"),dots=all(".hero-dots i");if(slides.length>1){var si=0;setInterval(function(){if(d.hidden)return;slides[si].classList.remove("on");if(dots[si])dots[si].classList.remove("on");si=(si+1)%slides.length;slides[si].classList.add("on");if(dots[si])dots[si].classList.add("on")},6000)}
var rots=all(".rot-i");if(rots.length>1){var ri=0;setInterval(function(){if(d.hidden)return;var a=rots[ri];a.classList.remove("on");a.classList.add("out");setTimeout(function(){a.classList.remove("out")},750);ri=(ri+1)%rots.length;rots[ri].classList.add("on")},2800)}
all(".tabs").forEach(function(t){var bs=all(".tab",t),ps=all(".panel",t.parentNode);bs.forEach(function(b,i){b.addEventListener("click",function(){bs.forEach(function(x,j){x.classList.toggle("on",j===i);x.setAttribute("aria-selected",j===i?"true":"false")});ps.forEach(function(p,j){p.classList.toggle("on",j===i)})})})});
var lb=null,group=[],gi=0;
function show(){var a=group[gi];lb.querySelector("img").src=a.getAttribute("href");lb.querySelector("p").textContent=a.getAttribute("data-cap")||"";lb.querySelector(".lb-n").textContent=(gi+1)+" / "+group.length}
function step(n){gi=(gi+n+group.length)%group.length;show()}
function closeLb(){if(lb){lb.classList.remove("open");d.body.classList.remove("lock")}}
function openLb(a){if(!lb){lb=d.createElement("div");lb.className="lb";lb.setAttribute("role","dialog");lb.setAttribute("aria-modal","true");
lb.innerHTML='<button class="lb-x" type="button" aria-label="Fechar">&times;</button><button class="lb-p" type="button" aria-label="Anterior">&lsaquo;</button><figure><img alt=""><p></p></figure><button class="lb-nx" type="button" aria-label="Seguinte">&rsaquo;</button><span class="lb-n"></span>';d.body.appendChild(lb);
lb.addEventListener("click",function(e){var c=e.target.classList;if(e.target===lb||c.contains("lb-x"))closeLb();else if(c.contains("lb-p"))step(-1);else if(c.contains("lb-nx"))step(1)});
d.addEventListener("keydown",function(e){if(!lb.classList.contains("open"))return;if(e.key==="Escape")closeLb();else if(e.key==="ArrowRight")step(1);else if(e.key==="ArrowLeft")step(-1)})}
group=all('[data-lb="'+a.getAttribute("data-lb")+'"]');gi=Math.max(0,group.indexOf(a));show();lb.classList.add("open");d.body.classList.add("lock")}
all("[data-lb]").forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();openLb(a)})});
})})();`;

export const SITE_SCRIPT_HASH = `sha256-${createHash("sha256").update(SITE_SCRIPT, "utf8").digest("base64")}`;

// CSP do site: sem scripts além do nosso, imagens só por https, mapas só da Google.
export const SITE_CSP = [
  "default-src 'none'",
  `script-src '${SITE_SCRIPT_HASH}'`,
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src https: data:",
  "frame-src https://www.google.com https://maps.google.com",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

// ---------------------------------------------------------------------------
// Ícones (SVG inline, traço)
// ---------------------------------------------------------------------------
const svg = (body: string, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`;

const ICONS = {
  phone: svg(
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'
  ),
  mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  pin: svg('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  shield: svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  card: svg('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 2.2 12C2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2A11.8 11.8 0 0 0 12 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7a11.9 11.9 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.9 0-3.2-1.2-6.2-3.4-8.4z"/></svg>',
  quote:
    '<svg class="t-q" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.6 5C5.9 6.3 3.5 9.3 3.5 13.3V19h6.2v-6.2H6.6c.1-2.6 1.6-4.5 4-5.4zm10 0c-3.7 1.3-6.1 4.3-6.1 8.3V19h6.2v-6.2h-3.1c.1-2.6 1.6-4.5 4-5.4z"/></svg>',
};

// ---------------------------------------------------------------------------
// Tipos de negócio: ordem das secções e nomes por defeito
// ---------------------------------------------------------------------------
type SecKey = "highlight" | "catalog" | "about" | "services" | "gallery" | "team" | "plans" | "schedule" | "partners" | "faq" | "band" | "testimonials";
type Label = { eyebrow: string; title: string; nav: string };

const DEFAULT_LABELS: Record<SecKey, Label> = {
  highlight: { eyebrow: "Destaque", title: "Em destaque", nav: "Destaque" },
  catalog: { eyebrow: "Preços", title: "Serviços e preços", nav: "Preços" },
  about: { eyebrow: "Sobre nós", title: "", nav: "Sobre" },
  services: { eyebrow: "Serviços", title: "O que fazemos", nav: "Serviços" },
  gallery: { eyebrow: "Galeria", title: "Galeria", nav: "Galeria" },
  team: { eyebrow: "Equipa", title: "A nossa equipa", nav: "Equipa" },
  plans: { eyebrow: "Planos", title: "Planos", nav: "Planos" },
  schedule: { eyebrow: "Horário", title: "Horário", nav: "Horário" },
  partners: { eyebrow: "Pagamentos", title: "Formas de pagamento", nav: "" },
  faq: { eyebrow: "Dúvidas", title: "Perguntas frequentes", nav: "" },
  band: { eyebrow: "", title: "", nav: "" },
  testimonials: { eyebrow: "Testemunhos", title: "O que dizem os nossos clientes", nav: "Testemunhos" },
};

const KIND_LAYOUT: Record<SiteKind, { order: SecKey[]; labels: Partial<Record<SecKey, Partial<Label>>>; cta: string }> = {
  restaurante: {
    order: ["highlight", "catalog", "band", "about", "gallery", "services", "partners", "team", "faq", "testimonials"],
    labels: {
      highlight: { eyebrow: "Especialidade", title: "A especialidade da casa", nav: "Destaque" },
      catalog: { eyebrow: "Menu", title: "O nosso menu", nav: "Menu" },
      gallery: { eyebrow: "Galeria", title: "O nosso espaço", nav: "Galeria" },
      services: { title: "Também temos", nav: "" },
    },
    cta: "Reserve a sua mesa",
  },
  clinica: {
    order: ["services", "team", "band", "about", "partners", "gallery", "catalog", "faq", "testimonials"],
    labels: {
      services: { eyebrow: "Especialidades", title: "As nossas especialidades", nav: "Especialidades" },
      team: { eyebrow: "Equipa", title: "A nossa equipa médica", nav: "Equipa" },
      partners: { eyebrow: "Seguros", title: "Seguros aceites" },
      gallery: { eyebrow: "Instalações", title: "As nossas instalações", nav: "" },
      catalog: { eyebrow: "Preços", title: "Consultas e tratamentos", nav: "Preços" },
    },
    cta: "Marque a sua consulta",
  },
  ginasio: {
    order: ["services", "plans", "schedule", "band", "team", "gallery", "about", "faq", "testimonials"],
    labels: {
      services: { eyebrow: "Modalidades", title: "As nossas modalidades", nav: "Modalidades" },
      plans: { eyebrow: "Planos", title: "Planos e mensalidades", nav: "Planos" },
      schedule: { eyebrow: "Horário", title: "Horário das aulas", nav: "Horário" },
      team: { eyebrow: "Equipa", title: "Os nossos treinadores", nav: "" },
      gallery: { eyebrow: "Galeria", title: "O nosso espaço", nav: "" },
    },
    cta: "Venha conhecer-nos",
  },
  salao: {
    order: ["catalog", "highlight", "gallery", "band", "team", "about", "services", "testimonials", "faq"],
    labels: {
      catalog: { eyebrow: "Serviços", title: "Serviços e preços", nav: "Serviços" },
      gallery: { eyebrow: "Trabalhos", title: "Os nossos trabalhos", nav: "Trabalhos" },
      team: { eyebrow: "Equipa", title: "A nossa equipa", nav: "Equipa" },
    },
    cta: "Marque o seu horário",
  },
  geral: {
    order: ["about", "services", "highlight", "catalog", "band", "gallery", "team", "plans", "schedule", "partners", "faq", "testimonials"],
    labels: {},
    cta: "Vamos conversar?",
  },
};

const DAY_LABEL: Record<string, string> = { seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo" };

// "350" → "350 MT"; texto livre ("a partir de 500 MT") fica como está.
function fmtPrice(p: string | undefined): string {
  const t = (p ?? "").trim();
  if (!t) return "";
  return /^\d[\d\s.,]*$/.test(t) ? `${t} MT` : t;
}

// "6h30", "06:30", "18.00" → minutos desde a meia-noite (para ordenar as aulas).
function minutes(t: string): number {
  const m = /(\d{1,2})\s*[:hH.]?\s*(\d{2})?/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2] ?? 0) : 24 * 60;
}

function waWithText(wa: string | null, message: string): string | null {
  if (!wa) return null;
  const m = message.trim();
  return m ? `${wa}?text=${encodeURIComponent(m)}` : wa;
}

// Partículas douradas do topo Elegante sem foto (posições fixas, sem aleatoriedade).
function sparks(): string {
  return Array.from({ length: 16 }, (_, i) => {
    const x = (i * 37 + 11) % 100;
    const size = 4 + ((i * 7) % 9);
    const t = 9 + ((i * 5) % 8);
    const delay = -((i * 13) % 17);
    const dx = ((i % 5) - 2) * 30;
    return `<span style="--x:${x}%;--s:${size}px;--t:${t}s;--dl:${delay}s;--dx:${dx}px"></span>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
export interface RenderOptions {
  businessName: string;
  content: WebsiteContent;
  theme: WebsiteTheme;
  canonicalUrl?: string;
}

export function renderWebsiteHtml({ businessName, content, theme, canonicalUrl }: RenderOptions): string {
  const { hero, about, services, contact, seo, rating, brand, testimonials } = content;
  const kind: SiteKind = content.kind in KIND_LAYOUT ? content.kind : "geral";
  const layout = KIND_LAYOUT[kind];
  const label = (k: SecKey): Label => ({ ...DEFAULT_LABELS[k], ...(layout.labels[k] ?? {}) }) as Label;
  const style: SiteStyle = theme.style in FONTS ? theme.style : "moderno";
  const font = FONTS[style];
  const dark = theme.mode === "escuro";
  const vars = themeVars(style, theme);
  const primary = /^#[0-9a-fA-F]{6}$/.test(theme.primary) ? theme.primary : "#6d4aff";

  const wa = whatsappLink(contact.whatsapp);
  const tel = telLink(contact.phone);
  const mainCta = waWithText(wa, content.booking?.message ?? "") ?? tel;
  const ctaAttrs = wa ? ' target="_blank" rel="noopener"' : "";
  const mainCtaLabel = hero.ctaLabel || (wa ? "Falar no WhatsApp" : "Ligar agora");
  const year = new Date().getFullYear();

  const heroSlides = [hero.imageUrl, ...(hero.gallery ?? [])].map((u) => safeUrl(u)).filter((u): u is string => Boolean(u)).slice(0, 5);
  const heroImage = heroSlides[0] ?? null;
  const rotating = (hero.rotating ?? []).map((r) => r.trim()).filter(Boolean).slice(0, 4);
  const aboutImage = safeUrl(about.imageUrl);
  const logo = safeUrl(brand.logoUrl);
  const showName = !logo || brand.showName !== false;

  const serviceItems = services.items.filter((s) => s.name.trim());
  const serviceImages = serviceItems.some((s) => safeUrl(s.imageUrl));
  const testimonialItems = testimonials.items.filter((t) => t.name.trim() && t.text.trim());
  const hasRating = Boolean(rating && rating.count > 0);
  const mapQuery = contact.showMap && contact.address ? encodeURIComponent(`${businessName}, ${contact.address}`) : null;

  const hl = content.highlight;
  const hlImage = safeUrl(hl?.imageUrl);
  const catalogCats = (content.catalog?.categories ?? [])
    .map((c) => ({ name: c.name.trim(), items: c.items.filter((it) => it.name.trim()) }))
    .filter((c) => c.items.length > 0);
  const galleryImages = (content.gallery?.images ?? []).filter((g) => safeUrl(g.url));
  const teamMembers = (content.team?.members ?? []).filter((m) => m.name.trim());
  const planItems = (content.plans?.items ?? []).filter((p) => p.name.trim());
  const scheduleEntries = (content.schedule?.entries ?? []).filter((e) => e.name.trim());
  const partnerItems = (content.partners?.items ?? []).map((p) => p.trim()).filter(Boolean);
  const faqItems = (content.faq?.items ?? []).filter((f) => f.q.trim() && f.a.trim());
  const bandImage = safeUrl(content.band?.imageUrl);

  const has: Record<SecKey, boolean> = {
    highlight: Boolean(hl && hl.name.trim()),
    catalog: catalogCats.length > 0,
    about: about.text.trim().length > 0,
    services: serviceItems.length > 0,
    gallery: galleryImages.length > 0,
    team: teamMembers.length > 0,
    plans: planItems.length > 0,
    schedule: scheduleEntries.length > 0,
    partners: partnerItems.length > 0,
    faq: faqItems.length > 0,
    band: Boolean(bandImage),
    testimonials: testimonialItems.length > 0,
  };
  const ALL: SecKey[] = ["highlight", "catalog", "about", "services", "gallery", "team", "plans", "schedule", "partners", "faq", "band", "testimonials"];
  const order = [...layout.order, ...ALL.filter((k) => !layout.order.includes(k))].filter((k) => has[k]);
  const ids: Record<SecKey, string> = {
    highlight: "destaque", catalog: "menu", about: "sobre", services: "servicos", gallery: "galeria", team: "equipa",
    plans: "planos", schedule: "horario", partners: "parceiros", faq: "faq", band: "faixa", testimonials: "testemunhos",
  };
  const ogImage = heroImage ?? hlImage ?? aboutImage ?? safeUrl(galleryImages[0]?.url) ?? logo;

  // Logotipo/monograma + nome
  const brandMark = logo
    ? `<span class="logo"><img src="${esc(logo)}" alt="${esc(businessName)}"></span>`
    : `<span class="mono" aria-hidden="true">${esc(initials(businessName))}</span>`;
  const brandHtml = `${brandMark}${showName ? `<span class="brand-name">${esc(businessName)}</span>` : ""}`;

  const navLinks =
    order
      .filter((k) => label(k).nav)
      .slice(0, 4)
      .map((k) => `<a href="#${ids[k]}">${esc(label(k).nav)}</a>`)
      .join("") + `<a href="#contacto">Contacto</a>`;

  const head = (k: SecKey, title: string, center = true) =>
    `<div class="sec-head reveal${center ? " center" : ""}">${label(k).eyebrow ? `<span class="eyebrow">${esc(label(k).eyebrow)}</span>` : ""}<h2>${esc(title || label(k).title)}</h2></div>`;

  // Contactos
  const contactItems: string[] = [];
  if (contact.phone && tel)
    contactItems.push(`<a class="c-item" href="${esc(tel)}"><span class="c-ic">${ICONS.phone}</span><span><span class="c-label">Telefone</span><span class="c-value">${esc(contact.phone)}</span></span></a>`);
  if (contact.whatsapp && wa)
    contactItems.push(`<a class="c-item" href="${esc(wa)}" target="_blank" rel="noopener"><span class="c-ic">${ICONS.whatsapp}</span><span><span class="c-label">WhatsApp</span><span class="c-value">${esc(contact.whatsapp)}</span></span></a>`);
  if (isEmail(contact.email))
    contactItems.push(`<a class="c-item" href="mailto:${esc(contact.email)}"><span class="c-ic">${ICONS.mail}</span><span><span class="c-label">Email</span><span class="c-value">${esc(contact.email)}</span></span></a>`);
  if (contact.address)
    contactItems.push(`<div class="c-item"><span class="c-ic">${ICONS.pin}</span><span><span class="c-label">Morada</span><span class="c-value">${esc(contact.address)}</span></span></div>`);
  if (contact.hours)
    contactItems.push(`<div class="c-item"><span class="c-ic">${ICONS.clock}</span><span><span class="c-label">Horário</span><span class="c-value">${esc(contact.hours).replace(/\n/g, "<br>")}</span></span></div>`);

  const stats = hasRating
    ? `<div class="stats">
        <div class="stat"><b data-count="${esc(rating!.value)}" data-dec="1">${esc(rating!.value.toFixed(1).replace(".", ","))}</b><span>Classificação no Google</span></div>
        <div class="stat"><b data-count="${esc(rating!.count)}">${esc(rating!.count.toLocaleString("pt-PT"))}</b><span>Avaliações de clientes</span></div>
      </div>`
    : "";

  // Dados estruturados (SEO local). O JSON é escapado para nunca fechar a tag.
  const schemaType = { restaurante: "Restaurant", clinica: "MedicalClinic", ginasio: "ExerciseGym", salao: "BeautySalon", geral: "LocalBusiness" }[kind];
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": schemaType,
    name: businessName,
    description: seo.description || hero.subheadline || undefined,
    url: canonicalUrl || undefined,
    image: ogImage || undefined,
    logo: logo || undefined,
    telephone: contact.phone || undefined,
    email: isEmail(contact.email) ? contact.email : undefined,
    address: contact.address || undefined,
  })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  const favicon = logo
    ? esc(logo)
    : `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${primary}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="28" fill="#fff">${esc(initials(businessName))}</text></svg>`
      )}`;

  const heroShadeVars = style === "vibrante" ? `;--shade-a:${rgba(primary, 0.82)};--shade-b:${rgba(rotateHue(primary, 42), 0.55)}` : "";

  // ----- Topo -----
  const firstSection = order.find((k) => k !== "band");
  // Segundo botão do topo: a primeira secção "para ver" pela ordem do tipo de negócio.
  const browseKey = order.find((k) => (["catalog", "services", "plans", "gallery"] as SecKey[]).includes(k));
  const browse = browseKey
    ? `<a class="btn btn-o" href="#${ids[browseKey]}">Ver ${esc((label(browseKey).nav || label(browseKey).eyebrow).toLowerCase())}</a>`
    : `<a class="btn btn-o" href="#contacto">Contactos</a>`;
  const slidesHtml = heroSlides.map((_, i) => `<div class="hero-bg hs${i}${i === 0 ? " on" : ""}"></div>`).join("");
  const heroBackdrop = heroImage
    ? `<div class="hero-media" aria-hidden="true">${slidesHtml}</div><div class="hero-shade" aria-hidden="true"></div>`
    : style === "elegante"
      ? `<div class="hero-light" aria-hidden="true"></div><div class="sparks" aria-hidden="true">${sparks()}</div>`
      : `<div class="blob b1" aria-hidden="true"></div><div class="blob b2" aria-hidden="true"></div><div class="blob b3" aria-hidden="true"></div>`;
  const heroSection = `<section class="hero" id="topo">
  ${heroBackdrop}
  ${style === "moderno" ? `<div class="hero-glow" aria-hidden="true"></div>` : ""}
  <div class="wrap hero-in">
    ${hasRating ? `<span class="chip"><span class="stars">★</span> ${esc(rating!.value.toFixed(1).replace(".", ","))} no Google · ${esc(rating!.count.toLocaleString("pt-PT"))} avaliações</span>` : ""}
    <h1>${animatedWords(hero.headline)}</h1>
    ${rotating.length >= 2 ? `<div class="rot" aria-label="${esc(rotating.join(", "))}">${rotating.map((r, i) => `<span class="rot-i${i === 0 ? " on" : ""}" aria-hidden="true">${esc(r)}</span>`).join("")}</div>` : ""}
    ${hero.subheadline ? `<p class="hero-sub">${esc(hero.subheadline)}</p>` : ""}
    <div class="hero-actions">
      ${mainCta ? `<a class="btn btn-p" href="${esc(mainCta)}"${ctaAttrs}>${wa ? ICONS.whatsapp : ICONS.phone}${esc(mainCtaLabel)}</a>` : ""}
      ${browse}
    </div>
  </div>
  ${heroSlides.length > 1 ? `<div class="hero-dots" aria-hidden="true">${heroSlides.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</div>` : ""}
  <a class="scroll-cue" href="#${firstSection ? ids[firstSection] : "contacto"}" aria-label="Descer"><span></span></a>
</section>`;

  const marqueeNames = (serviceItems.length ? serviceItems.map((s) => s.name) : catalogCats.flatMap((c) => c.items.map((i) => i.name))).slice(0, 10);
  const marquee =
    style === "vibrante" && marqueeNames.length
      ? (() => {
          const row = `<span>${marqueeNames.map((n) => `${esc(n)} <i>✦</i>`).join(" ")}</span>`;
          return `<div class="marquee" aria-hidden="true"><div class="track">${row}${row}${row}${row}</div></div>`;
        })()
      : "";

  // ----- Secções -----
  const render: Record<SecKey, () => string> = {
    about: () =>
      aboutImage
        ? `<section class="sec" id="sobre">
  <div class="wrap about-grid has-img">
    <figure class="about-media reveal"><div class="frame" data-par="34"><div class="pz"><img src="${esc(aboutImage)}" alt="${esc(about.title || businessName)}" loading="lazy"></div></div></figure>
    <div class="reveal" style="--d:1">
      <span class="eyebrow">Sobre nós</span>
      <h2>${esc(about.title || businessName)}</h2>
      <div class="lead">${paragraphs(about.text)}</div>
      ${stats}
    </div>
  </div>
</section>`
        : `<section class="sec" id="sobre">
  <div class="wrap about-grid no-img">
    <div class="reveal"><span class="eyebrow">Sobre nós</span><h2>${esc(about.title || businessName)}</h2></div>
    <div class="reveal" style="--d:1"><div class="lead">${paragraphs(about.text)}</div>${stats}</div>
  </div>
</section>`,

    services: () => `<section class="sec services" id="servicos">
  <div class="wrap">
    ${head("services", services.title, style === "elegante")}
    <div class="cards">
      ${serviceItems
        .map((item, i) => {
          const img = safeUrl(item.imageUrl);
          const media = serviceImages
            ? img
              ? `<div class="card-media"><img src="${esc(img)}" alt="${esc(item.name)}" loading="lazy"></div>`
              : `<div class="card-media ph" aria-hidden="true">${esc(item.name.trim().charAt(0).toUpperCase())}</div>`
            : "";
          return `<div class="reveal" style="--d:${i % 3}"><article class="card"><span class="bar"></span>${media}<div class="card-body">${
            serviceImages ? "" : `<span class="card-num">${String(i + 1).padStart(2, "0")}</span>`
          }<h3>${esc(item.name)}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ""}</div></article></div>`;
        })
        .join("")}
    </div>
  </div>
</section>`,

    highlight: () => {
      const price = fmtPrice(hl.price);
      return `<section class="sec" id="destaque">
  <div class="wrap hl-grid${hlImage ? "" : " no-img"}">
    ${
      hlImage
        ? `<figure class="hl-media reveal"><a class="hl-frame" data-par="34" href="${esc(hlImage)}" data-lb="hl" data-cap="${esc(hl.name)}" target="_blank" rel="noopener"><div class="pz"><img src="${esc(hlImage)}" alt="${esc(hl.name)}" loading="lazy"></div></a>${price ? `<span class="hl-price">${esc(price)}</span>` : ""}</figure>`
        : ""
    }
    <div class="reveal" style="--d:1">
      <span class="eyebrow">${esc(hl.title || label("highlight").title)}</span>
      <h2>${esc(hl.name)}</h2>
      ${hl.description ? `<p class="hl-desc">${esc(hl.description)}</p>` : ""}
      <div class="hl-cta">${!hlImage && price ? `<span class="big">${esc(price)}</span>` : ""}${mainCta ? `<a class="btn btn-p" href="${esc(mainCta)}"${ctaAttrs}>${esc(mainCtaLabel)} ${ICONS.arrow}</a>` : ""}</div>
    </div>
  </div>
</section>`;
    },

    catalog: () => {
      const multi = catalogCats.length > 1;
      const longList = catalogCats.some((c) => c.items.length > 4);
      const item = (it: (typeof catalogCats)[number]["items"][number]) => {
        const img = safeUrl(it.imageUrl);
        const price = fmtPrice(it.price);
        return `<div class="m-item">${
          img ? `<a class="m-thumb" href="${esc(img)}" data-lb="menu" data-cap="${esc(it.name)}" target="_blank" rel="noopener"><img src="${esc(img)}" alt="${esc(it.name)}" loading="lazy"></a>` : ""
        }<div class="m-body"><div class="m-top"><h4>${esc(it.name)}</h4>${price ? `<span class="m-dots"></span><span class="m-price">${esc(price)}</span>` : ""}</div>${
          it.description ? `<p>${esc(it.description)}</p>` : ""
        }${it.detail ? `<span class="m-detail">${ICONS.clock.replace("<svg ", '<svg width="14" height="14" ')}${esc(it.detail)}</span>` : ""}</div></div>`;
      };
      return `<section class="sec services" id="menu">
  <div class="wrap">
    ${head("catalog", content.catalog.title)}
    ${
      multi
        ? `<div class="tabs reveal" role="tablist">${catalogCats
            .map((c, i) => `<button class="tab${i === 0 ? " on" : ""}" type="button" role="tab" aria-selected="${i === 0}">${esc(c.name || `Parte ${i + 1}`)}</button>`)
            .join("")}</div>`
        : ""
    }
    <div class="panels${multi ? " multi" : ""} reveal">
      ${catalogCats
        .map(
          (c, i) =>
            `<div class="panel${i === 0 ? " on" : ""}" role="tabpanel">${multi && c.name ? `<h3 class="panel-title">${esc(c.name)}</h3>` : ""}<div class="m-list${longList ? " two" : ""}">${c.items.map(item).join("")}</div></div>`
        )
        .join("")}
    </div>
  </div>
</section>`;
    },

    gallery: () => `<section class="sec" id="galeria">
  <div class="wrap">
    ${head("gallery", content.gallery.title)}
    <div class="g-grid">
      ${galleryImages
        .map(
          (g, i) =>
            `<a class="g-item reveal" style="--d:${i % 3}" href="${esc(g.url)}" data-lb="gal" data-cap="${esc(g.caption)}" target="_blank" rel="noopener"><img src="${esc(g.url)}" alt="${esc(g.caption || businessName)}" loading="lazy">${
              g.caption ? `<span class="g-cap">${esc(g.caption)}</span>` : ""
            }</a>`
        )
        .join("")}
    </div>
  </div>
</section>`,

    team: () => `<section class="sec services" id="equipa">
  <div class="wrap">
    ${head("team", content.team.title)}
    <div class="tm-grid">
      ${teamMembers
        .map((m, i) => {
          const img = safeUrl(m.imageUrl);
          return `<figure class="tm reveal" style="--d:${i % 4}"><div class="tm-photo">${img ? `<img src="${esc(img)}" alt="${esc(m.name)}" loading="lazy">` : esc(initials(m.name))}</div><figcaption><b>${esc(m.name)}</b>${m.role ? `<span>${esc(m.role)}</span>` : ""}</figcaption></figure>`;
        })
        .join("")}
    </div>
  </div>
</section>`,

    plans: () => `<section class="sec" id="planos">
  <div class="wrap">
    ${head("plans", content.plans.title)}
    <div class="pl-grid">
      ${planItems
        .map((p, i) => {
          const price = fmtPrice(p.price);
          const href = waWithText(wa, `Olá! Tenho interesse no plano ${p.name}.`) ?? tel;
          return `<div class="reveal" style="--d:${i}"><article class="plan${p.featured ? " feat" : ""}">${p.featured ? `<span class="pl-badge">Em destaque</span>` : ""}<h3>${esc(p.name)}</h3>${
            price ? `<div class="pl-price"><b>${esc(price)}</b>${p.period ? `<span>${esc(p.period)}</span>` : ""}</div>` : ""
          }${p.features.length ? `<ul>${p.features.filter((f) => f.trim()).map((f) => `<li>${ICONS.check}<span>${esc(f)}</span></li>`).join("")}</ul>` : '<ul></ul>'}${
            href ? `<a class="btn ${p.featured ? "btn-p" : "btn-ghost"}" href="${esc(href)}"${ctaAttrs}>Quero este plano</a>` : ""
          }</article></div>`;
        })
        .join("")}
    </div>
  </div>
</section>`,

    schedule: () => {
      const days = WEEK_DAYS.filter((dd) => scheduleEntries.some((e) => e.day === dd));
      return `<section class="sec services" id="horario">
  <div class="wrap">
    ${head("schedule", content.schedule.title)}
    <div class="sc-grid" style="--cols:${days.length}">
      ${days
        .map(
          (dd, i) =>
            `<div class="sc-day reveal" style="--d:${i % 4}"><h4>${DAY_LABEL[dd]}</h4>${scheduleEntries
              .filter((e) => e.day === dd)
              .sort((a, b) => minutes(a.time) - minutes(b.time))
              .map((e) => `<div class="sc-cls">${e.time ? `<b>${esc(e.time)}</b>` : ""}<span>${esc(e.name)}</span></div>`)
              .join("")}</div>`
        )
        .join("")}
    </div>
  </div>
</section>`;
    },

    partners: () => `<section class="sec partners" id="parceiros">
  <div class="wrap">
    ${head("partners", content.partners.title)}
    <div class="pt-row">${partnerItems.map((p, i) => `<span class="pt-chip reveal" style="--d:${i % 4}">${kind === "clinica" ? ICONS.shield : ICONS.card}${esc(p)}</span>`).join("")}</div>
  </div>
</section>`,

    faq: () => `<section class="sec" id="faq">
  <div class="wrap">
    ${head("faq", content.faq.title)}
    <div class="faq-list">${faqItems
      .map((f) => `<details class="qa reveal"><summary>${esc(f.q)}<span class="qa-ic" aria-hidden="true"></span></summary><div class="qa-a">${paragraphs(f.a)}</div></details>`)
      .join("")}</div>
  </div>
</section>`,

    band: () => `<section class="band" id="faixa" data-par="70" aria-label="${esc(content.band.text || businessName)}"><div class="band-img" aria-hidden="true"></div><div class="band-shade" aria-hidden="true"></div>${
      content.band.text ? `<p class="band-text reveal">${esc(content.band.text)}</p>` : ""
    }</section>`,

    testimonials: () => `<section class="sec testi" id="testemunhos">
  <div class="wrap">
    ${head("testimonials", testimonials.title)}
    <div class="t-grid">
      ${testimonialItems
        .map(
          (t, i) =>
            `<div class="reveal" style="--d:${i % 3}"><figure class="t-card">${ICONS.quote}<blockquote>${esc(t.text)}</blockquote><figcaption><span class="av" aria-hidden="true">${esc(
              initials(t.name)
            )}</span><span><b>${esc(t.name)}</b>${t.role ? `<small>${esc(t.role)}</small>` : ""}</span></figcaption></figure></div>`
        )
        .join("")}
    </div>
  </div>
</section>`,
  };

  const sectionsHtml = order.map((k) => render[k]()).join("\n");

  const ctaSection = mainCta
    ? `<section class="cta">
  <div class="wrap">
    <div class="cta-box reveal">
      <div><h2>${esc(layout.cta)}</h2><p>${esc(wa ? "É só enviar uma mensagem pelo WhatsApp." : "Ligue-nos e tire as suas dúvidas.")}</p></div>
      <a class="btn btn-p btn-w" href="${esc(mainCta)}"${ctaAttrs}>${esc(mainCtaLabel)} ${ICONS.arrow}</a>
    </div>
  </div>
</section>`
    : "";

  const contactSection = `<section class="sec" id="contacto"${mainCta ? ' style="padding-top:0"' : ""}>
  <div class="wrap">
    <div class="sec-head reveal"><span class="eyebrow">Contacto</span><h2>Fale connosco</h2></div>
    <div class="contact-grid${mapQuery ? " has-map" : ""}">
      <div class="c-list reveal">${contactItems.join("")}</div>
      ${
        mapQuery
          ? `<div class="map reveal" style="--d:1"><iframe title="Mapa — ${esc(businessName)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${mapQuery}&amp;output=embed"></iframe></div>`
          : ""
      }
    </div>
  </div>
</section>`;

  const imageCss = [
    ...heroSlides.map((u, i) => `.hs${i}{background-image:url("${u}")}`),
    bandImage ? `.band-img{background-image:url("${bandImage}")}` : "",
  ].join("\n");

  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${SITE_CSP}">
<title>${esc(seo.title || businessName)}</title>
<meta name="description" content="${esc(seo.description || hero.subheadline)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(seo.title || businessName)}">
<meta property="og:description" content="${esc(seo.description || hero.subheadline)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ""}
${canonicalUrl ? `<link rel="canonical" href="${esc(canonicalUrl)}"><meta property="og:url" content="${esc(canonicalUrl)}">` : ""}
<meta name="theme-color" content="${esc(primary)}">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${font.href}">
${heroImage ? `<link rel="preload" as="image" href="${esc(heroImage)}">` : ""}
<script>${SITE_SCRIPT}</script>
<style>
:root{${vars}${heroShadeVars}}
${BASE_CSS}
${SECTIONS_CSS}
${STYLE_CSS[style]}
${imageCss}
</style>
<script type="application/ld+json">${jsonLd}</script>
</head>
<body class="s-${style} m-${dark ? "escuro" : "claro"} k-${kind}">
<div class="progress" aria-hidden="true"><span></span></div>
<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="brand" href="#topo" aria-label="${esc(businessName)} — início">${brandHtml}</a>
    <nav class="links" id="menu-nav" aria-label="Navegação principal">
      ${navLinks}
      ${mainCta ? `<a class="btn btn-p" href="${esc(mainCta)}"${ctaAttrs}>${wa ? ICONS.whatsapp : ICONS.phone}${esc(mainCtaLabel.length <= 18 ? mainCtaLabel : wa ? "WhatsApp" : "Ligar")}</a>` : ""}
    </nav>
    <button class="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu-nav"><span></span><span></span></button>
  </div>
</header>

<main>
${heroSection}
${marquee}
${sectionsHtml}
${ctaSection}
${contactSection}
</main>

<footer class="foot">
  <div class="wrap">
    <div class="foot-top">
      <a class="brand" href="#topo">${brandHtml}</a>
      <nav class="foot-links" aria-label="Rodapé">${navLinks}</nav>
    </div>
    <div class="foot-bottom">
      <span>© ${year} ${esc(businessName)}. Todos os direitos reservados.</span>
      ${contact.address ? `<span>${esc(contact.address)}</span>` : ""}
    </div>
  </div>
</footer>

${wa ? `<a class="wa-float" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">${ICONS.whatsapp}</a>` : ""}
</body>
</html>`;
}
