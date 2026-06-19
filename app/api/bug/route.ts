import { NextRequest, NextResponse } from "next/server";

interface FeedbackPayload {
  type: "feedback";
  message: string;
  timestamp: string;
}

interface BugPayload {
  type: "bug";
  description: string;
  command: string | null;
  log: string | null;
  timestamp: string;
  platform: string;
  python_version: string;
}

type BugReportPayload = FeedbackPayload | BugPayload;

function isValidPayload(body: unknown): body is BugReportPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (b.type === "feedback") {
    return typeof b.message === "string" && typeof b.timestamp === "string";
  }
  if (b.type === "bug") {
    return typeof b.description === "string" && typeof b.timestamp === "string";
  }
  return false;
}

export async function POST(req: NextRequest) {
  const token = process.env.IMG2_BUG_TOKEN;
  const webhookUrl = process.env.CRASH_WEBHOOK_URL;

  if (!token || !webhookUrl) {
    return NextResponse.json({ error: "Bug reporting not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Webhook failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Webhook failed" }, { status: 502 });
  }
}
