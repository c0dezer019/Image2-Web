"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchSession } from "@/lib/convert";
import type { AnsiPalette, OutputMode } from "@/lib/types";

interface SessionLoaderProps {
  onFile: (file: File) => void;
  onMode: (mode: OutputMode) => void;
  onContrast: (v: number) => void;
  onBrightness: (v: number) => void;
  onSharpness: (v: number) => void;
  onSaturate: (v: number) => void;
  onMinLum: (v: number) => void;
  onWidth: (v: number) => void;
  onPalette: (v: AnsiPalette) => void;
}

function parseNum(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function SessionLoader({
  onFile, onMode, onContrast, onBrightness,
  onSharpness, onSaturate, onMinLum, onWidth, onPalette,
}: SessionLoaderProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (!sessionId) return;

    const modeParam = searchParams.get("mode");
    if (modeParam === "ascii" || modeParam === "ansi") onMode(modeParam);

    const palette = searchParams.get("palette");
    if (palette === "truecolor" || palette === "256" || palette === "bbs16") {
      onPalette(palette);
    }

    const mappings: Array<[string, (v: number) => void]> = [
      ["contrast",   onContrast],
      ["brightness", onBrightness],
      ["sharpness",  onSharpness],
      ["saturate",   onSaturate],
      ["min_lum",    onMinLum],
      ["width",      onWidth],
    ];
    for (const [key, setter] of mappings) {
      const n = parseNum(searchParams.get(key));
      if (n !== null) setter(n);
    }

    fetchSession(sessionId)
      .then((blob) => {
        onFile(new File([blob], "upload", { type: blob.type || "image/png" }));
      })
      .catch(() => {
        // Session expired or server not running — silently ignore
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
