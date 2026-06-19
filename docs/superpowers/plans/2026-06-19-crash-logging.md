# Crash Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send rich crash reports to an n8n webhook whenever an unhandled error occurs on the frontend or when a backend API call fails; fall back to an inline banner with copyable JSON + GitHub issue link if the webhook is unreachable.

**Architecture:** All webhook calls originate from the browser via a Next.js API proxy route (`/api/crash-report`) that reads `CRASH_WEBHOOK_URL` server-side, keeping the URL out of the client bundle. `lib/crash-reporter.ts` builds payloads and returns them on failure so the caller can render the fallback `CrashReportBanner`. React error boundaries (`app/error.tsx`, `app/global-error.tsx`) cover component crashes; a thin `GlobalErrorListener` client component covers unhandled JS errors; existing `.catch()` blocks in `app/page.tsx` cover API errors.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest/jsdom

## Global Constraints

- Tailwind CSS v4 — no `tailwind.config.*`; all styles via inline style objects (follow existing pattern in `app/page.tsx` and `components/`)
- `@` alias resolves to project root (not `src/`)
- No new dependencies — use only what's already installed
- `CRASH_WEBHOOK_URL` is server-side only — never `NEXT_PUBLIC_`
- All new frontend code is TypeScript; follow existing patterns in `lib/` and `components/`
- Tests live in `tests/` and use Vitest + jsdom

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/crash-reporter.ts` | Build payloads, POST to `/api/crash-report`, return payload on failure |
| Create | `app/api/crash-report/route.ts` | Proxy POST to n8n webhook |
| Create | `components/CrashReportBanner.tsx` | Fallback UI: copyable JSON, GitHub link, dismiss |
| Create | `components/GlobalErrorListener.tsx` | Client component: `window.onerror` + `unhandledrejection` listeners |
| Create | `app/error.tsx` | Next.js error boundary for React component crashes |
| Create | `app/global-error.tsx` | Next.js root error boundary for layout-level crashes |
| Create | `tests/crash-reporter.test.ts` | Unit tests for crash-reporter |
| Modify | `lib/types.ts` | Add `CrashPayload` types |
| Modify | `app/layout.tsx` | Add `<GlobalErrorListener />` |
| Modify | `app/page.tsx` | Call crash reporter in catch blocks; render `CrashReportBanner` |

---

### Task 1: Types and crash-reporter core

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/crash-reporter.ts`
- Create: `tests/crash-reporter.test.ts`

**Interfaces:**
- Produces:
  - `FrontendCrashPayload`, `BackendCrashPayload`, `CrashPayload` (union) — exported from `lib/types.ts`
  - `buildFrontendPayload(error: Error, params: ConvertParams | null): FrontendCrashPayload`
  - `buildBackendPayload(error: string, endpoint: string, params: ConvertParams | null): BackendCrashPayload`
  - `reportCrash(payload: CrashPayload): Promise<CrashPayload | null>` — null on success, payload on failure

---

- [ ] **Step 1: Add crash payload types to `lib/types.ts`**

Append to the bottom of `lib/types.ts`:

```ts
export interface FrontendCrashPayload {
  source: "frontend";
  timestamp: string;
  error: string;
  stack: string;
  url: string;
  userAgent: string;
  params: ConvertParams | null;
}

export interface BackendCrashPayload {
  source: "backend";
  timestamp: string;
  error: string;
  endpoint: string;
  params: ConvertParams | null;
}

export type CrashPayload = FrontendCrashPayload | BackendCrashPayload;
```

- [ ] **Step 2: Write failing tests for crash-reporter**

