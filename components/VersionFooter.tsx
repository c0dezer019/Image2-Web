"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";
import { CLIENT_VERSION, getServerVersion } from "@/lib/convert";

/**
 * Small build-version readout for both halves of the app. The frontend
 * (Vercel) and image2 server (Railway) deploy independently, so a stale
 * server build can silently reintroduce fixed bugs (e.g. output-size
 * limits) even though the frontend already accounts for them. Comparing
 * these two versions is the fastest way to spot that mismatch.
 */
export function VersionFooter() {
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    getServerVersion()
      .then(setServerVersion)
      .catch(() => setServerVersion("unreachable"));
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: 32,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: COLORS.muted,
        opacity: 0.6,
      }}
    >
      web {CLIENT_VERSION} &middot; server {serverVersion ?? "…"}
    </div>
  );
}
