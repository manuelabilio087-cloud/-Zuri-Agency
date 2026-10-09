// Página pública de um site criado no Zuri Agency: zuri-agency.vercel.app/s/{slug}.
// O HTML é gerado pelo backend; aqui servimos com cache na CDN da Vercel (rápido mesmo
// quando o servidor grátis do Render está a "dormir") e com uma CSP estrita: só corre
// o script de animações do Zuri (por hash) e o site nunca toca na sessão do painel.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// O site só pode correr o script do próprio Zuri (animações, menu), autorizado pelo
// hash que o backend envia. O conteúdo escrito pelo utilizador nunca é código.
function buildCsp(scriptHash: string | null): string {
  return [
    "default-src 'none'",
    `script-src ${scriptHash ? `'${scriptHash}'` : "'none'"}`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src https: data:",
    "frame-src https://www.google.com https://maps.google.com",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
  ].join("; ");
}

function securityHeaders(scriptHash: string | null = null): Record<string, string> {
  return {
    "Content-Security-Policy": buildCsp(scriptHash),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

const NOT_FOUND_HTML = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site não encontrado</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fafaf9;color:#1c1917;text-align:center;padding:24px}p{color:#57534e}</style></head><body><div><h1>Site não encontrado</h1><p>Este endereço não existe ou o site ainda não foi publicado.</p></div></body></html>`;

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const slug = String(params.slug).toLowerCase();
  if (!/^[a-z0-9-]{3,50}$/.test(slug)) {
    return new Response(NOT_FOUND_HTML, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() },
    });
  }

  try {
    const res = await fetch(`${API_URL}/api/public/sites/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, s-maxage=30", ...securityHeaders() },
      });
    }
    const html = await res.text();
    const hashHeader = res.headers.get("x-site-script-hash");
    const scriptHash = hashHeader && /^sha256-[A-Za-z0-9+/]{43}=$/.test(hashHeader) ? hashHeader : null;
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // 1 min fresco na CDN; até 1 dia a servir a versão anterior enquanto atualiza.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
        ...securityHeaders(scriptHash),
      },
    });
  } catch {
    return new Response(NOT_FOUND_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", ...securityHeaders() },
    });
  }
}
