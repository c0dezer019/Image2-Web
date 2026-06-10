import type { AnsiResult, AsciiResult, ConvertParams } from "./types";

export async function convertImage(
  file: Blob,
  params: ConvertParams,
): Promise<AsciiResult | AnsiResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("width", String(params.width));
  form.append("contrast", String(params.contrast));
  form.append("brightness", String(params.brightness));
  if (params.mode === "ansi") {
    form.append("palette", params.palette);
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
