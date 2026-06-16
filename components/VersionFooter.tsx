"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";
import { CLIENT_VERSION, getServerHealth } from "@/lib/convert";

/**
 * Small build-version readout for both halves of the app. The frontend
 * (Vercel) and image2 server (Railway) deploy independently, so a stale
 * server build can silently reintroduce fixed bugs (e.g. output-size
 * limits) even though the frontend already accounts for them. Comparing
 * these two versions is the fastest way to spot that mismatch.
 */
export function VersionFooter() {
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<"ok" | "offline" | null>(null);

  useEffect(() => {
    getServerHealth()
      .then(({ version, status }) => {
        setServerVersion(version);
        setServerStatus(status === "ok" ? "ok" : "offline");
      })
      .catch(() => {
        setServerVersion("unreachable");
        setServerStatus("offline");
      });
  }, []);

  const statusDotColor =
    serverStatus === "ok" ? "#4ade80" : serverStatus === "offline" ? "#f87171" : COLORS.muted;

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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <span>web {CLIENT_VERSION}</span>
      <span>&middot;</span>
      <span>server {serverVersion ?? "…"}</span>
      {serverStatus !== null && (
        <>
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: statusDotColor,
              flexShrink: 0,
            }}
          />
          <span style={{ color: statusDotColor }}>
            {serverStatus === "ok" ? "online" : "offline"}
          </span>
        </>
      )}
    </div>
  );
}
