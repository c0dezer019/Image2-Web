"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import { heightForWidth, widthForHeight, type AspectRatioPreset } from "@/lib/aspect-ratio";
import { buildBackendPayload, reportCrash, type CrashPayload } from "@/lib/crash-reporter";
import { CrashReportBanner } from "@/components/CrashReportBanner";
import { saveLastJobState } from "@/lib/job-state";

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
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [targetAspectRatio, setTargetAspectRatio] = useState<number | null>(null);
  const [bg, setBg] = useState(BG_HEX);
  const [invert, setInvert] = useState(false);
  const [blur, setBlur] = useState(0);
  const [dense, setDense] = useState(false);
  const [monochrome, setMonochrome] = useState(false);
  const [fontColor, setFontColor] = useState("#ffffff");
  const [result, setResult] = useState<AsciiResult | AnsiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crashPayload, setCrashPayload] = useState<CrashPayload | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef(0);
  const originalFileRef = useRef<File | null>(null);

  const sourceAspectRatio = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : null;

  // fontSize and dense only affect the server request in ASCII mode when
  // explicit imgWidth/imgHeight are set (used to derive cols = imgWidth / charW
  // and rows = imgHeight / charH). In ANSI mode and ASCII auto-size mode they
  // are render-only — changing them should re-draw the canvas from the cached
  // result without a network round-trip.
  const asciiExplicitSize = mode === "ascii" && (imgWidth > 0 || imgHeight > 0);
  const gridKey = useMemo(() => JSON.stringify({
    mode, width, contrast, brightness, sharpness, saturate, minLum,
    palette, invert, blur,
    ...(asciiExplicitSize ? { fontSize, dense, imgWidth, imgHeight } : {}),
  }), [mode, width, contrast, brightness, sharpness, saturate, minLum,
    palette, invert, blur, asciiExplicitSize, fontSize, dense, imgWidth, imgHeight]);

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
      setCrashPayload(null);
      convertImage(file, params)
        .then((data) => {
          if (requestIdRef.current === id) {
            setResult(data);
            saveLastJobState(params, null);
          }
        })
        .catch((err: Error) => {
          if (requestIdRef.current === id) {
            setError(err.message);
            setResult(null);
            saveLastJobState(params, err.message);
            const endpoint = `/convert/${params.mode}`;
            const payload = buildBackendPayload(err.message, endpoint, params);
            reportCrash(payload).then((failed) => {
              if (failed) setCrashPayload(failed);
            });
          }
        });
    }, 250);
    return () => clearTimeout(timer);
  // gridKey encodes exactly the params that change what the server returns.
  // fontSize/dense/imgWidth/imgHeight are included in gridKey only when they
  // actually affect the request (ASCII + explicit image size); otherwise they
  // are render-only and don't trigger a server call.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, analyzing, optimizing, gridKey]);

  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if (mode === "ascii") {
      // image2 CLI's `--min` (min mode) caps rendered font size to 8px.
      const renderFontSize = effectiveFontSize(fontSize, dense);
      drawAsciiGrid(ctx, result as AsciiResult, renderFontSize, bg, monochrome, fontColor);
    } else {
      drawAnsiGrid(ctx, result as AnsiResult, fontSize);
    }
  }, [result, mode, fontSize, bg, monochrome, fontColor, dense]);

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
      .catch((err: unknown) => {
        setContrast(FIXED_ENHANCE_DEFAULTS.contrast);
        setBrightness(FIXED_ENHANCE_DEFAULTS.brightness);
        setSaturate(FIXED_ENHANCE_DEFAULTS.saturate);
        setMinLum(FIXED_ENHANCE_DEFAULTS.minLum);
      })
      .finally(() => setAnalyzing(false));
  }, [invert, blur]);

  const handleFile = useCallback((f: File) => {
    setError(null);
    originalFileRef.current = f;
    // Pre-fill the Image width/height controls with the source image's real
    // pixel dimensions, mirroring the image2 CLI's use of the actual image
    // size when deriving cols/rows. Read from the original file, before any
    // compression, so these always reflect the true source size. Leave them
    // at "auto" (0) if probing fails.
    getImageDimensions(f)
      .then(({ width, height }) => {
        setImgWidth(width);
        setImgHeight(height);
        setSourceWidth(width);
        setSourceHeight(height);
        // New image — drop any AR lock from the previous image rather than
        // applying a stale ratio to it.
        setTargetAspectRatio(null);
      })
      .catch(() => {
        setSourceWidth(0);
        setSourceHeight(0);
        setTargetAspectRatio(null);
      });

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
    // Reset the Image width/height controls back to the source image's real
    // pixel dimensions, same as on initial upload.
    const original = originalFileRef.current;
    if (original) {
      getImageDimensions(original)
        .then(({ width, height }) => {
          setImgWidth(width);
          setImgHeight(height);
        })
        .catch(() => {});
    }
  }, [file, runAutoParams]);

  const handleFontSizeChange = useCallback((n: number) => {
    if (!Number.isFinite(n)) return;
    setFontSize(Math.max(1, n));
  }, []);

  const handleBlurChange = useCallback((n: number) => {
    if (!Number.isFinite(n)) return;
    setBlur(Math.min(Math.max(0, n), 25));
  }, []);

  const handleImgWidthChange = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    const next = Math.round(n);
    setImgWidth(next);
    if (targetAspectRatio !== null) {
      setImgHeight(heightForWidth(next, targetAspectRatio));
    }
  }, [targetAspectRatio]);

  const handleImgHeightChange = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    const next = Math.round(n);
    setImgHeight(next);
    if (targetAspectRatio !== null) {
      setImgWidth(widthForHeight(next, targetAspectRatio));
    }
  }, [targetAspectRatio]);

  const handleLockAspectChange = useCallback((locked: boolean) => {
    if (!locked) {
      setTargetAspectRatio(null);
      return;
    }
    const ratio = sourceAspectRatio ?? (imgWidth > 0 && imgHeight > 0 ? imgWidth / imgHeight : null);
    if (ratio === null) return;
    setTargetAspectRatio(ratio);
  }, [sourceAspectRatio, imgWidth, imgHeight]);

  const handleAspectPresetChange = useCallback((preset: AspectRatioPreset) => {
    const ratio = preset.ratio ?? sourceAspectRatio;
    if (ratio === null) return;

    // If either field is "auto" (0), seed from the source image's pixel
    // dimensions before applying the ratio.
    const baseWidth = imgWidth === 0 || imgHeight === 0 ? sourceWidth : imgWidth;

    setTargetAspectRatio(ratio);
    if (baseWidth > 0) {
      setImgWidth(baseWidth);
      setImgHeight(heightForWidth(baseWidth, ratio));
    }
  }, [imgWidth, imgHeight, sourceWidth, sourceAspectRatio]);

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
      <style>{`
        @media (max-width: 1080px) { .cli-gutter { display: none !important; } }
        @media (max-width: 760px) {
          .section-controls { order: 3; }
          .section-output { order: 2; }
        }
      `}</style>
      <Link
        href="/download"
        className="cli-gutter"
        style={{
          position: "absolute",
          top: 46,
          right: 24,
          zIndex: 3,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: COLORS.accent,
          textDecoration: "none",
          border: `1px solid ${COLORS.accent}`,
          padding: "6px 12px",
        }}
      >
        Download CLI
      </Link>
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
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "46px 40px 120px", display: "flex", flexDirection: "column" }}>
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
          <div style={{ marginBottom: 18 }}>
            <a
              href="https://github.com/c0dezer019/image2-web"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", lineHeight: 0 }}
            >
              <img
                src="https://img.shields.io/github/stars/c0dezer019/image2-web?style=flat-square&color=46e3d0&labelColor=0d1117&logo=github&logoColor=46e3d0"
                alt="GitHub Stars"
                height="20"
              />
            </a>
          </div>
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

        <div className="section-drop" style={{ order: 1 }}>
          <DropZone fileName={file?.name ?? null} onFile={handleFile} onError={setError} />
        </div>

        <div className="section-controls" style={{ order: 2 }}>
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
            lockAspect={targetAspectRatio !== null}
            targetAspectRatio={targetAspectRatio}
            sourceAspectRatio={sourceAspectRatio}
            bg={bg}
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
            onImgWidthChange={handleImgWidthChange}
            onImgHeightChange={handleImgHeightChange}
            onLockAspectChange={handleLockAspectChange}
            onAspectPresetChange={handleAspectPresetChange}
            onBgChange={setBg}
            onInvertChange={setInvert}
            onBlurChange={handleBlurChange}
            onDenseChange={setDense}
            onMonochromeChange={setMonochrome}
            onFontColorChange={setFontColor}
          />
        </div>

        <div className="section-output" style={{ order: 3 }}>
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
          {crashPayload && (
            <CrashReportBanner
              payload={crashPayload}
              onDismiss={() => setCrashPayload(null)}
            />
          )}
        </div>

        <div style={{ order: 4 }}>
          <VersionFooter />
          <Footer />
        </div>
      </div>
    </div>
  );
}
