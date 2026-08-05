'use client';

/**
 * Lee un File de imagen y devuelve un data URL base64 redimensionado para caber
 * cómodamente en un documento de Firestore (límite ~1 MB). Reduce el lado mayor
 * a `maxDim` px y baja la calidad JPEG hasta quedar bajo `maxChars` (longitud
 * del data URL). Lanza con un mensaje claro si no es una imagen o no logra
 * comprimirse lo suficiente.
 */
export async function fileToCompressedDataUrl(
  file: File,
  { maxDim = 1024, maxChars = 600_000 }: { maxDim?: number; maxChars?: number } = {}
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen.');
  }

  const sourceUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('La imagen no es válida.'));
    el.src = sourceUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  // Fondo blanco: el JPEG no tiene transparencia.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  for (const quality of [0.85, 0.7, 0.55, 0.4, 0.3]) {
    const out = canvas.toDataURL('image/jpeg', quality);
    if (out.length <= maxChars) return out;
  }
  throw new Error('La imagen es demasiado grande incluso comprimida. Usa una más pequeña.');
}
