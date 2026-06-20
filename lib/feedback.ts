export type FeedbackKind = "feedback" | "bug";

/**
 * POSTs a feedback/bug report to /api/bug. Submitted without an
 * Authorization header — the route only requires the bearer token for
 * the img2 CLI's submissions.
 */
export async function submitFeedback(kind: FeedbackKind, text: string): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const url = typeof window !== "undefined" ? window.location.href : "";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const body =
    kind === "feedback"
      ? { type: "feedback", message: text, timestamp, url, userAgent }
      : { type: "bug", description: text, timestamp, url, userAgent };

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
