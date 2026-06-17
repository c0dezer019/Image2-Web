# Cookie Consent Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom-right cookie consent banner with Accept All / Reject buttons, persisted to localStorage, with a utility function future scripts can query before setting cookies.

**Architecture:** A thin `lib/cookie-consent.ts` module owns the type, storage key, and `getConsent()` read utility. `CookieBanner.tsx` is a client component that reads state on mount and renders nothing if consent is already recorded. `app/layout.tsx` mounts the banner globally.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest + jsdom, inline CSS via `COLORS`/`FONT_MONO` from `lib/theme.ts`

## Global Constraints

- No external dependencies — use only what's already in `package.json`
- All component styling: inline CSS using `COLORS` and `FONT_MONO` from `@/lib/theme` — no Tailwind classes in component files
- `@` alias resolves to project root (configured in `tsconfig.json` and `vitest.config.ts`)
- Test files live in `tests/` at project root, import from `../lib/` or `../components/`
- Test runner: `pnpm test` (vitest run)
- Lint: `pnpm lint`

---

### Task 1: Cookie Consent Utility (`lib/cookie-consent.ts`)

**Files:**
- Create: `lib/cookie-consent.ts`
- Create: `tests/cookie-consent.test.ts`

**Interfaces:**
- Produces:
  - `type ConsentState = "accepted" | "rejected" | null`
  - `const CONSENT_KEY = "cookie_consent"`
  - `function getConsent(): ConsentState` — reads `localStorage[CONSENT_KEY]`, returns `null` if key absent or `window` unavailable (SSR-safe)
  - `function setConsent(state: "accepted" | "rejected"): void` — writes to `localStorage[CONSENT_KEY]`

- [ ] **Step 1: Write failing tests**

Create `tests/cookie-consent.test.ts`:

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { getConsent, setConsent, CONSENT_KEY } from "../lib/cookie-consent";

describe("getConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no consent recorded", () => {
    expect(getConsent()).toBeNull();
  });

  it("returns accepted after setConsent accepted", () => {
    setConsent("accepted");
    expect(getConsent()).toBe("accepted");
  });

  it("returns rejected after setConsent rejected", () => {
    setConsent("rejected");
    expect(getConsent()).toBe("rejected");
  });

  it("uses CONSENT_KEY as storage key", () => {
    setConsent("accepted");
    expect(localStorage.getItem(CONSENT_KEY)).toBe("accepted");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test tests/cookie-consent.test.ts
```

Expected: FAIL — `Cannot find module '../lib/cookie-consent'`

- [ ] **Step 3: Implement `lib/cookie-consent.ts`**

```ts
export type ConsentState = "accepted" | "rejected" | null;

export const CONSENT_KEY = "cookie_consent";

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(CONSENT_KEY);
  if (val === "accepted" || val === "rejected") return val;
  return null;
}

export function setConsent(state: "accepted" | "rejected"): void {
  localStorage.setItem(CONSENT_KEY, state);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test tests/cookie-consent.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add lib/cookie-consent.ts tests/cookie-consent.test.ts
git commit -m "feat: add cookie consent utility (getConsent, setConsent)"
```

---

### Task 2: CookieBanner Component (`components/CookieBanner.tsx`)

**Files:**
- Create: `components/CookieBanner.tsx`

**Interfaces:**
- Consumes:
  - `ConsentState` from `@/lib/cookie-consent`
  - `getConsent()` from `@/lib/cookie-consent`
  - `setConsent(state)` from `@/lib/cookie-consent`
  - `COLORS`, `FONT_MONO` from `@/lib/theme`
- Produces:
  - `export function CookieBanner(): React.ReactElement | null`

> Note: This component uses React hooks and browser APIs — it cannot be tested with vitest/jsdom without a React test renderer. Manual verification is the test for this task (see Step 3).

- [ ] **Step 1: Create `components/CookieBanner.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type ConsentState, getConsent, setConsent } from "@/lib/cookie-consent";
import { COLORS, FONT_MONO } from "@/lib/theme";

export function CookieBanner() {
  const [consent, setConsentState] = useState<ConsentState>("accepted");

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  if (consent !== null) return null;

  function handle(state: "accepted" | "rejected") {
    setConsent(state);
    setConsentState(state);
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 280,
        background: COLORS.bg,
        border: `1px solid ${COLORS.borderStrong}`,
        padding: 20,
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        zIndex: 9999,
      }}
    >
      <div style={{ color: COLORS.text, marginBottom: 12 }}>Cookies</div>
      <p
        style={{
          color: COLORS.muted,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "none",
          lineHeight: 1.5,
          margin: "0 0 16px",
        }}
      >
        We use cookies to improve your experience. See our{" "}
        <Link href="/privacy" style={{ color: COLORS.muted, textDecoration: "underline" }}>
          Privacy Policy
        </Link>{" "}
        for details.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => handle("rejected")}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "transparent",
            border: `1px solid ${COLORS.muted}`,
            color: COLORS.muted,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Reject
        </button>
        <button
          onClick={() => handle("accepted")}
          style={{
            flex: 1,
            padding: "8px 0",
            background: "transparent",
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: build succeeds with no type errors

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev
```

Open `http://localhost:3000`. Verify:
- Banner appears in bottom-right corner on first visit
- "Reject" button dismisses the banner
- "Accept All" button dismisses the banner
- Refreshing after either choice: banner does not reappear
- Clearing localStorage (`localStorage.clear()` in devtools console) and refreshing: banner reappears
- "Privacy Policy" link navigates to `/privacy`

- [ ] **Step 4: Commit**

```bash
git add components/CookieBanner.tsx
git commit -m "feat: add CookieBanner component"
```

---

### Task 3: Wire Banner into Layout (`app/layout.tsx`)

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `CookieBanner` from `@/components/CookieBanner`

- [ ] **Step 1: Add `CookieBanner` to `app/layout.tsx`**

Replace the body content in `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from '@vercel/analytics/next';
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

const spaceGrotesk = localFont({
  src: "../public/fonts/SpaceGrotesk-VariableFont_wght.ttf",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmMono = localFont({
  src: [
    { path: "../public/fonts/DMMono-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/DMMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/DMMono-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Image2",
  description: "Turn any image into ASCII or ANSI text art.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmMono.variable}`}>
      <body>
        {children}
        <Analytics />
        <CookieBanner />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Build to verify no errors**

```bash
pnpm build
```

Expected: clean build, no type errors

- [ ] **Step 3: Full smoke test**

```bash
pnpm dev
```

Open `http://localhost:3000`. Verify the banner appears, both buttons work, and navigating to `/privacy` and `/terms` also shows the banner until dismissed.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests pass (cookie-consent tests + pre-existing tests)

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: mount CookieBanner in root layout"
```
