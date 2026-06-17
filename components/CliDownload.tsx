"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";

const WIN_TAG = "v1.2.2b";
const WIN_VERSION = "1.2.2";
const LINUX_TAG = "v1.2.2b";
const LINUX_VERSION = "1.2.2";
const MAC_TAG = "v1.2.2c";

const BASE = "https://github.com/c0dezer019/image2/releases/download";
const RELEASES_URL = "https://github.com/c0dezer019/image2/releases/latest";

type PlatformInfo = { label: string; url: string };

export function detectPlatform(ua: string): PlatformInfo | null {
  if (ua.includes("Windows")) {
    return {
      label: "Windows x86_64",
      url: `${BASE}/${WIN_TAG}/img2-${WIN_VERSION}-windows-x86_64.exe`,
    };
  }
  if (ua.includes("Linux")) {
    if (ua.includes("aarch64")) {
      return {
        label: "Linux arm64",
        url: `${BASE}/${LINUX_TAG}/img2_${LINUX_VERSION}_arm64.deb`,
      };
    }
    return {
      label: "Linux x86_64",
      url: `${BASE}/${LINUX_TAG}/img2_${LINUX_VERSION}_amd64.deb`,
    };
  }
  if (ua.includes("Mac")) {
    return {
      label: "macOS (Apple Silicon)",
      url: `${BASE}/${MAC_TAG}/img2-macos-arm64`,
    };
  }
  return null;
}

export function CliDownload() {
  // undefined = not yet mounted (SSR); null = mounted, platform unknown
  const [platform, setPlatform] = useState<PlatformInfo | null | undefined>(undefined);

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent));
  }, []);

  if (platform === undefined) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        marginBottom: 32,
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {platform && (
        <a
          href={platform.url}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            textDecoration: "none",
            letterSpacing: "inherit",
          }}
        >
          ↓ Download for {platform.label}
        </a>
      )}
      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: COLORS.muted,
          textDecoration: "none",
          letterSpacing: "inherit",
        }}
      >
        All platforms →
      </a>
    </div>
  );
}
