import { getBrowserInfo } from "./browser-info";
import type { LastJobState } from "./job-state";

export type FeedbackKind = "feedback" | "bug";

export const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;

export interface FeedbackOptions {
  /** Data URL (from FileReader.readAsDataURL) of an attached screenshot. */
  screenshot?: string | null;
  /** Last conversion attempt's params/error, attached for bug reports. */
  jobState?: LastJobState | null;
}

/** Reads an image file as a data URL, rejecting anything over MAX_SCREENSHOT_BYTES. */
export function readScreenshot(file: File): Promise<string> {
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return Promise.reject(new Error("Screenshot must be under 4MB"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read screenshot"));
    reader.readAsDataURL(file);
  });
}

/**
 * POSTs a feedback/bug report to /api/bug. Submitted without an
 * Authorization header — the route only requires the bearer token for
 * the img2 CLI's submissions.
 */
export async function submitFeedback(
  kind: FeedbackKind,
  text: string,
  options: FeedbackOptions = {},
): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const url = typeof window !== "undefined" ? window.location.href : "";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = userAgent ? getBrowserInfo(userAgent) : "";

  const common = {
    timestamp,
    url,
    userAgent,
    browser,
    screenshot: options.screenshot ?? null,
    jobParams: options.jobState?.params ?? null,
    jobError: options.jobState?.error ?? null,
  };

  const body =
    kind === "feedback"
      ? { type: "feedback", message: text, ...common }
      : { type: "bug", description: text, ...common };

  try {
    const res = await fetch("/api/bug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
