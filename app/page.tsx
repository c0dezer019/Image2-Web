"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { ControlsBar } from "@/components/ControlsBar";
import { OutputHeader } from "@/components/OutputHeader";
import { OutputCanvas } from "@/components/OutputCanvas";
import { COLORS, FONT_MONO } from "@/lib/theme";
import { convertImage } from "@/lib/convert";
import { drawAsciiGrid, drawAnsiGrid } from "@/lib/canvas-render";
import { downloadCanvasPng, downloadText } from "@/lib/export";
import type { AnsiPalette, AnsiResult, AsciiResult, OutputMode } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<OutputMode>("ascii");
  const [width, setWidth] = useState(100);
  const [contrast, setContrast] = useState(1.5);
  const [brightness, setBrightness] = useState(1.0);
  const [fontSize, setFontSize] = useState(6);
  const [palette, setPalette] = useState<AnsiPalette>("truecolor");
  const [result, setResult] = useState<AsciiResult | AnsiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!file) return;
    const id = ++requestIdRef.current;
    const params = { mode, width, contrast, brightness, fontSize, palette };
    const timer = setTimeout(() => {
      setError(null);
      convertImage(file, params)
        .then((data) => {
          if (requestIdRef.current === id) setResult(data);
        })
        .catch((err: Error) => {
          if (requestIdRef.current === id) {
            setError(err.message);
            setResult(null);
          }
        });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fontSize is render-only, not sent to backend
  }, [file, mode, width, contrast, brightness, palette]);

  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if (mode === "ascii") {
      drawAsciiGrid(ctx, result as AsciiResult, fontSize);
    } else {
      drawAnsiGrid(ctx, result as AnsiResult, fontSize);
    }
  }, [result, mode, fontSize]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
  }, []);

  function handleCopy() {
    if (!result) return;
    const text = mode === "ascii" ? (result as AsciiResult).text : (result as AnsiResult).ansiText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function handleDownloadTxt() {
    if (!result) return;
    const text = mode === "ascii" ? (result as AsciiResult).text : (result as AnsiResult).ansiText;
    downloadText("image2.txt", text);
  }

  function handleDownloadPng() {
    if (!canvasRef.current) return;
    downloadCanvasPng(canvasRef.current, "image2.png");
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "fixed",
          inset: "-72px",
          pointerEvents: "none",
          opacity: 0.5,
          backgroundImage: `linear-gradient(${COLORS.accentDim} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.accentDim} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          animation: "gridDrift 36s linear infinite",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(120% 80% at 50% -10%, transparent 50%, ${COLORS.bg} 100%)`,
        }}
      />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "46px 40px 120px" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 24,
                height: 24,
                border: `1px solid ${COLORS.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: COLORS.accent,
              }}
            >
              &gt;
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
              Image2
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.muted }}>
            The App Foundry
          </div>
        </nav>

        <header style={{ textAlign: "center", paddingBottom: 44 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: COLORS.accent, marginBottom: 18 }}>
            01 / IMAGE &rarr; TEXT ART
          </div>
          <h1 style={{ fontSize: "clamp(38px, 5.6vw, 68px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 0.96, margin: "0 0 18px" }}>
            Turn any image
            <br />
            into text art.
          </h1>
          <p style={{ maxWidth: 470, margin: "0 auto", fontSize: 17, lineHeight: 1.5, color: COLORS.muted }}>
            Drop a picture below. We forge it into crisp ASCII or full-color ANSI — tune it, then copy or export.
          </p>
        </header>

        <DropZone fileName={file?.name ?? null} onFile={handleFile} onError={setError} />

        <ControlsBar
          mode={mode}
          width={width}
          contrast={contrast}
          brightness={brightness}
          fontSize={fontSize}
          palette={palette}
          onWidthChange={setWidth}
          onContrastChange={setContrast}
          onBrightnessChange={setBrightness}
          onFontSizeChange={setFontSize}
          onPaletteChange={setPalette}
        />

        <OutputHeader
          mode={mode}
          onModeChange={setMode}
          onCopy={handleCopy}
          onDownloadTxt={handleDownloadTxt}
          onDownloadPng={handleDownloadPng}
          copied={copied}
          hasOutput={!!result}
        />

        <OutputCanvas ref={canvasRef} hasOutput={!!result} errorMessage={error} />
      </div>
    </div>
  );
}
