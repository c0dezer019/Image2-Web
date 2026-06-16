import { charCellSize } from "./canvas-render";
import type { AnsiResult, AsciiResult, AutoParams, ConvertParams } from "./types";

// Calls go straight to the image2 FastAPI server, bypassing Next.js API
// routes. Vercel Functions cap request bodies at 4.5MB, which 413s on
// larger image uploads; the Python server has no such limit and already
// allows this app's origins via CORS (see server/main.py).
const SERVER_URL = (process.env.NEXT_PUBLIC_IMAGE2_SERVER_URL
  || process.env.NEXT_DEV_IMAGE2_SERVER_URL) || "http://localhost:8000";


/** Fetches the image2 server's version and status from /health. */
export async function getServerHealth(): Promise<{ version: string; status: string }> {
  const res = await fetch(`${SERVER_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  const data = await res.json();
  return { version: data.version ?? "unknown", status: data.status ?? "unknown" };
}

/** @deprecated Use getServerHealth instead. */
export async function getServerVersion(): Promise<string> {
  return (await getServerHealth()).version;
}

// Mirrors server/main.py's `_validate_output_size` limits. The "Image
// width/height" controls reflect the source image's real pixel dimensions
// (see app/page.tsx's handleFile), which can translate to a cols/rows grid
// larger than the server allows — especially at small font sizes. Clamp the
// requested grid down to fit (preserving its aspect ratio) so conversions
// never 422 with "Output dimensions exceed server limits"; the output is
// simply capped at the largest size the server permits.
const MAX_OUTPUT_COLS = 600;
const MAX_OUTPUT_ROWS = 600;
const MAX_OUTPUT_CELLS = 250_000;

function clampOutputSize(cols: number, rows: number): { cols: number; rows: number } {
  let scale = 1;
  if (cols > MAX_OUTPUT_COLS) scale = Math.min(scale, MAX_OUTPUT_COLS / cols);
  if (rows > MAX_OUTPUT_ROWS) scale = Math.min(scale, MAX_OUTPUT_ROWS / rows);
  if (cols * rows > MAX_OUTPUT_CELLS) {
    scale = Math.min(scale, Math.sqrt(MAX_OUTPUT_CELLS / (cols * rows)));
  }
  return {
    cols: Math.max(1, Math.floor(cols * scale)),
    rows: Math.max(1, Math.floor(rows * scale)),
  };
}

// image2 CLI's `--min` (min mode) caps the rendered font size to 8px for
// PNG-style output (`apply_min_cap(font_size, 8, args.min)`). This app's
// canvas output is PNG-like, so the same cap is used for both grid-size
// calculations and final rendering.
export const DENSE_FONT_SIZE_CAP = 8;

/** Applies image2 CLI's `--min` (min mode) font-size cap, if enabled. */
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

  const res = await fetch(`${SERVER_URL}/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Analyze failed (${res.status})`);
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
  // image2 CLI's `--min` (min mode) caps font size to 8px before deriving
  // cols/rows from imgWidth/imgHeight.
  const safeFontSize = effectiveFontSize(params.fontSize, params.mode === "ascii" && params.dense);
  const { w: charW, h: charH } = charCellSize(safeFontSize);

  let width = Math.max(1, Math.round(params.width));
  let imgHeightRows = 0;
  // Rows the server is expected to derive from `width` (and `img_height` for
  // ascii). Tracked purely for the request-size log below, so a 422 can be
  // diagnosed without reproducing the calculation by hand.
  let estimatedServerRows = 0;
  if (params.mode === "ascii") {
    if (params.imgWidth > 0 && charW > 0) {
      const nextWidth = Math.round(params.imgWidth / charW);
      if (Number.isFinite(nextWidth)) width = Math.max(1, nextWidth);
    }
    if (params.imgHeight > 0 && charH > 0) {
      const nextHeight = Math.round(params.imgHeight / charH);
      if (Number.isFinite(nextHeight)) imgHeightRows = Math.max(1, nextHeight);
    }
    if (imgHeightRows > 0) {
      ({ cols: width, rows: imgHeightRows } = clampOutputSize(width, imgHeightRows));
    } else {
      width = Math.min(width, MAX_OUTPUT_COLS);
    }
    estimatedServerRows = imgHeightRows;
  } else {
    // ANSI mode doesn't send img_height, so the server estimates rows from
    // the source image's aspect ratio (cell_aspect=1.0, halved for ANSI's
    // double-height cells). Mirror that estimate here using imgWidth/imgHeight
    // (preserved through any client-side compression) to clamp consistently.
    if (params.imgWidth > 0 && params.imgHeight > 0) {
      const aspect = params.imgHeight / params.imgWidth;
      const estimatedRows = Math.max(1, Math.round((width * aspect) / 2));
      ({ cols: width, rows: estimatedServerRows } = clampOutputSize(width, estimatedRows));
    } else {
      width = Math.min(width, MAX_OUTPUT_COLS);
    }
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

  console.debug(
    `[image2] convert/${params.mode} request: ` +
      `cols=${width} rows~=${estimatedServerRows} cells~=${width * estimatedServerRows}`,
  );

  const res = await fetch(`${SERVER_URL}/convert/${params.mode}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 422) {
      console.error(
        `[image2] convert/${params.mode} 422 from server: ` +
          `sent cols=${width}, img_height=${imgHeightRows}. ` +
          `Check server /health "version" — client clamps to ${MAX_OUTPUT_COLS}x${MAX_OUTPUT_ROWS} ` +
          `/ ${MAX_OUTPUT_CELLS} cells; an older server build may enforce stricter limits.`,
      );
    }
    throw new Error(body.detail || `Conversion failed (${res.status})`);
  }

  return res.json();
}
