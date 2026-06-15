/**
 * Pure helpers for the Image width/height aspect-ratio lock. Ratios are
 * expressed as width / height. `null` ratio on a preset means "Original" —
 * resolve it against the source image's aspect ratio at the call site.
 */

export interface AspectRatioPreset {
  label: string;
  ratio: number | null;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { label: "Original", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "21:9", ratio: 21 / 9 },
  { label: "2:3", ratio: 2 / 3 },
];

export function heightForWidth(width: number, ratio: number): number {
  if (ratio <= 0) return 0;
  return Math.max(0, Math.round(width / ratio));
}

export function widthForHeight(height: number, ratio: number): number {
  if (ratio <= 0) return 0;
  return Math.max(0, Math.round(height * ratio));
}
