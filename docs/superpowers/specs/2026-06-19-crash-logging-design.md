# Crash Logging Design

**Date:** 2026-06-19  
**Status:** Approved

## Overview

Add crash logging to Image2-Web. All errors (frontend JS crashes, React boundary failures, backend API errors caught by the frontend) POST a rich payload to an n8n webhook via a Next.js API route proxy. If the webhook is unreachable, the user sees an inline banner with the crash report and a link to file a GitHub issue manually.

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `lib/crash-reporter.ts` | Builds payload, POSTs to `/api/crash-report`, returns payload on failure |
| `app/api/crash-report/route.ts` | Proxies request to n8n; reads `CRASH_WEBHOOK_URL` server-side |
| `components/CrashReportBanner.tsx` | Fallback UI: copyable JSON report + GitHub issue link |
| `app/error.tsx` | Next.js built-in error boundary for React component crashes |
| `app/global-error.tsx` | Root-level error boundary for layout-level crashes |

### Modified Files

| File | Change |
|------|--------|
| `app/page.tsx` | Call crash reporter in `.catch()` blocks; render `CrashReportBanner` on webhook failure |

### Environment Variable

| Var | Notes |
|-----|-------|
| `CRASH_WEBHOOK_URL` | Server-side only (no `NEXT_PUBLIC_` prefix). Set in Railway for production, `.env.local` for dev. |

## Data Flow

```
Error occurs
  → crash-reporter.ts builds payload
  → POST /api/crash-report
      → route.ts proxies to CRASH_WEBHOOK_URL (n8n)
      → success: silent
      → failure: returns payload to caller
          → CrashReportBanner renders with payload
```

Global JS errors (`window.onerror`, `unhandledrejection`) are fire-and-forget: POST attempted, failure logged to console only (React may not be mounted).

## Payload Shapes

### Frontend Error
```json
{
  "source": "frontend",
  "timestamp": "<ISO string>",
  "error": "<message>",
  "stack": "<stack trace>",
  "url": "<window.location.href>",
  "userAgent": "<navigator.userAgent>",
  "params": {
    "mode": "ascii|ansi",
    "width": 100,
    "contrast": 1.5,
    "brightness": 1.0,
    "sharpness": 2.5,
    "saturate": 1.0,
    "minLum": 0.0,
    "fontSize": 6,
    "palette": "truecolor",
    "invert": false,
    "blur": 0,
    "dense": false
  }
}
```

### Backend Error (caught by frontend)
```json
{
  "source": "backend",
  "timestamp": "<ISO string>",
  "error": "<detail from HTTP response>",
  "statusCode": 500,
  "endpoint": "/convert/ascii",
  "params": { "...same as above..." }
}
```

## Error Sources Covered

| Source | Handler | Fallback UI |
|--------|---------|-------------|
| `convertImage()` failure | `.catch()` in `page.tsx` | `CrashReportBanner` inline |
| `getAutoParams()` failure | `.catch()` in `page.tsx` | `CrashReportBanner` inline |
| React component crash | `app/error.tsx` | Full-page banner |
| Layout-level crash | `app/global-error.tsx` | Full-page banner |
| Unhandled JS / promise | `window.onerror` + `unhandledrejection` in layout | Fire-and-forget (console log on webhook failure) |

## CrashReportBanner UI

Rendered inline below `OutputCanvas` (same location as existing error messages) when webhook POST fails.

Contains:
- Message: "Crash report failed to send. Please report this manually."
- Collapsible `<pre>` block with formatted JSON payload
- "Copy report" button (copies JSON to clipboard)
- "Open GitHub issue" link → `https://github.com/c0dezer019/image2-web/issues/new?title=Crash+Report&body=<urlencoded summary>`
- Dismiss button

`app/error.tsx` and `app/global-error.tsx` render a minimal standalone version of this banner (no canvas layout context).

## API Route

`POST /api/crash-report`

- Reads `CRASH_WEBHOOK_URL` from `process.env`
- If not set: returns 503, caller treats as webhook failure
- Forwards body as JSON to n8n webhook
- Returns 200 on success, 502 on n8n failure
- No auth required (internal-only endpoint, webhook URL is the secret)

## Out of Scope

- Backend (Python/FastAPI) does not fire the webhook directly. All webhook calls originate from the frontend.
- No retry logic — one attempt, then fallback UI.
- No client-side queue or offline support.
