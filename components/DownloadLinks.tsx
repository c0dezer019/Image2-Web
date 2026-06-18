"use client";

import { useEffect, useState } from "react";
import { detectPlatform, type ReleaseAssets, type PlatformDownload } from "@/lib/detect-platform";
import { COLORS, FONT_MONO } from "@/lib/theme";

const RELEASES_URL = "https://github.com/c0dezer019/image2/releases/latest";

type Props = {
  assets: ReleaseAssets;
  releasesUrl?: string;
};

export function DownloadLinks({ assets, releasesUrl = RELEASES_URL }: Props) {
  const [platform, setPlatform] = useState<PlatformDownload | null | undefined>(undefined);

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent, assets));
  }, [assets]);

  if (platform === undefined) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
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
        href={releasesUrl}
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
