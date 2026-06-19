"use client";

import { useEffect, useState } from "react";
import { buildFrontendPayload, reportCrash, type CrashPayload } from "@/lib/crash-reporter";
import { CrashReportBanner } from "@/components/CrashReportBanner";
import { COLORS, FONT_MONO } from "@/lib/theme";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [failedPayload, setFailedPayload] = useState<CrashPayload | null>(null);

  useEffect(() => {
    const payload = buildFrontendPayload(error, null);
    reportCrash(payload).then((result) => {
      if (result) setFailedPayload(result);
    });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        fontFamily: FONT_MONO,
      }}
    >
      <p style={{ color: COLORS.muted, marginBottom: 24 }}>Something went wrong.</p>
      <button
        onClick={reset}
        style={{
          background: "none",
          border: `1px solid ${COLORS.accent}`,
          color: COLORS.accent,
          cursor: "pointer",
          fontFamily: FONT_MONO,
          fontSize: 12,
          padding: "6px 16px",
          letterSpacing: "0.1em",
          marginBottom: failedPayload ? 24 : 0,
        }}
      >
        Try again
      </button>
      {failedPayload && (
        <div style={{ width: "100%", maxWidth: 700 }}>
          <CrashReportBanner
            payload={failedPayload}
            onDismiss={() => setFailedPayload(null)}
          />
        </div>
      )}
    </div>
  );
}
