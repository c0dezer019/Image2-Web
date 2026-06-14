/**
 * Client-side image compression for uploads exceeding TARGET_BYTES.
 * Scales the image to fit MAX_DIMENSION on its longest side, then (if
 * still too large) steps encode quality down, falling back to JPEG for
 * formats without a usable quality knob (PNG/GIF).
 */

export const TARGET_BYTES = 10 * 1024 * 1024;
export const HARD_MAX_BYTES = 50 * 1024 * 1024;
export const MAX_DIMENSION = 4096;

const INITIAL_QUALITY = 0.92;
const QUALITY_FLOOR = 0.5;
const QUALITY_STEP = 0.1;
const SCALE_FACTOR = 0.85;
const MAX_SCALE_ROUNDS = 5;

const QUALITY_MIME_TYPES = new Set(["image/jpeg", "image/webp"]);

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function nextQuality(quality: number): number | null {
  const next = Math.round((quality - QUALITY_STEP) * 100) / 100;
  return next >= QUALITY_FLOOR ? next : null;
}

export function withJpegExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  return `${base}.jpg`;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image for compression"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode image"));
          return;
        }
        resolve(blob);
      },
      mime,
      quality,
    );
  });
}

function blobToFile(blob: Blob, originalName: string, mime: string): File {
  const name =
    mime === "image/jpeg" && !/\.jpe?g$/i.test(originalName)
      ? withJpegExtension(originalName)
      : originalName;
  return new File([blob], name, { type: mime });
}

/**
 * Returns `file` unchanged if it's already under TARGET_BYTES. Otherwise
 * scales it to fit MAX_DIMENSION on its longest side and re-encodes,
 * stepping quality down (falling back to JPEG for PNG/GIF) until the
 * result is under TARGET_BYTES, or returning the smallest result found
 * after MAX_SCALE_ROUNDS as a best effort.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  let { width, height } = computeScaledDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION);

  let bestBlob: Blob | null = null;
  let bestMime = file.type;

  for (let round = 0; round < MAX_SCALE_ROUNDS; round++) {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    let mime = file.type;
    let quality: number | undefined = QUALITY_MIME_TYPES.has(mime) ? INITIAL_QUALITY : undefined;

    while (true) {
      const blob = await canvasToBlob(canvas, mime, quality);
      bestBlob = blob;
      bestMime = mime;
      if (blob.size <= TARGET_BYTES) {
        return blobToFile(blob, file.name, mime);
      }

      if (quality !== undefined) {
        const next = nextQuality(quality);
        if (next !== null) {
          quality = next;
          continue;
        }
      }

      if (mime !== "image/jpeg") {
        mime = "image/jpeg";
        quality = INITIAL_QUALITY;
        continue;
      }

      break;
    }

    width = Math.max(1, Math.round(width * SCALE_FACTOR));
    height = Math.max(1, Math.round(height * SCALE_FACTOR));
  }

  return blobToFile(bestBlob as Blob, file.name, bestMime);
}
