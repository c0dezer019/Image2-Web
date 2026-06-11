import { charCellSize } from "./canvas-render";
import type { AnsiResult, AsciiResult, ConvertParams } from "./types";

export async function convertImage(
  file: Blob,
  params: ConvertParams,
): Promise<AsciiResult | AnsiResult> {
  const { w: charW, h: charH } = charCellSize(params.fontSize);

  let width = params.width;
  let imgHeightRows = 0;
  if (params.mode === "ascii") {
    if (params.imgWidth > 0) {
      width = Math.max(1, Math.round(params.imgWidth / charW));
    }
    if (params.imgHeight > 0) {
      imgHeightRows = Math.max(1, Math.round(params.imgHeight / charH));
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
