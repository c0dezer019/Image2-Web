import { charCellSize } from "./canvas-render";
import type { AnsiResult, AsciiResult, ConvertParams } from "./types";

export async function convertImage(
  file: Blob,
  params: ConvertParams,
): Promise<AsciiResult | AnsiResult> {
  const safeFontSize = Math.max(1, params.fontSize);
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
  }

  const form = new FormData();
  form.append("file", file);
  form.append("width", String(width));
  form.append("contrast", String(params.contrast));
  form.append("brightness", String(params.brightness));
  form.append("sharpness", String(params.sharpness));
  form.append("saturate", String(params.saturate));
  form.append("min_lum", String(params.minLum));
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
