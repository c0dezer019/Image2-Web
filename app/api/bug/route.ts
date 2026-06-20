import { NextRequest, NextResponse } from "next/server";

// Data URLs are ~33% larger than the underlying bytes; cap the encoded
// string generously above the client's 4MB raw-file limit.
const MAX_SCREENSHOT_LENGTH = 6 * 1024 * 1024;

interface FeedbackPayload {
  type: "feedback";
  message: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
  browser?: string;
  screenshot?: string | null;
  jobParams?: unknown;
  jobError?: string | null;
}

interface BugPayload {
  type: "bug";
  description: string;
  timestamp: string;
  command?: string | null;
  log?: string | null;
  platform?: string;
  python_version?: string;
  url?: string;
  userAgent?: string;
  browser?: string;
  screenshot?: string | null;
  jobParams?: unknown;
  jobError?: string | null;
}

type BugReportPayload = FeedbackPayload | BugPayload;

function isValidPayload(body: unknown): body is BugReportPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (b.screenshot != null) {
    if (typeof b.screenshot !== "string" || b.screenshot.length > MAX_SCREENSHOT_LENGTH) {
      return false;
    }
  }
  if (b.type === "feedback") {
    return typeof b.message === "string" && typeof b.timestamp === "string";
  }
  if (b.type === "bug") {
    return typeof b.description === "string" && typeof b.timestamp === "string";
  }
  return false;
}

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.CRASH_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json({ error: "Bug reporting not configured" }, { status: 503 });
  }

  // The img2 CLI authenticates with a shared bearer token. Browser
  // submissions from the website's feedback form are same-origin and omit
  // the header entirely, so only enforce the check when one is present.
  const auth = req.headers.get("authorization");
  if (auth !== null) {
    const token = process.env.IMG2_BUG_TOKEN;
    if (!token || auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[api/bug] webhook responded with", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "Webhook failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/bug] webhook fetch threw", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 502 });
  }
}
