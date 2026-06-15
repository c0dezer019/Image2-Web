"use client";

import { useState } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";
import type { AnsiPalette, OutputMode } from "@/lib/types";
import { ASPECT_RATIO_PRESETS, type AspectRatioPreset } from "@/lib/aspect-ratio";

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
  lockAspect: boolean;
  targetAspectRatio: number | null;
  sourceAspectRatio: number | null;
  bg: string;
  select: boolean;
  invert: boolean;
  blur: number;
  dense: boolean;
  monochrome: boolean;
  fontColor: string;
  hasFile: boolean;
  analyzing: boolean;
  optimizing: boolean;
  onAuto: () => void;
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
  onLockAspectChange: (locked: boolean) => void;
  onAspectPresetChange: (preset: AspectRatioPreset) => void;
  onBgChange: (s: string) => void;
  onSelectChange: (b: boolean) => void;
  onInvertChange: (b: boolean) => void;
  onBlurChange: (n: number) => void;
  onDenseChange: (b: boolean) => void;
  onMonochromeChange: (b: boolean) => void;
  onFontColorChange: (s: string) => void;
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

const ASPECT_RATIO_EPSILON = 0.005;

function isActivePreset(
  preset: AspectRatioPreset,
  targetAspectRatio: number | null,
  sourceAspectRatio: number | null,
): boolean {
  if (targetAspectRatio === null) return false;
  const presetRatio = preset.ratio ?? sourceAspectRatio;
  if (presetRatio === null) return false;
  return Math.abs(presetRatio - targetAspectRatio) < ASPECT_RATIO_EPSILON;
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

function SliderNumberInput({
  label,
  step,
  value,
  onCommit,
}: {
  label: string;
  step: number;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));

  function commit() {
    const n = Number(text);
    if (text.trim() === "" || !Number.isFinite(n) || n < 0) {
      setText(String(value));
      return;
    }
    onCommit(n);
  }

  return (
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
  );
}

/**
 * Range slider paired with a freeform number input. The slider is clamped to
 * [min, max]; the number input has no min/max, so typing a value beyond the
 * slider's range overrides it (the slider simply pegs at its end). Blank,
 * negative, or non-finite entries are rejected and revert to the last valid
 * value on blur.
 */
function SliderField({ id, label, value, min, max, step, onChange }: SliderFieldProps) {
  const sliderValue = Math.min(Math.max(value, min), max);

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
        <SliderNumberInput
          key={`${id}:${value}`}
          label={label}
          step={step}
          value={value}
          onCommit={onChange}
        />
      </div>
    </div>
  );
}

interface BgInputProps {
  bg: string;
  onBgChange: (s: string) => void;
}

function isValidCssColor(value: string): boolean {
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    return CSS.supports("color", value);
  }
  if (typeof document === "undefined") {
    return true;
  }
  const option = document.createElement("option");
  option.style.color = "";
  option.style.color = value;
  return option.style.color !== "";
}

