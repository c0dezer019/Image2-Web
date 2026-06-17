# Cookie Consent Banner — Design Spec

**Date:** 2026-06-17
**Status:** Approved

## Context

Image2 currently uses Vercel Analytics (cookieless, no PII). Cookie-based tracking (analytics, ads) is planned but not yet determined. This spec covers the consent infrastructure: a banner that captures user intent and a utility future scripts can query before setting cookies.

## Approach

Roll our own — no external library. ~80 lines total. Matches existing inline-CSS pattern and adds zero runtime dependencies.

## Architecture

### `lib/cookie-consent.ts`
- Exports `ConsentState = "accepted" | "rejected" | null`
- Exports storage key constant `CONSENT_KEY = "cookie_consent"`
- Exports `getConsent(): ConsentState` — reads `localStorage`, safe to call server-side (returns `null` if `window` unavailable)

### `components/CookieBanner.tsx`
- `"use client"` directive
- On mount: reads `localStorage[CONSENT_KEY]`; if non-null, renders nothing (already decided)
- Renders fixed bottom-right card when state is `null`
- Two actions: **Accept All** (writes `"accepted"`) and **Reject** (writes `"rejected"`); both dismiss the banner
- Links "Privacy Policy" text to `/privacy`
- Styled with `COLORS` and `FONT_MONO` from `lib/theme.ts` to match footer aesthetic

### `app/layout.tsx`
- Add `<CookieBanner />` alongside existing `<Analytics />`

## Visual Spec

```
┌─────────────────────────────────┐
│ COOKIES                         │
│                                 │
│ We use cookies to improve your  │
│ experience. See our Privacy     │
│ Policy for details.             │
│                                 │
│ [    REJECT    ] [ ACCEPT ALL ] │
└─────────────────────────────────┘
```

- **Position:** `fixed`, `bottom: 24px`, `right: 24px`, `width: 280px`
- **Background:** `COLORS.bg` (`#070c12`)
- **Border:** `1px solid COLORS.borderStrong`
- **Padding:** `20px`
- **Font:** `FONT_MONO`, `10px`, `letter-spacing: 0.18em`, `text-transform: uppercase`
- **Title:** `COLORS.text`
- **Body text:** `COLORS.muted`, `12px` (slightly larger for readability)
- **Accept button:** `COLORS.accent` border + text, transparent bg
- **Reject button:** `COLORS.muted` color, no border fill
- **No animation**

## Future Gating Pattern

When adding a cookie-setting script, callers use `getConsent()` before loading:

```ts
import { getConsent } from "@/lib/cookie-consent";

if (getConsent() === "accepted") {
  // load GA4 / ads script
}
```

No re-consent flow is in scope for this spec — that's a separate feature when the first real tracker is added.

## Out of Scope

- Granular consent categories (analytics vs marketing)
- Re-consent on policy change
- Server-side consent checking
- Animation / transitions
