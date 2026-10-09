import { createHash } from "crypto";
import { SAFE_HTTPS_URL, SiteStyle, WebsiteContent, WebsiteTheme } from "@/modules/websites/websites.types";

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
.hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;animation:kb 20s cubic-bezier(.2,.6,.3,1) both}
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
// JavaScript da página (constante — autorizado pela CSP através do hash).
// Animações de entrada ao fazer scroll, menu do telemóvel, barra de progresso,
// cabeçalho que ganha fundo, contadores, brilho que segue o rato e parallax.
// ---------------------------------------------------------------------------
const SITE_SCRIPT = `(function(){var d=document,h=d.documentElement,w=window;h.classList.add("js");
var rm=w.matchMedia&&w.matchMedia("(prefers-reduced-motion: reduce)").matches;
var pv=/^zp:\\d+$/.test(w.name||"")?parseInt(w.name.slice(3),10):0;if(pv>0)h.classList.add("restore");
function ready(f){if(d.readyState!=="loading")f();else d.addEventListener("DOMContentLoaded",f)}
ready(function(){var nav=d.getElementById("nav"),bar=d.querySelector(".progress span"),wa=d.querySelector(".wa-float"),media=d.querySelector(".hero-media"),burger=d.querySelector(".burger"),framed=w.parent!==w;
function onScroll(){var y=w.pageYOffset||h.scrollTop,vh=w.innerHeight;if(nav)nav.classList.toggle("solid",y>40);
if(bar){var max=h.scrollHeight-h.clientHeight;bar.style.transform="scaleX("+(max>0?Math.min(1,y/max):0)+")"}
if(wa)wa.classList.toggle("show",y>vh*.45);
if(media&&!rm&&y<vh*1.2)media.style.transform="translate3d(0,"+(y*.28).toFixed(1)+"px,0)";
if(framed){try{w.parent.postMessage({zuriPreviewScroll:Math.round(y)},"*")}catch(e){}}}
w.addEventListener("scroll",onScroll,{passive:true});
if(burger&&nav){var close=function(){nav.classList.remove("open");burger.setAttribute("aria-expanded","false");d.body.classList.remove("lock")};
burger.addEventListener("click",function(){var o=nav.classList.toggle("open");burger.setAttribute("aria-expanded",o?"true":"false");d.body.classList.toggle("lock",o)});
nav.querySelectorAll(".links a").forEach(function(a){a.addEventListener("click",close)});d.addEventListener("keydown",function(e){if(e.key==="Escape")close()})}
var els=d.querySelectorAll(".reveal");
if(pv>0){h.style.scrollBehavior="auto";w.scrollTo(0,pv);h.style.scrollBehavior=""}
if(rm||pv>0||!("IntersectionObserver" in w)){els.forEach(function(e){e.classList.add("in")})}
else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.14,rootMargin:"0px 0px -50px 0px"});els.forEach(function(e){io.observe(e)})}
onScroll();
d.querySelectorAll("[data-count]").forEach(function(el){var t=parseFloat(el.getAttribute("data-count")),dec=parseInt(el.getAttribute("data-dec")||"0",10);if(rm||pv>0||isNaN(t)||!("IntersectionObserver" in w))return;
var fmt=function(v){return dec?v.toFixed(dec).replace(".",","):Math.round(v).toLocaleString("pt-PT")};el.textContent=fmt(0);
var o=new IntersectionObserver(function(es){if(!es[0].isIntersecting)return;o.disconnect();var s=null;var step=function(ts){if(s===null)s=ts;var p=Math.min(1,(ts-s)/1600);el.textContent=fmt(t*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)});o.observe(el)});
if(!rm)d.querySelectorAll(".card").forEach(function(c){c.addEventListener("pointermove",function(e){var r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")})});
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
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2.1-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 2.2 12C2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2A11.8 11.8 0 0 0 12 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7a11.9 11.9 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.9 0-3.2-1.2-6.2-3.4-8.4z"/></svg>',
  quote:
    '<svg class="t-q" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.6 5C5.9 6.3 3.5 9.3 3.5 13.3V19h6.2v-6.2H6.6c.1-2.6 1.6-4.5 4-5.4zm10 0c-3.7 1.3-6.1 4.3-6.1 8.3V19h6.2v-6.2h-3.1c.1-2.6 1.6-4.5 4-5.4z"/></svg>',
};

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
  const style: SiteStyle = theme.style in FONTS ? theme.style : "moderno";
  const font = FONTS[style];
  const dark = theme.mode === "escuro";
  const vars = themeVars(style, theme);
  const primary = /^#[0-9a-fA-F]{6}$/.test(theme.primary) ? theme.primary : "#6d4aff";

  const wa = whatsappLink(contact.whatsapp);
  const tel = telLink(contact.phone);
  const mainCta = wa ?? tel;
  const ctaAttrs = wa ? ' target="_blank" rel="noopener"' : "";
  const mainCtaLabel = hero.ctaLabel || (wa ? "Falar no WhatsApp" : "Ligar agora");
  const year = new Date().getFullYear();

  const heroImage = safeUrl(hero.imageUrl);
  const aboutImage = safeUrl(about.imageUrl);
  const logo = safeUrl(brand.logoUrl);
  const showName = !logo || brand.showName !== false;

  const serviceItems = services.items.filter((s) => s.name.trim());
  const hasServices = serviceItems.length > 0;
  const serviceImages = serviceItems.some((s) => safeUrl(s.imageUrl));
  const hasAbout = about.text.trim().length > 0;
  const testimonialItems = testimonials.items.filter((t) => t.name.trim() && t.text.trim());
  const hasTestimonials = testimonialItems.length > 0;
  const hasRating = Boolean(rating && rating.count > 0);
  const mapQuery = contact.showMap && contact.address ? encodeURIComponent(`${businessName}, ${contact.address}`) : null;
  const ogImage = heroImage ?? aboutImage ?? logo;

  // Logotipo/monograma + nome
  const brandMark = logo
    ? `<span class="logo"><img src="${esc(logo)}" alt="${esc(businessName)}"></span>`
    : `<span class="mono" aria-hidden="true">${esc(initials(businessName))}</span>`;
  const brandHtml = `${brandMark}${showName ? `<span class="brand-name">${esc(businessName)}</span>` : ""}`;

  const navLinks = [
    hasAbout ? `<a href="#sobre">Sobre</a>` : "",
    hasServices ? `<a href="#servicos">Serviços</a>` : "",
    hasTestimonials ? `<a href="#testemunhos">Testemunhos</a>` : "",
    `<a href="#contacto">Contacto</a>`,
  ].join("");

  // Contactos
  const contactItems: string[] = [];
  if (contact.phone && tel)
    contactItems.push(
      `<a class="c-item" href="${esc(tel)}"><span class="c-ic">${ICONS.phone}</span><span><span class="c-label">Telefone</span><span class="c-value">${esc(contact.phone)}</span></span></a>`
    );
  if (contact.whatsapp && wa)
    contactItems.push(
      `<a class="c-item" href="${esc(wa)}" target="_blank" rel="noopener"><span class="c-ic">${ICONS.whatsapp}</span><span><span class="c-label">WhatsApp</span><span class="c-value">${esc(contact.whatsapp)}</span></span></a>`
    );
  if (isEmail(contact.email))
    contactItems.push(
      `<a class="c-item" href="mailto:${esc(contact.email)}"><span class="c-ic">${ICONS.mail}</span><span><span class="c-label">Email</span><span class="c-value">${esc(contact.email)}</span></span></a>`
    );
  if (contact.address)
    contactItems.push(
      `<div class="c-item"><span class="c-ic">${ICONS.pin}</span><span><span class="c-label">Morada</span><span class="c-value">${esc(contact.address)}</span></span></div>`
    );
  if (contact.hours)
    contactItems.push(
      `<div class="c-item"><span class="c-ic">${ICONS.clock}</span><span><span class="c-label">Horário</span><span class="c-value">${esc(contact.hours).replace(/\n/g, "<br>")}</span></span></div>`
    );

  const stats = hasRating
    ? `<div class="stats">
        <div class="stat"><b data-count="${esc(rating!.value)}" data-dec="1">${esc(rating!.value.toFixed(1).replace(".", ","))}</b><span>Classificação no Google</span></div>
        <div class="stat"><b data-count="${esc(rating!.count)}">${esc(rating!.count.toLocaleString("pt-PT"))}</b><span>Avaliações de clientes</span></div>
      </div>`
    : "";

  // Dados estruturados (SEO local). O JSON é escapado para nunca fechar a tag.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
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

  // ----- Secções -----
  const heroSection = `<section class="hero" id="topo">
  ${heroImage ? `<div class="hero-media" aria-hidden="true"><div class="hero-bg"></div></div><div class="hero-shade" aria-hidden="true"></div>` : ""}
  ${style === "moderno" ? `<div class="hero-glow" aria-hidden="true"></div>` : ""}
  ${style === "vibrante" && !heroImage ? `<div class="blob b1" aria-hidden="true"></div><div class="blob b2" aria-hidden="true"></div><div class="blob b3" aria-hidden="true"></div>` : ""}
  <div class="wrap hero-in">
    ${hasRating ? `<span class="chip"><span class="stars">★</span> ${esc(rating!.value.toFixed(1).replace(".", ","))} no Google · ${esc(rating!.count.toLocaleString("pt-PT"))} avaliações</span>` : ""}
    <h1>${animatedWords(hero.headline)}</h1>
    ${hero.subheadline ? `<p class="hero-sub">${esc(hero.subheadline)}</p>` : ""}
    <div class="hero-actions">
      ${mainCta ? `<a class="btn btn-p" href="${esc(mainCta)}"${ctaAttrs}>${wa ? ICONS.whatsapp : ICONS.phone}${esc(mainCtaLabel)}</a>` : ""}
      ${hasServices ? `<a class="btn btn-o" href="#servicos">Ver serviços</a>` : `<a class="btn btn-o" href="#contacto">Contactos</a>`}
    </div>
  </div>
  <a class="scroll-cue" href="${hasAbout ? "#sobre" : hasServices ? "#servicos" : "#contacto"}" aria-label="Descer"><span></span></a>
