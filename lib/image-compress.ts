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
