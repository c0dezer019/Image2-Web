"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { ControlsBar } from "@/components/ControlsBar";
import { OutputHeader } from "@/components/OutputHeader";
import { OutputCanvas } from "@/components/OutputCanvas";
import { VersionFooter } from "@/components/VersionFooter";
import { Footer } from "@/components/Footer";
import { BG_HEX, COLORS, FONT_MONO } from "@/lib/theme";
import { convertImage, effectiveFontSize, getAutoParams } from "@/lib/convert";
import { getImageDimensions } from "@/lib/image-dimensions";
import { compressImageIfNeeded } from "@/lib/image-compress";
import { drawAsciiGrid, drawAnsiGrid } from "@/lib/canvas-render";
import { downloadCanvasPng, downloadText } from "@/lib/export";
import type { AnsiPalette, AnsiResult, AsciiResult, OutputMode } from "@/lib/types";

// Old fixed enhancement defaults (image2 CLI's --no-auto values). Used as
// the initial state before any image is analyzed, and as a fallback if
// auto-detection fails.
const FIXED_ENHANCE_DEFAULTS = {
  contrast: 1.5,
  brightness: 1.0,
  saturate: 1.0,
  minLum: 0.0,
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<OutputMode>("ascii");
  const [width, setWidth] = useState(100);
  const [contrast, setContrast] = useState(FIXED_ENHANCE_DEFAULTS.contrast);
  const [brightness, setBrightness] = useState(FIXED_ENHANCE_DEFAULTS.brightness);
  const [sharpness, setSharpness] = useState(2.5);
  const [saturate, setSaturate] = useState(FIXED_ENHANCE_DEFAULTS.saturate);
  const [minLum, setMinLum] = useState(FIXED_ENHANCE_DEFAULTS.minLum);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [fontSize, setFontSize] = useState(6);
  const [palette, setPalette] = useState<AnsiPalette>("truecolor");
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const [bg, setBg] = useState(BG_HEX);
  const [select, setSelect] = useState(false);
  const [invert, setInvert] = useState(false);
  const [blur, setBlur] = useState(0);
  const [dense, setDense] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  const [fontColor, setFontColor] = useState("#ffffff");
  const [result, setResult] = useState<AsciiResult | AnsiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Skip while auto-params are being derived for a newly uploaded image —
    // otherwise this fires once with the stale enhancement values and again
    // once analysis lands, producing a visible flash.
    if (!file || analyzing || optimizing) return;
    const id = ++requestIdRef.current;
    const params = {
      mode, width, contrast, brightness, sharpness, saturate, minLum,
      fontSize, palette, imgWidth, imgHeight, invert, blur, dense,
    };
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
  }, [file, analyzing, optimizing, mode, width, contrast, brightness, sharpness, saturate, minLum, fontSize, palette, imgWidth, imgHeight, invert, blur, dense]);

  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if (mode === "ascii") {
      // image2 CLI's `--min` (dense mode) caps rendered font size to 8px.
      const renderFontSize = effectiveFontSize(fontSize, dense);
      drawAsciiGrid(ctx, result as AsciiResult, renderFontSize, bg, select, monochrome, fontColor);
    } else {
      drawAnsiGrid(ctx, result as AnsiResult, fontSize);
    }
  }, [result, mode, fontSize, bg, select, monochrome, fontColor, dense]);

  const runAutoParams = useCallback((f: Blob) => {
    setAnalyzing(true);
    // invert/blur are pre-processing applied before auto-detect, mirroring
    // the CLI's pipeline order — pass the current values so auto-detect
    // reflects them.
    getAutoParams(f, invert, blur)
      .then((auto) => {
        setContrast(auto.contrast);
        setBrightness(auto.brightness);
        setSaturate(auto.saturate);
        setMinLum(auto.minLum);
      })
      .catch(() => {
        // Auto-detection failed (e.g. server unreachable) — fall back to
        // the old fixed defaults rather than leaving stale values.
        setContrast(FIXED_ENHANCE_DEFAULTS.contrast);
        setBrightness(FIXED_ENHANCE_DEFAULTS.brightness);
        setSaturate(FIXED_ENHANCE_DEFAULTS.saturate);
        setMinLum(FIXED_ENHANCE_DEFAULTS.minLum);
      })
      .finally(() => setAnalyzing(false));
  }, [invert, blur]);

  const handleFile = useCallback((f: File) => {
    setError(null);
    // Pre-fill the Image width/height controls with the source image's real
    // pixel dimensions, mirroring the image2 CLI's use of the actual image
    // size when deriving cols/rows. Read from the original file, before any
    // compression, so these always reflect the true source size. Leave them
    // at "auto" (0) if probing fails.
    getImageDimensions(f)
      .then(({ width, height }) => {
        setImgWidth(width);
        setImgHeight(height);
      })
      .catch(() => {});

    setOptimizing(true);
    compressImageIfNeeded(f)
      .then((compressed) => {
        setFile(compressed);
        runAutoParams(compressed);
      })
      .catch(() => {
        setError("Could not process image");
      })
      .finally(() => setOptimizing(false));
  }, [runAutoParams]);

  const handleAuto = useCallback(() => {
    if (!file) return;
    runAutoParams(file);
  }, [file, runAutoParams]);

  const handleFontSizeChange = useCallback((n: number) => {
    if (!Number.isFinite(n)) return;
    setFontSize(Math.max(1, n));
  }, []);

  const handleBlurChange = useCallback((n: number) => {
    if (!Number.isFinite(n)) return;
    setBlur(Math.min(Math.max(0, n), 25));
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
          sharpness={sharpness}
          saturate={saturate}
          minLum={minLum}
          fontSize={fontSize}
          palette={palette}
          imgWidth={imgWidth}
          imgHeight={imgHeight}
          bg={bg}
          select={select}
          invert={invert}
          blur={blur}
          dense={dense}
          monochrome={monochrome}
          fontColor={fontColor}
          hasFile={!!file}
          analyzing={analyzing}
          optimizing={optimizing}
          onAuto={handleAuto}
          onWidthChange={(n) => {
            if (!Number.isFinite(n)) return;
            setWidth(Math.max(1, Math.round(n)));
          }}
          onContrastChange={setContrast}
          onBrightnessChange={setBrightness}
          onSharpnessChange={setSharpness}
          onSaturateChange={setSaturate}
          onMinLumChange={setMinLum}
          onFontSizeChange={handleFontSizeChange}
          onPaletteChange={setPalette}
          onImgWidthChange={setImgWidth}
          onImgHeightChange={setImgHeight}
          onBgChange={setBg}
          onSelectChange={setSelect}
          onInvertChange={setInvert}
          onBlurChange={handleBlurChange}
          onDenseChange={setDense}
          onMonochromeChange={setMonochrome}
          onFontColorChange={setFontColor}
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

        <VersionFooter />
        <Footer />
      </div>
    </div>
  );
}
