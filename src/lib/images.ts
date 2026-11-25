/*
 * Compresión de imágenes en el navegador antes de guardarlas en Firestore
 * (un documento admite como máximo 1 MiB). Se reescala a 2048 px como mucho
 * y se codifica en WebP (JPEG si el navegador no sabe codificar WebP),
 * bajando calidad y tamaño hasta que quepa.
 */

/** Tamaño máximo del archivo comprimido (margen bajo 1 MiB por documento). */
export const MAX_IMAGE_BYTES = 750 * 1024;
/** Lo que se acepta del disco o del portapapeles, antes de comprimir. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];

const MAX_DIMENSION = 2048;
/** Por debajo de esto, una imagen ya razonable se guarda tal cual (sin perder calidad). */
const KEEP_ORIGINAL_BYTES = 350 * 1024;
const STORABLE_TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif"];

export type CompressedImage = { blob: Blob; mimeType: string; width: number; height: number };

/** Motivo para rechazar un archivo antes de procesarlo, o null si es válido. */
export function imageRejection(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `«${file.name}» no es PNG, JPG, WebP, GIF ni AVIF.`;
  if (file.size > MAX_SOURCE_BYTES) return `«${file.name}» pesa más de 25 MB.`;
  return null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Lado de las fotos de perfil y de las imágenes de proyecto (cuadradas). */
export const SQUARE_IMAGE_SIZE = 512;

/**
 * Miniatura de una imagen de tarea (portada de la tarjeta y rejilla del
 * panel): 480 px como mucho y ≤ 70 KB, para que el tablero cargue rápido.
 */
export async function compressThumbnail(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
    for (let round = 0; round < 4; round++) {
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no puede procesar imágenes.");
      context.drawImage(bitmap, 0, 0, w, h);
      for (const quality of [0.72, 0.55]) {
        let blob = await canvasToBlob(canvas, "image/webp", quality);
        if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality);
        if (blob && blob.size <= 70 * 1024) return { blob, mimeType: blob.type, width: w, height: h };
      }
      scale *= 0.7;
    }
    throw new Error(`«${file.name}» no se puede reducir para la miniatura.`);
  } finally {
    bitmap.close();
  }
}
/** Tope de bytes de una imagen cuadrada (las reglas admiten hasta 150 KB). */
const MAX_SQUARE_BYTES = 120 * 1024;

/**
 * Foto de perfil o imagen de proyecto: recorte cuadrado centrado a 256 px y
 * WebP. Ocupa unos 10–30 KB, así que cargarla en cada avatar sale barato.
 */
export async function compressSquareImage(file: File, size = SQUARE_IMAGE_SIZE): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.round((bitmap.width - side) / 2);
    const sy = Math.round((bitmap.height - side) / 2);
    const target = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no puede procesar imágenes.");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
    for (const quality of [0.86, 0.72, 0.55]) {
      let blob = await canvasToBlob(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= MAX_SQUARE_BYTES) return { blob, mimeType: blob.type, width: target, height: target };
    }
    throw new Error(`«${file.name}» no se puede comprimir lo suficiente.`);
  } finally {
    bitmap.close();
  }
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const fits = Math.max(width, height) <= MAX_DIMENSION;

    // Ya es pequeña: se conserva intacta (los GIF mantienen su animación).
    if (STORABLE_TYPES.includes(file.type) && fits && file.size <= KEEP_ORIGINAL_BYTES) {
      return { blob: file, mimeType: file.type, width, height };
    }

    let scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    for (let round = 0; round < 6; round++) {
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("El navegador no puede procesar imágenes.");
      context.drawImage(bitmap, 0, 0, w, h);

      for (const quality of [0.86, 0.74, 0.6]) {
        let blob = await canvasToBlob(canvas, "image/webp", quality);
        // Safari antiguo no codifica WebP y devuelve PNG: usar JPEG.
        if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", quality);
        if (blob && blob.size <= MAX_IMAGE_BYTES) return { blob, mimeType: blob.type, width: w, height: h };
      }
      scale *= 0.75;
    }
    throw new Error(`«${file.name}» no se puede comprimir lo suficiente.`);
  } finally {
    bitmap.close();
  }
}
