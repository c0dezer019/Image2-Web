"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";
import type { AnsiPalette, OutputMode } from "@/lib/types";

interface ControlsBarProps {
  mode: OutputMode;
  width: number;
  contrast: number;
  brightness: number;
  sharpness: number;
  saturate: number;
  minLum: number;
  fontSize: number;
  palette: AnsiPalette;
  imgWidth: number;
  imgHeight: number;
  bg: string;
  select: boolean;
  onWidthChange: (n: number) => void;
  onContrastChange: (n: number) => void;
  onBrightnessChange: (n: number) => void;
  onSharpnessChange: (n: number) => void;
  onSaturateChange: (n: number) => void;
  onMinLumChange: (n: number) => void;
  onFontSizeChange: (n: number) => void;
  onPaletteChange: (p: AnsiPalette) => void;
  onImgWidthChange: (n: number) => void;
  onImgHeightChange: (n: number) => void;
  onBgChange: (s: string) => void;
  onSelectChange: (b: boolean) => void;
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

const numberInputStyle: React.CSSProperties = {
  width: 56,
  background: "transparent",
  border: `1px solid ${COLORS.borderStrong}`,
  color: COLORS.text,
  fontFamily: FONT_MONO,
  fontSize: 12,
  padding: "4px 6px",
};

const textInputStyle: React.CSSProperties = {
  ...numberInputStyle,
  width: "100%",
};

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

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}

/**
 * Range slider paired with a freeform number input. The slider is clamped to
 * [min, max]; the number input has no min/max, so typing a value beyond the
 * slider's range overrides it (the slider simply pegs at its end). Blank or
 * negative entries are rejected and revert to the last valid value on blur.
 */
function SliderField({ id, label, value, min, max, step, onChange }: SliderFieldProps) {
  const sliderValue = Math.min(Math.max(value, min), max);
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const n = Number(text);
    if (text.trim() === "" || isNaN(n) || n < 0) {
      setText(String(value));
      return;
    }
    onChange(n);
  }

  return (
    <div style={{ flex: "1 1 160px" }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={(e) => onChange(Number(e.target.value))}
          style={sliderStyle()}
        />
        <input
          type="number"
          aria-label={label}
          step={step}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          style={numberInputStyle}
        />
      </div>
    </div>
  );
}

interface BgInputProps {
  bg: string;
  onBgChange: (s: string) => void;
}

/** Freeform background color input. Blank entries revert to the last value on blur. */
function BgInput({ bg, onBgChange }: BgInputProps) {
  const [text, setText] = useState(bg);

  useEffect(() => {
    setText(bg);
  }, [bg]);

  function commit() {
    if (text.trim() === "") {
      setText(bg);
      return;
    }
    onBgChange(text);
  }

  return (
    <input
      id="bg-input"
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={textInputStyle}
    />
  );
}

export function ControlsBar({
  mode,
  width,
  contrast,
  brightness,
  sharpness,
  saturate,
  minLum,
  fontSize,
  palette,
  imgWidth,
  imgHeight,
  bg,
  select,
  onWidthChange,
  onContrastChange,
  onBrightnessChange,
  onSharpnessChange,
  onSaturateChange,
  onMinLumChange,
  onFontSizeChange,
  onPaletteChange,
  onImgWidthChange,
  onImgHeightChange,
  onBgChange,
  onSelectChange,
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
      <SliderField
        id="width-slider"
        label={`Width — ${width} cols`}
        value={width}
        min={40}
        max={220}
        step={2}
        onChange={onWidthChange}
      />

      <SliderField
        id="contrast-slider"
        label={`Contrast — ${contrast.toFixed(2)}`}
        value={contrast}
        min={0.3}
        max={2.2}
        step={0.05}
        onChange={onContrastChange}
      />

      <SliderField
        id="brightness-slider"
        label={`Brightness — ${brightness.toFixed(2)}×`}
        value={brightness}
        min={0.2}
        max={2.0}
        step={0.02}
        onChange={onBrightnessChange}
      />

      <SliderField
        id="sharpness-slider"
        label={`Sharpness — ${sharpness.toFixed(2)}`}
        value={sharpness}
        min={0}
        max={5}
        step={0.1}
        onChange={onSharpnessChange}
      />

      <SliderField
        id="saturate-slider"
        label={`Saturate — ${saturate.toFixed(2)}×`}
        value={saturate}
        min={0}
        max={3}
        step={0.1}
        onChange={onSaturateChange}
      />

      <SliderField
        id="min-lum-slider"
        label={`Min luminance — ${minLum.toFixed(2)}`}
        value={minLum}
        min={0}
        max={1}
        step={0.05}
        onChange={onMinLumChange}
      />

      <SliderField
        id="font-size-slider"
        label={`Font size — ${fontSize}px`}
        value={fontSize}
        min={2}
        max={32}
        step={0.5}
        onChange={onFontSizeChange}
      />

      {mode === "ascii" && (
        <>
          <SliderField
            id="img-width-slider"
            label={`Image width — ${imgWidth ? `${imgWidth}px` : "auto"}`}
            value={imgWidth}
            min={0}
            max={2000}
            step={20}
            onChange={onImgWidthChange}
          />

          <SliderField
            id="img-height-slider"
            label={`Image height — ${imgHeight ? `${imgHeight}px` : "auto"}`}
            value={imgHeight}
            min={0}
            max={2000}
            step={20}
            onChange={onImgHeightChange}
          />

          <div style={{ flex: "1 1 160px" }}>
            <label htmlFor="bg-input" style={labelStyle}>Background</label>
            <BgInput bg={bg} onBgChange={onBgChange} />
          </div>

          <div style={{ flex: "1 1 160px", display: "flex", alignItems: "flex-end" }}>
            <label
              htmlFor="select-checkbox"
              style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input
                id="select-checkbox"
                type="checkbox"
                checked={select}
                onChange={(e) => onSelectChange(e.target.checked)}
                style={{ accentColor: COLORS.accent }}
              />
              Select highlight
            </label>
          </div>
        </>
      )}

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
