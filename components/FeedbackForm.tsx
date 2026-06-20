"use client";

import { useState } from "react";
import { submitFeedback, type FeedbackKind } from "@/lib/feedback";
import { COLORS, FONT_MONO } from "@/lib/theme";

const MIN_LENGTH = 10;
const MAX_LENGTH = 4000;

const TOGGLE_BASE: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "8px 16px",
  border: `1px solid ${COLORS.border}`,
  background: "none",
  color: COLORS.muted,
  cursor: "pointer",
};

const TOGGLE_ACTIVE: React.CSSProperties = {
  border: `1px solid ${COLORS.accent}`,
  color: COLORS.accent,
};

export function FeedbackForm() {
  const [kind, setKind] = useState<FeedbackKind>("feedback");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const tooShort = text.trim().length < MIN_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || status === "sending") return;

    setStatus("sending");
    const ok = await submitFeedback(kind, text.trim());
    if (ok) {
      setStatus("sent");
      setText("");
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setKind("feedback")}
          style={kind === "feedback" ? { ...TOGGLE_BASE, ...TOGGLE_ACTIVE } : TOGGLE_BASE}
        >
          Feedback
        </button>
        <button
          type="button"
          onClick={() => setKind("bug")}
          style={kind === "bug" ? { ...TOGGLE_BASE, ...TOGGLE_ACTIVE } : TOGGLE_BASE}
        >
          Bug report
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_LENGTH}
        rows={8}
        placeholder={
          kind === "feedback"
            ? "What's working well? What could be better?"
            : "What happened? What did you expect to happen instead?"
        }
        style={{
          width: "100%",
          background: COLORS.bg,
          color: COLORS.text,
          border: `1px solid ${COLORS.border}`,
          padding: 14,
          fontFamily: FONT_MONO,
          fontSize: 13,
          lineHeight: 1.6,
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
        <button
          type="submit"
          disabled={tooShort || status === "sending"}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "10px 22px",
            border: `1px solid ${COLORS.accent}`,
            background: "none",
            color: COLORS.accent,
            cursor: tooShort || status === "sending" ? "default" : "pointer",
            opacity: tooShort || status === "sending" ? 0.5 : 1,
          }}
        >
          {status === "sending" ? "Sending…" : "Submit"}
        </button>

        {status === "sent" && (
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.accent }}>
            Thanks — got it.
          </span>
        )}
        {status === "error" && (
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.muted }}>
            Couldn&rsquo;t send that. Please try again later.
          </span>
        )}
      </div>
    </form>
  );
}
