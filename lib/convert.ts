import { charCellSize } from "./canvas-render";
import type { AnsiResult, AsciiResult, AutoParams, ConvertParams } from "./types";

// image2 CLI's `--min` (dense mode) caps ascii output width to 100 cols
// (`apply_min_cap(width, 100, args.min)`).
const DENSE_WIDTH_CAP = 100;

// image2 CLI's `--min` (dense mode) also caps the rendered font size to 8px
// for PNG-style output (`apply_min_cap(font_size, 8, args.min)`). This app's
// canvas output is PNG-like, so the same cap is used for both grid-size
// calculations and final rendering.
export const DENSE_FONT_SIZE_CAP = 8;

/** Applies image2 CLI's `--min` dense-mode font-size cap, if enabled. */
export function effectiveFontSize(fontSize: number, dense: boolean): number {
  const safe = Math.max(1, fontSize);
  return dense ? Math.min(safe, DENSE_FONT_SIZE_CAP) : safe;
}

/**
 * Fetch auto-derived contrast/brightness/saturate/min_lum defaults for an
 * image, via `imgcommon.compute_auto_params`. Used to pre-fill the
 * enhancement sliders per uploaded image, mirroring the image2 CLI's
 * auto-detect-by-default behavior.
 *
 * `invert`/`blur` are forwarded so auto-detect runs on the post-invert/blur
 * image, matching the CLI's pipeline order (invert/blur happen before
 * `resolve_enhance_params`).
 */
export async function getAutoParams(file: Blob, invert: boolean, blur: number): Promise<AutoParams> {
  const form = new FormData();
  form.append("file", file);
  form.append("invert", String(invert));
  form.append("blur", String(blur));

  const res = await fetch("/api/analyze", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Analyze failed (${res.status})`);
  }

  const data = await res.json();
  return {
    contrast: data.contrast,
    brightness: data.brightness,
    saturate: data.saturate,
    minLum: data.min_lum,
  };
}

export async function convertImage(
  file: Blob,
  params: ConvertParams,
): Promise<AsciiResult | AnsiResult> {
  // image2 CLI's `--min` (dense mode) caps font size to 8px before deriving
  // cols/rows from imgWidth/imgHeight, same as it caps width below.
  const safeFontSize = effectiveFontSize(params.fontSize, params.mode === "ascii" && params.dense);
  const { w: charW, h: charH } = charCellSize(safeFontSize);

  let width = Math.max(1, Math.round(params.width));
  let imgHeightRows = 0;
  if (params.mode === "ascii") {
    if (params.imgWidth > 0 && charW > 0) {
      const nextWidth = Math.round(params.imgWidth / charW);
      if (Number.isFinite(nextWidth)) width = Math.max(1, nextWidth);
    }
    if (params.imgHeight > 0 && charH > 0) {
      const nextHeight = Math.round(params.imgHeight / charH);
      if (Number.isFinite(nextHeight)) imgHeightRows = Math.max(1, nextHeight);
    }
    // image2 CLI's `--min` (dense mode): only lowers, never raises.
    if (params.dense) width = Math.min(width, DENSE_WIDTH_CAP);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("width", String(width));
  form.append("contrast", String(params.contrast));
  form.append("brightness", String(params.brightness));
  form.append("sharpness", String(params.sharpness));
  form.append("saturate", String(params.saturate));
  form.append("min_lum", String(params.minLum));
  form.append("invert", String(params.invert));
  form.append("blur", String(params.blur));
  if (params.mode === "ansi") {
    form.append("palette", params.palette);
  } else {
    form.append("img_height", String(imgHeightRows));
  }

  const res = await fetch(`/api/convert?mode=${params.mode}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Conversion failed (${res.status})`);
  }

  return res.json();
}
