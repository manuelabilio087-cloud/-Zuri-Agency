// Reduz e comprime uma foto no browser antes do upload: fica com poucas centenas de KB,
// carrega depressa no telemóvel dos clientes e poupa o armazenamento grátis.
// Re-codificar também remove os metadados da câmara (incluindo a localização GPS).

export interface CompressOptions {
  maxSize: number; // lado maior, em píxeis
  quality?: number;
  keepTransparency?: boolean; // logotipos: mantém o fundo transparente
}

export class ImageError extends Error {}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // alguns browsers não aceitam as opções — tenta com <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageError("Não foi possível ler esta foto. Usa JPG, PNG ou WebP.");
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File, { maxSize, quality = 0.82, keepTransparency = false }: CompressOptions): Promise<Blob> {
  if (!file.type.startsWith("image/") && file.type !== "") {
    throw new ImageError("Escolhe um ficheiro de imagem (JPG, PNG ou WebP).");
  }
  if (file.size > 30 * 1024 * 1024) throw new ImageError("A foto é demasiado grande (máximo 30 MB).");

  const image = await decode(file);
  try {
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageError("O teu browser não conseguiu processar a foto.");
    if (!keepTransparency) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, 0, 0, width, height);

    // WebP é o mais leve; browsers antigos que não o geram devolvem PNG — nesse caso
    // usamos JPEG nas fotos e PNG nos logotipos (para manter a transparência).
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(canvas, keepTransparency ? "image/png" : "image/jpeg", quality);
    }
    // Ainda grande? baixa a qualidade uma vez.
    if (blob && blob.size > 1.2 * 1024 * 1024 && blob.type !== "image/png") {
      blob = (await toBlob(canvas, blob.type, 0.65)) ?? blob;
    }
    if (!blob) throw new ImageError("Não foi possível comprimir a foto.");
    if (blob.size > 4 * 1024 * 1024) throw new ImageError("A foto continua muito grande. Tenta outra.");
    return blob;
  } finally {
    image.close();
  }
}
