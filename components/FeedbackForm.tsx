"use client";

import { useEffect, useState } from "react";
import { submitFeedback, readScreenshot, type FeedbackKind } from "@/lib/feedback";
import { getBrowserInfo } from "@/lib/browser-info";
import { getLastJobState, type LastJobState } from "@/lib/job-state";
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

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: COLORS.muted,
  marginBottom: 8,
};

export function FeedbackForm() {
  const [kind, setKind] = useState<FeedbackKind>("feedback");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [browser, setBrowser] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [jobState, setJobState] = useState<LastJobState | null>(null);
  const [includeJobState, setIncludeJobState] = useState(true);

  useEffect(() => {
    setBrowser(getBrowserInfo(navigator.userAgent));
    setJobState(getLastJobState());
  }, []);

  async function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotError(null);
    try {
      const dataUrl = await readScreenshot(file);
      setScreenshot(dataUrl);
      setScreenshotName(file.name);
    } catch (err) {
      setScreenshot(null);
      setScreenshotName(null);
      setScreenshotError(err instanceof Error ? err.message : "Could not read screenshot");
    }
  }

  function removeScreenshot() {
    setScreenshot(null);
    setScreenshotName(null);
    setScreenshotError(null);
  }

  const tooShort = text.trim().length < MIN_LENGTH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || status === "sending") return;

    setStatus("sending");
    const ok = await submitFeedback(kind, text.trim(), {
      screenshot,
      jobState: kind === "bug" && includeJobState ? jobState : null,
    });
    if (ok) {
      setStatus("sent");
      setText("");
      removeScreenshot();
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

      {tooShort && text.length > 0 && (
        <div style={{ marginTop: 8, fontFamily: FONT_MONO, fontSize: 11, color: COLORS.muted }}>
          {MIN_LENGTH - text.trim().length} more character{MIN_LENGTH - text.trim().length === 1 ? "" : "s"} needed
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div style={FIELD_LABEL_STYLE}>Browser</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: COLORS.text }}>
          {browser || "Detecting…"}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={FIELD_LABEL_STYLE}>Screenshot (optional)</div>
        {screenshot ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={screenshot}
              alt="Screenshot preview"
              style={{ maxHeight: 80, border: `1px solid ${COLORS.border}` }}
            />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.muted }}>
              {screenshotName}
            </span>
            <button
              type="button"
              onClick={removeScreenshot}
              style={{
                background: "none",
                border: "none",
                color: COLORS.muted,
                cursor: "pointer",
                fontFamily: FONT_MONO,
                fontSize: 12,
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept="image/*"
            onChange={handleScreenshotChange}
            style={{ fontFamily: FONT_MONO, fontSize: 12, color: COLORS.muted }}
          />
        )}
        {screenshotError && (
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.muted, marginTop: 6 }}>
            {screenshotError}
          </div>
        )}
      </div>

      {kind === "bug" && jobState && (
        <div style={{ marginTop: 20 }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeJobState}
              onChange={(e) => setIncludeJobState(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              <span style={{ ...FIELD_LABEL_STYLE, display: "block", marginBottom: 4 }}>
                Include last conversion settings
              </span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: COLORS.muted }}>
                mode={jobState.params.mode}, width={jobState.params.width}
                {jobState.error ? ` — last attempt failed: "${jobState.error}"` : ""}
              </span>
            </span>
          </label>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24 }}>
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
