"use client";

import { COLORS, FONT_MONO } from "@/lib/theme";
import type { OutputMode } from "@/lib/types";

interface OutputHeaderProps {
  mode: OutputMode;
  onModeChange: (m: OutputMode) => void;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onDownloadPng: () => void;
  copied: boolean;
  hasOutput: boolean;
}

const TABS: { label: string; value: OutputMode }[] = [
  { label: "Color ASCII", value: "ascii" },
  { label: "ANSI", value: "ansi" },
];

function tabStyle(active: boolean): React.CSSProperties {
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

export function OutputHeader({
  mode,
  onModeChange,
  onCopy,
  onDownloadTxt,
  onDownloadPng,
  copied,
  hasOutput,
}: OutputHeaderProps) {
  const disabledStyle: React.CSSProperties = hasOutput
    ? {}
    : { opacity: 0.4, pointerEvents: "none" };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginTop: 28,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: COLORS.accent }}>
          Output
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {TABS.map((tab) => (
            <button key={tab.value} onClick={() => onModeChange(tab.value)} style={tabStyle(mode === tab.value)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, ...disabledStyle }}>
        <button
          onClick={onCopy}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 14px",
            cursor: "pointer",
            background: copied ? COLORS.accent : "transparent",
            color: copied ? COLORS.bg : COLORS.accent,
            border: `1px solid ${COLORS.accent}`,
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={onDownloadTxt}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 14px",
            cursor: "pointer",
            background: "transparent",
            color: COLORS.muted,
            border: `1px solid ${COLORS.borderStrong}`,
          }}
        >
          .txt
        </button>
        <button
          onClick={onDownloadPng}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 14px",
            cursor: "pointer",
            background: "transparent",
            color: COLORS.muted,
            border: `1px solid ${COLORS.borderStrong}`,
          }}
        >
          .png
        </button>
      </div>
    </div>
  );
}
