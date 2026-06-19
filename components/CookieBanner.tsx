"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type ConsentState,
  getConsent,
  setConsent,
  setCrashConsent,
} from "@/lib/cookie-consent";
import { COLORS, FONT_MONO } from "@/lib/theme";

export function CookieBanner() {
  const [consent, setConsentState] = useState<ConsentState>("accepted");
  const [crashLogging, setCrashLogging] = useState(true);

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  function handle(state: "accepted" | "rejected") {
    setConsent(state);
    setCrashConsent(crashLogging ? "accepted" : "rejected");
    setConsentState(state);
  }

  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 280,
        background: COLORS.bg,
        border: `1px solid ${COLORS.borderStrong}`,
        padding: 20,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        zIndex: 9999,
        boxSizing: "border-box" as const,
      }}
    >
      <div style={{ color: COLORS.text, marginBottom: 12 }}>Cookies</div>
      <p
        style={{
          color: COLORS.muted,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "none",
          lineHeight: 1.5,
          margin: "0 0 16px",
        }}
      >
        We use cookies to improve your experience. See our{" "}
        <Link href="/privacy" style={{ color: COLORS.muted, textDecoration: "underline" }}>
          Privacy Policy
        </Link>{" "}
        for details.
      </p>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 16,
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "none",
          color: COLORS.muted,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={crashLogging}
          onChange={(e) => setCrashLogging(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        Send crash reports to help us fix bugs
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => handle("rejected")}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "transparent",
            border: `1px solid ${COLORS.muted}`,
            color: COLORS.muted,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => handle("accepted")}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "transparent",
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