Create `tests/crash-reporter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  reportCrash,
  buildFrontendPayload,
  buildBackendPayload,
} from "../lib/crash-reporter";
import type { ConvertParams } from "../lib/types";

const baseParams: ConvertParams = {
  mode: "ascii",
  width: 100,
  contrast: 1.5,
  brightness: 1.0,
  sharpness: 2.5,
  saturate: 1.0,
  minLum: 0.0,
  fontSize: 6,
  palette: "truecolor",
  imgWidth: 0,
  imgHeight: 0,
  invert: false,
  blur: 0,
  dense: false,
};

describe("buildFrontendPayload", () => {
  it("sets source to frontend", () => {
    const err = new Error("boom");
    const p = buildFrontendPayload(err, baseParams);
    expect(p.source).toBe("frontend");
  });

  it("copies error message and stack", () => {
    const err = new Error("oops");
    const p = buildFrontendPayload(err, null);
    expect(p.error).toBe("oops");
    expect(p.stack).toBe(err.stack ?? "");
  });

  it("accepts null params", () => {
    const p = buildFrontendPayload(new Error("x"), null);
    expect(p.params).toBeNull();
  });
});

describe("buildBackendPayload", () => {
  it("sets source to backend", () => {
    const p = buildBackendPayload("bad image", "/convert/ascii", baseParams);
    expect(p.source).toBe("backend");
  });

  it("stores endpoint", () => {
    const p = buildBackendPayload("err", "/analyze", null);
    expect(p.endpoint).toBe("/analyze");
  });
});

describe("reportCrash", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when webhook succeeds", async () => {
    const payload = buildFrontendPayload(new Error("test"), null);
    const result = await reportCrash(payload);
    expect(result).toBeNull();
  });

  it("returns payload when webhook returns non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false }),
    );
    const payload = buildFrontendPayload(new Error("test"), null);
    const result = await reportCrash(payload);
    expect(result).toEqual(payload);
  });

  it("returns payload when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );
    const payload = buildFrontendPayload(new Error("test"), null);
    const result = await reportCrash(payload);
    expect(result).toEqual(payload);
  });

  it("POSTs to /api/crash-report with JSON body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    const payload = buildFrontendPayload(new Error("test"), null);
    await reportCrash(payload);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/crash-report",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd /home/brian/Documents/c0de_box/www/Image2-Web
pnpm test tests/crash-reporter.test.ts
```

Expected: all tests FAIL with "Cannot find module '../lib/crash-reporter'"

- [ ] **Step 4: Create `lib/crash-reporter.ts`**

```ts
import type { CrashPayload, ConvertParams, FrontendCrashPayload, BackendCrashPayload } from "./types";

export type { CrashPayload, FrontendCrashPayload, BackendCrashPayload };

export function buildFrontendPayload(
  error: Error,
  params: ConvertParams | null,
): FrontendCrashPayload {
  return {
    source: "frontend",
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack ?? "",
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    params,
  };
}

export function buildBackendPayload(
  error: string,
  endpoint: string,
  params: ConvertParams | null,
): BackendCrashPayload {
  return {
    source: "backend",
    timestamp: new Date().toISOString(),
    error,
    endpoint,
    params,
  };
}

/**
 * POSTs payload to /api/crash-report.
 * Returns null on success, the payload on failure (caller shows fallback UI).
 */
export async function reportCrash(payload: CrashPayload): Promise<CrashPayload | null> {
  try {
    const res = await fetch("/api/crash-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok ? null : payload;
  } catch {
    return payload;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm test tests/crash-reporter.test.ts
```

Expected: all 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/crash-reporter.ts tests/crash-reporter.test.ts
git commit -m "feat: add crash payload types and crash-reporter core"
```

---

### Task 2: API proxy route

**Files:**
- Create: `app/api/crash-report/route.ts`

**Interfaces:**
- Consumes: `CRASH_WEBHOOK_URL` from `process.env`
- Produces: `POST /api/crash-report` — 200 on success, 502 on n8n failure, 503 if not configured

---

- [ ] **Step 1: Create `app/api/crash-report/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.CRASH_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
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
```

- [ ] **Step 2: Verify it exists and TypeScript is happy**

```bash
pnpm build 2>&1 | head -30
```

Expected: build succeeds (no type errors in the new file). If build is slow, instead run:

```bash
npx tsc --noEmit 2>&1 | grep "crash-report"
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add app/api/crash-report/route.ts
git commit -m "feat: add /api/crash-report proxy route"
```

---

### Task 3: CrashReportBanner component

**Files:**
- Create: `components/CrashReportBanner.tsx`

**Interfaces:**
- Consumes: `CrashPayload` from `@/lib/crash-reporter`; `COLORS`, `FONT_MONO` from `@/lib/theme`
- Produces: `<CrashReportBanner payload={CrashPayload} onDismiss={() => void} />` — used in Task 5 and Task 6

---

- [ ] **Step 1: Check the theme colors available**

```bash
grep -n "export" /home/brian/Documents/c0de_box/www/Image2-Web/lib/theme.ts
```

Note the exported `COLORS` keys and `FONT_MONO` — use them for styling.

- [ ] **Step 2: Create `components/CrashReportBanner.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "CrashReportBanner"
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add components/CrashReportBanner.tsx
git commit -m "feat: add CrashReportBanner fallback UI component"
```

---

### Task 4: GlobalErrorListener + layout.tsx

**Files:**
- Create: `components/GlobalErrorListener.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `buildFrontendPayload`, `reportCrash` from `@/lib/crash-reporter`
- Produces: `<GlobalErrorListener />` — client component, renders null, registers window error listeners

---