</section>`;

  const marquee =
    style === "vibrante" && hasServices
      ? (() => {
          const names = serviceItems.map((s) => `${esc(s.name)} <i>✦</i>`).join(" ");
          const row = `<span>${names}</span>`;
          return `<div class="marquee" aria-hidden="true"><div class="track">${row}${row}${row}${row}</div></div>`;
        })()
      : "";

  const aboutSection = hasAbout
    ? aboutImage
      ? `<section class="sec" id="sobre">
  <div class="wrap about-grid has-img">
    <figure class="about-media reveal"><div class="frame"><img src="${esc(aboutImage)}" alt="${esc(about.title || businessName)}" loading="lazy"></div></figure>
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
</section>`
    : "";

  const servicesSection = hasServices
    ? `<section class="sec services" id="servicos">
  <div class="wrap">
    <div class="sec-head reveal${style === "elegante" ? " center" : ""}"><span class="eyebrow">Serviços</span><h2>${esc(services.title || "O que fazemos")}</h2></div>
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
</section>`
    : "";

  const testimonialsSection = hasTestimonials
    ? `<section class="sec testi" id="testemunhos">
  <div class="wrap">
    <div class="sec-head reveal center"><span class="eyebrow">Testemunhos</span><h2>${esc(testimonials.title || "O que dizem os nossos clientes")}</h2></div>
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
</section>`
    : "";

  const ctaSection = mainCta
    ? `<section class="cta">
  <div class="wrap">
    <div class="cta-box reveal">
      <div><h2>Vamos conversar?</h2><p>${esc(
        wa ? "Envie-nos uma mensagem pelo WhatsApp e tire as suas dúvidas." : "Ligue-nos e tire as suas dúvidas."
      )}</p></div>
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
${STYLE_CSS[style]}
${heroImage ? `.hero-bg{background-image:url("${heroImage}")}` : ""}
</style>
<script type="application/ld+json">${jsonLd}</script>
</head>
<body class="s-${style} m-${dark ? "escuro" : "claro"}">
<div class="progress" aria-hidden="true"><span></span></div>
<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="brand" href="#topo" aria-label="${esc(businessName)} — início">${brandHtml}</a>
    <nav class="links" id="menu" aria-label="Navegação principal">
      ${navLinks}
      ${mainCta ? `<a class="btn btn-p" href="${esc(mainCta)}"${ctaAttrs}>${wa ? ICONS.whatsapp : ICONS.phone}${esc(wa ? "WhatsApp" : "Ligar")}</a>` : ""}
    </nav>
    <button class="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
  </div>
</header>

<main>
${heroSection}
${marquee}
${aboutSection}
${servicesSection}
${testimonialsSection}
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