/** Freeform background color input. Blank or invalid entries revert to the last value on blur. */
function BgInput({ bg, onBgChange }: BgInputProps) {
  const [text, setText] = useState(bg);

  function commit() {
    const value = text.trim();
    if (value === "" || !isValidCssColor(value)) {
      setText(bg);
      return;
    }
    onBgChange(value);
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

interface ColorInputProps {
  id: string;
  value: string;
  onChange: (s: string) => void;
  disabled?: boolean;
}

/** Freeform CSS color input. Blank or invalid entries revert to the last value on blur. */
function ColorInput({ id, value, onChange, disabled }: ColorInputProps) {
  const [text, setText] = useState(value);

  function commit() {
    const next = text.trim();
    if (next === "" || !isValidCssColor(next)) {
      setText(value);
      return;
    }
    onChange(next);
  }

  return (
    <input
      id={id}
      type="text"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={{ ...textInputStyle, opacity: disabled ? 0.4 : 1 }}
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
  lockAspect,
  targetAspectRatio,
  sourceAspectRatio,
  bg,
  select,
  invert,
  blur,
  dense,
  monochrome,
  fontColor,
  hasFile,
  analyzing,
  optimizing,
  onAuto,
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
  onLockAspectChange,
  onAspectPresetChange,
  onBgChange,
  onSelectChange,
  onInvertChange,
  onBlurChange,
  onDenseChange,
  onMonochromeChange,
  onFontColorChange,
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
      <div style={{ flex: "1 1 100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>
          Enhance — Contrast / Brightness / Saturate / Min luminance
        </span>
        <button
          type="button"
          onClick={onAuto}
          disabled={!hasFile || analyzing || optimizing}
          style={{
            ...segButtonStyle(false),
            opacity: !hasFile || analyzing || optimizing ? 0.4 : 1,
            cursor: !hasFile || analyzing || optimizing ? "default" : "pointer",
          }}
        >
          {optimizing ? "Optimizing…" : analyzing ? "Analyzing…" : "Auto"}
        </button>
      </div>

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

      <SliderField
        id="blur-slider"
        label={`Blur — ${blur.toFixed(1)}px`}
        value={blur}
        min={0}
        max={25}
        step={0.5}
        onChange={onBlurChange}
      />

      <div style={{ flex: "1 1 160px", display: "flex", alignItems: "flex-end" }}>
        <label
          htmlFor="invert-checkbox"
          style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <input
            id="invert-checkbox"
            type="checkbox"
            checked={invert}
            onChange={(e) => onInvertChange(e.target.checked)}
            style={{ accentColor: COLORS.accent }}
          />
          Invert colors
        </label>
      </div>

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

          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
            {(() => {
              const lockDisabled = sourceAspectRatio === null && (imgWidth === 0 || imgHeight === 0);
              return (
                <label
                  htmlFor="lock-aspect-checkbox"
                  style={{
                    ...labelStyle,
                    marginBottom: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: lockDisabled ? "default" : "pointer",
                    opacity: lockDisabled ? 0.4 : 1,
                  }}
                  title="Lock width/height to an aspect ratio"
                >
                  <input
                    id="lock-aspect-checkbox"
                    type="checkbox"
                    checked={lockAspect}
                    disabled={lockDisabled}
                    onChange={(e) => onLockAspectChange(e.target.checked)}
                    style={{ accentColor: COLORS.accent }}
                  />
                  🔗 Lock ratio
                </label>
              );
            })()}
          </div>

          <SliderField
            id="img-height-slider"
            label={`Image height — ${imgHeight ? `${imgHeight}px` : "auto"}`}
            value={imgHeight}
            min={0}
            max={2000}
            step={20}
            onChange={onImgHeightChange}
          />

          <div style={{ flex: "1 1 100%" }}>
            <span id="aspect-preset-label" style={labelStyle}>Aspect Ratio Presets</span>
            <div role="group" aria-labelledby="aspect-preset-label" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ASPECT_RATIO_PRESETS.map((preset) => {
                const disabled = preset.ratio === null && sourceAspectRatio === null;
                const active = isActivePreset(preset, targetAspectRatio, sourceAspectRatio);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onAspectPresetChange(preset)}
                    disabled={disabled}
                    style={{
                      ...segButtonStyle(active),
                      opacity: disabled ? 0.4 : 1,
                      cursor: disabled ? "default" : "pointer",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: "1 1 160px" }}>
            <label htmlFor="bg-input" style={labelStyle}>Background</label>
            <BgInput key={`bg:${bg}`} bg={bg} onBgChange={onBgChange} />
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

          <div style={{ flex: "1 1 160px", display: "flex", alignItems: "flex-end" }}>
            <label
              htmlFor="dense-checkbox"
              style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input
                id="dense-checkbox"
                type="checkbox"
                checked={dense}
                onChange={(e) => onDenseChange(e.target.checked)}
                style={{ accentColor: COLORS.accent }}
              />
              Min mode
            </label>
          </div>

          <div style={{ flex: "1 1 160px", display: "flex", alignItems: "flex-end" }}>
            <label
              htmlFor="monochrome-checkbox"
              style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input
                id="monochrome-checkbox"
                type="checkbox"
                checked={monochrome}
                onChange={(e) => onMonochromeChange(e.target.checked)}
                style={{ accentColor: COLORS.accent }}
              />
              Monochrome
            </label>
          </div>

          <div style={{ flex: "1 1 160px" }}>
            <label htmlFor="font-color-input" style={{ ...labelStyle, opacity: monochrome ? 1 : 0.4 }}>
              Font color
            </label>
            <ColorInput
              key={`font-color:${fontColor}`}
              id="font-color-input"
              value={fontColor}
              onChange={onFontColorChange}
              disabled={!monochrome}
            />
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