- [ ] **Step 1: Create `components/GlobalErrorListener.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { buildFrontendPayload, reportCrash } from "@/lib/crash-reporter";

export function GlobalErrorListener() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      const err =
        event.error instanceof Error ? event.error : new Error(event.message);
      reportCrash(buildFrontendPayload(err, null)).then((failed) => {
        if (failed) console.warn("[image2] crash reporter unreachable", failed);
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const err =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      reportCrash(buildFrontendPayload(err, null)).then((failed) => {
        if (failed) console.warn("[image2] crash reporter unreachable", failed);
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
```

- [ ] **Step 2: Add `<GlobalErrorListener />` to `app/layout.tsx`**

Add the import after the existing imports:

```ts
import { GlobalErrorListener } from "@/components/GlobalErrorListener";
```

Add `<GlobalErrorListener />` inside `<body>`, before `{children}`:

```tsx
<body>
  <GlobalErrorListener />
  {children}
  <Analytics />
  <CookieBanner />
</body>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "GlobalError|layout"
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add components/GlobalErrorListener.tsx app/layout.tsx
git commit -m "feat: add global JS error listener for crash reporting"
```

---

### Task 5: React error boundaries

**Files:**
- Create: `app/error.tsx`
- Create: `app/global-error.tsx`

**Interfaces:**
- Consumes: `buildFrontendPayload`, `reportCrash`, `CrashPayload` from `@/lib/crash-reporter`; `CrashReportBanner` from `@/components/CrashReportBanner`; `COLORS`, `FONT_MONO` from `@/lib/theme`
- Produces: Next.js error boundaries — auto-discovered by Next.js App Router via filename convention

---

- [ ] **Step 1: Create `app/error.tsx`**

Next.js requires this to be `"use client"`. It receives `error` (the thrown Error) and `reset` (a function to retry rendering).

```tsx
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
```

- [ ] **Step 2: Create `app/global-error.tsx`**

`global-error.tsx` replaces the root layout, so it must include `<html>` and `<body>`.

```tsx
"use client";

import { useEffect, useState } from "react";
import { buildFrontendPayload, reportCrash, type CrashPayload } from "@/lib/crash-reporter";
import { CrashReportBanner } from "@/components/CrashReportBanner";
import { COLORS, FONT_MONO } from "@/lib/theme";

export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: COLORS.bg,
          color: COLORS.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          fontFamily: FONT_MONO,
          boxSizing: "border-box",
        }}
      >
        <p style={{ color: COLORS.muted, marginBottom: 24 }}>
          A critical error occurred.
        </p>
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
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "error\.tsx|global-error"
```

Expected: no output

- [ ] **Step 4: Commit**

```bash
git add app/error.tsx app/global-error.tsx
git commit -m "feat: add React error boundaries with crash reporting"
```

---

### Task 6: Wire crash reporter into page.tsx

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes:
  - `buildBackendPayload`, `reportCrash`, `CrashPayload` from `@/lib/crash-reporter`
  - `CrashReportBanner` from `@/components/CrashReportBanner`
- Produces: inline crash report banner below `OutputCanvas` when webhook fails

---

- [ ] **Step 1: Add imports to `app/page.tsx`**

Add after the existing imports (around line 18):

```ts
import { buildBackendPayload, reportCrash, type CrashPayload } from "@/lib/crash-reporter";
import { CrashReportBanner } from "@/components/CrashReportBanner";
```

- [ ] **Step 2: Add crash payload state to `app/page.tsx`**

After the existing `const [error, setError] = useState<string | null>(null);` line (line 56), add:

```ts
const [crashPayload, setCrashPayload] = useState<CrashPayload | null>(null);
```

- [ ] **Step 3: Update the `convertImage` catch in the `useEffect` (lines 93-98)**

Replace the existing catch block:

```ts
.catch((err: Error) => {
  if (requestIdRef.current === id) {
    setError(err.message);
    setResult(null);
  }
});
```

With:

```ts
.catch((err: Error) => {
  if (requestIdRef.current === id) {
    setError(err.message);
    setResult(null);
    const endpoint = `/convert/${params.mode}`;
    const payload = buildBackendPayload(err.message, endpoint, params);
    reportCrash(payload).then((failed) => {
      if (failed) setCrashPayload(failed);
    });
  }
});
```

- [ ] **Step 4: Update the `runAutoParams` catch (lines 132-139)**

Replace the existing catch block inside `runAutoParams`:

```ts
.catch(() => {
  // Auto-detection failed (e.g. server unreachable) — fall back to
  // the old fixed defaults rather than leaving stale values.
  setContrast(FIXED_ENHANCE_DEFAULTS.contrast);
  setBrightness(FIXED_ENHANCE_DEFAULTS.brightness);
  setSaturate(FIXED_ENHANCE_DEFAULTS.saturate);
  setMinLum(FIXED_ENHANCE_DEFAULTS.minLum);
})
```

With:

```ts
.catch((err: unknown) => {
  setContrast(FIXED_ENHANCE_DEFAULTS.contrast);
  setBrightness(FIXED_ENHANCE_DEFAULTS.brightness);
  setSaturate(FIXED_ENHANCE_DEFAULTS.saturate);
  setMinLum(FIXED_ENHANCE_DEFAULTS.minLum);
  const message = err instanceof Error ? err.message : String(err);
  const payload = buildBackendPayload(message, "/analyze", null);
  reportCrash(payload).then((failed) => {
    if (failed) setCrashPayload(failed);
  });
})
```

- [ ] **Step 5: Clear crashPayload on new conversion attempts**

In the `useEffect` that calls `convertImage` (around line 87), add `setCrashPayload(null)` next to the existing `setError(null)`:

```ts
const timer = setTimeout(() => {
  setError(null);
  setCrashPayload(null);
  convertImage(file, params)
```

- [ ] **Step 6: Render `CrashReportBanner` in JSX**

Find the `<OutputCanvas>` line (around line 429):

```tsx
<OutputCanvas ref={canvasRef} hasOutput={!!result} errorMessage={error} />
```

Add the banner directly after it:

```tsx
<OutputCanvas ref={canvasRef} hasOutput={!!result} errorMessage={error} />
{crashPayload && (
  <CrashReportBanner
    payload={crashPayload}
    onDismiss={() => setCrashPayload(null)}
  />
)}
```

- [ ] **Step 7: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass (including new crash-reporter tests)

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire crash reporter into page.tsx API error handlers"
```

---

### Task 7: Environment variable setup

**Files:**
- Modify: `.env.local` (local dev — not committed)
- Update Railway environment variables (production)

---

- [ ] **Step 1: Add to `.env.local` for local development**

Check if `.env.local` exists:

```bash
ls /home/brian/Documents/c0de_box/www/Image2-Web/.env.local 2>/dev/null && echo exists || echo missing
```

If it exists, append. If not, create it. Either way, ensure it contains:

```
CRASH_WEBHOOK_URL=https://your-n8n-instance/webhook/your-webhook-id
```

Replace the URL with the actual n8n webhook URL. This file is not committed (verify it's in `.gitignore`).

- [ ] **Step 2: Verify `.env.local` is gitignored**

```bash
grep ".env.local" /home/brian/Documents/c0de_box/www/Image2-Web/.gitignore
```

Expected: `.env.local` appears in `.gitignore`. If not, add it:

```bash
echo ".env.local" >> /home/brian/Documents/c0de_box/www/Image2-Web/.gitignore
git add .gitignore
git commit -m "chore: ensure .env.local is gitignored"
```

- [ ] **Step 3: Set `CRASH_WEBHOOK_URL` in Vercel**

Log into Vercel dashboard → Image2 project → Settings → Environment Variables.
Add: `CRASH_WEBHOOK_URL` = `<your n8n webhook URL>`, scope: Production + Preview.

- [ ] **Step 4: Smoke test locally**

```bash
pnpm dev
```

Open `http://localhost:3000`. Upload an image. Verify normal flow works (no regressions).

To test the crash reporter without a real n8n webhook: set `CRASH_WEBHOOK_URL` to an invalid URL in `.env.local`, upload an image, trigger a conversion error (e.g., disconnect the server), verify `CrashReportBanner` appears with the JSON payload and the GitHub issue link works.

- [ ] **Step 5: Final commit (if any cleanup needed)**

```bash
git add -p  # stage any final tweaks
git commit -m "chore: crash logging smoke test cleanup"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|------------|
| Frontend JS crashes → webhook | Task 4 (`GlobalErrorListener`) + Task 5 (`error.tsx`, `global-error.tsx`) |
| Backend API errors → webhook | Task 6 (`page.tsx` catch blocks) |
| Webhook URL as env var | Task 2 (`CRASH_WEBHOOK_URL`) + Task 7 |
| Proxy route hides URL from client | Task 2 |
| Rich payload: error + stack + url + userAgent + params | Task 1 (`buildFrontendPayload`) |
| Rich payload: error + endpoint + params (backend) | Task 1 (`buildBackendPayload`) |
| Fallback UI on webhook failure | Task 3 (`CrashReportBanner`) + Tasks 5-6 |
| Copyable JSON in banner | Task 3 |
| GitHub issue link in banner | Task 3 |
| Dismiss button | Task 3 |
| Fire-and-forget for global JS errors | Task 4 (console.warn on failure) |
| `runAutoParams` errors reported | Task 6 Step 4 |
| `convertImage` errors reported | Task 6 Step 3 |

All requirements covered. No placeholders. Type names consistent across all tasks (`CrashPayload`, `FrontendCrashPayload`, `BackendCrashPayload`, `buildFrontendPayload`, `buildBackendPayload`, `reportCrash`).
