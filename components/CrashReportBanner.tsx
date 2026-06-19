"use client";

import { useState } from "react";
import type { CrashPayload } from "@/lib/crash-reporter";
import { COLORS, FONT_MONO } from "@/lib/theme";

interface Props {
  payload: CrashPayload;
  onDismiss: () => void;
}

export function CrashReportBanner({ payload, onDismiss }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(payload, null, 2);
  const issueBody = encodeURIComponent("```json\n" + json + "\n```");
  const issueUrl =
    "https://github.com/c0dezer019/image2-web/issues/new?title=Crash+Report&body=" +
    issueBody;

  function handleCopy() {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      style={{
        marginTop: 16,
        border: `1px solid ${COLORS.accent}`,
        padding: "16px 20px",
        fontFamily: FONT_MONO,
        fontSize: 12,
        color: COLORS.text,
        background: COLORS.bg,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <p style={{ margin: 0, color: COLORS.muted }}>
          Crash report failed to send. Please report this manually.
        </p>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            color: COLORS.muted,
            cursor: "pointer",
            fontFamily: FONT_MONO,
            fontSize: 12,
            padding: 0,
            flexShrink: 0,
          }}
        >
          Dismiss
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: "none",
            border: `1px solid ${COLORS.muted}`,
            color: COLORS.muted,
            cursor: "pointer",
            fontFamily: FONT_MONO,
            fontSize: 11,
            padding: "4px 10px",
            letterSpacing: "0.1em",
          }}
        >
          {expanded ? "Hide report" : "Show report"}
        </button>
        <button
          onClick={handleCopy}
          style={{
            background: "none",
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            cursor: "pointer",
            fontFamily: FONT_MONO,
            fontSize: 11,
            padding: "4px 10px",
            letterSpacing: "0.1em",
          }}
        >
          {copied ? "Copied!" : "Copy report"}
        </button>
        <a
          href={issueUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            fontFamily: FONT_MONO,
            fontSize: 11,
            padding: "4px 10px",
            letterSpacing: "0.1em",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Open GitHub issue
        </a>
      </div>

      {expanded && (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            background: "#0d1117",
            color: COLORS.text,
            fontSize: 11,
            overflowX: "auto",
            border: `1px solid ${COLORS.muted}`,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {json}
        </pre>
      )}
    </div>
  );
}
