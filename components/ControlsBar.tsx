"use client";

import { COLORS, FONT_MONO } from "@/lib/theme";
import type { AnsiPalette, OutputMode } from "@/lib/types";

interface ControlsBarProps {
  mode: OutputMode;
  width: number;
  contrast: number;
  brightness: number;
  fontSize: number;
  palette: AnsiPalette;
  onWidthChange: (n: number) => void;
  onContrastChange: (n: number) => void;
  onBrightnessChange: (n: number) => void;
  onFontSizeChange: (n: number) => void;
  onPaletteChange: (p: AnsiPalette) => void;
}

const labelStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: COLORS.muted,
  display: "block",
  marginBottom: 8,
};

function sliderStyle(): React.CSSProperties {
  return { width: "100%", accentColor: COLORS.accent };
}

function segButtonStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "6px 14px",
    cursor: "pointer",
    background: active ? COLORS.accent : "transparent",
    color: active ? COLORS.bg : COLORS.muted,
    border: `1px solid ${active ? COLORS.accent : COLORS.borderStrong}`,
  };
}

export function ControlsBar({
  mode,
  width,
  contrast,
  brightness,
  fontSize,
  palette,
  onWidthChange,
  onContrastChange,
  onBrightnessChange,
  onFontSizeChange,
  onPaletteChange,
}: ControlsBarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "20px 32px",
        border: `1px solid ${COLORS.border}`,
        borderTop: "none",
        background: "#0c1220",
        padding: "22px 24px",
        marginTop: 18,
      }}
    >
      <div style={{ flex: "1 1 160px" }}>
        <label htmlFor="width-slider" style={labelStyle}>Width — {width} cols</label>
        <input
          id="width-slider"
          type="range"
          min={40}
          max={220}
          step={2}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          style={sliderStyle()}
        />
      </div>

      <div style={{ flex: "1 1 160px" }}>
        <label htmlFor="contrast-slider" style={labelStyle}>Contrast — {contrast.toFixed(2)}</label>
        <input
          id="contrast-slider"
          type="range"
          min={0.3}
          max={2.2}
          step={0.05}
          value={contrast}
          onChange={(e) => onContrastChange(Number(e.target.value))}
          style={sliderStyle()}
        />
      </div>

      <div style={{ flex: "1 1 160px" }}>
        <label htmlFor="brightness-slider" style={labelStyle}>Brightness — {brightness.toFixed(2)}&times;</label>
        <input
          id="brightness-slider"
          type="range"
          min={0.2}
          max={2.0}
          step={0.02}
          value={brightness}
          onChange={(e) => onBrightnessChange(Number(e.target.value))}
          style={sliderStyle()}
        />
      </div>

      <div style={{ flex: "1 1 160px" }}>
        <label htmlFor="font-size-slider" style={labelStyle}>Font size — {fontSize}px</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            id="font-size-slider"
            type="range"
            min={2}
            max={32}
            step={0.5}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            style={sliderStyle()}
          />
          <input
            type="number"
            aria-label="Font size in pixels"
            min={0.5}
            step={0.5}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            style={{
              width: 56,
              background: "transparent",
              border: `1px solid ${COLORS.borderStrong}`,
              color: COLORS.text,
              fontFamily: FONT_MONO,
              fontSize: 12,
              padding: "4px 6px",
            }}
          />
        </div>
      </div>

      {mode === "ansi" && (
        <div style={{ flex: "1 1 100%" }}>
          <span id="ansi-palette-label" style={labelStyle}>ANSI Palette</span>
          <div role="group" aria-labelledby="ansi-palette-label" style={{ display: "flex", gap: 8 }}>
            {(["truecolor", "256", "bbs16"] as AnsiPalette[]).map((p) => (
              <button key={p} onClick={() => onPaletteChange(p)} style={segButtonStyle(palette === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
