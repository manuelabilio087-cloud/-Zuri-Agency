import { put } from "@vercel/blob";

// Upload das fotos dos sites (logotipo, capa, sobre, serviços) para o Vercel Blob.
// A sessão é validada no backend (/api/auth/me) e só utilizadores Pro podem enviar.
// O browser já comprime a foto antes de a enviar; aqui confirmamos pelos primeiros
// bytes que é mesmo uma imagem JPEG, PNG ou WebP (o tipo declarado não chega).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAX_BYTES = 4 * 1024 * 1024;
const KINDS = new Set(["logo", "capa", "sobre", "servico"]);

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sniffImageType(bytes: Uint8Array): { type: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { type: "image/png", ext: "png" };
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return { type: "image/webp", ext: "webp" };
  return null;
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth || !/^Bearer [\w.-]+$/.test(auth)) return json({ message: "Sessão inválida. Entra novamente." }, 401);

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return json({ message: "O armazenamento de fotos ainda não está ligado ao projeto." }, 503);
  }

  // Quem está a enviar? (o backend valida o token)
  let user: { id: string; plan: string } | null = null;
  try {
    const me = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: auth }, cache: "no-store" });
    if (me.status === 401) return json({ message: "Sessão expirada." }, 401);
    if (!me.ok) return json({ message: "Não foi possível validar a sessão. Tenta de novo." }, 502);
    const body = (await me.json()) as { user?: { id: string; plan: string } };
    user = body.user ?? null;
  } catch {
    return json({ message: "O servidor está a acordar. Tenta de novo daqui a uns segundos." }, 502);
  }
  if (!user?.id) return json({ message: "Sessão inválida." }, 401);
  if (user.plan !== "PRO") {
    return json({ message: "O criador de sites é exclusivo do plano Pro.", upgradeRequired: true }, 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ message: "Pedido inválido." }, 400);
  }
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  if (!(file instanceof Blob)) return json({ message: "Nenhuma foto recebida." }, 400);
  if (!KINDS.has(kind)) return json({ message: "Tipo de foto inválido." }, 400);
  if (file.size === 0 || file.size > MAX_BYTES) return json({ message: "A foto tem de ter menos de 4 MB." }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = sniffImageType(bytes);
  if (!detected) return json({ message: "Formato não suportado. Usa JPG, PNG ou WebP." }, 415);

  try {
    const blob = await put(`sites/${user.id}/${kind}.${detected.ext}`, Buffer.from(bytes), {
      access: "public",
      contentType: detected.type,
      addRandomSuffix: true, // URL impossível de adivinhar e sem colisões
      cacheControlMaxAge: 60 * 60 * 24 * 365, // o ficheiro nunca muda: cache de 1 ano
    });
    return json({ url: blob.url }, 201);
  } catch (err) {
    console.error("Falha no upload para o Vercel Blob:", err);
    return json({ message: "Não foi possível guardar a foto. Tenta de novo." }, 502);
  }
}
