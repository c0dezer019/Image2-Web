# CLI Download Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a platform-detecting CLI download strip between the page header and DropZone, with a fallback "All platforms" link.

**Architecture:** New `CliDownload` component with an exported `detectPlatform(ua)` pure function (testable in isolation). Component mounts client-side only to avoid SSR/hydration mismatch. Wired into `page.tsx` between `</header>` and `<DropZone`.

**Tech Stack:** React 19, Next.js App Router (`"use client"`), Vitest, `@/lib/theme` tokens.

## Global Constraints

- Tailwind CSS v4 — no `tailwind.config.*`; all styling via inline styles or `globals.css`
- Use `COLORS` and `FONT_MONO` from `@/lib/theme` for all styling
- No new dependencies
- `@` alias resolves to project root (not `src/`)
- Run tests with `pnpm test`
- Run lint with `pnpm lint`

---

### Task 1: `CliDownload` component + unit tests

**Files:**
- Create: `components/CliDownload.tsx`
- Create: `tests/CliDownload.test.tsx`

**Interfaces:**
- Produces: `detectPlatform(ua: string): PlatformInfo | null` (exported for tests)
- Produces: `CliDownload` (default-exported React component, renders `null` before mount)

```ts
type PlatformInfo = { label: string; url: string };
```

- [ ] **Step 1: Write the failing tests**

Create `tests/CliDownload.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { detectPlatform } from "@/components/CliDownload";

describe("detectPlatform", () => {
  it("returns Windows asset for Windows UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(r?.label).toBe("Windows x86_64");
    expect(r?.url).toContain("windows-x86_64.exe");
    expect(r?.url).toContain("v1.2.2b");
  });

  it("returns amd64 deb for Linux x86_64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux x86_64)");
    expect(r?.label).toBe("Linux x86_64");
    expect(r?.url).toContain("amd64.deb");
    expect(r?.url).toContain("v1.2.2b");
  });

  it("returns arm64 deb for Linux aarch64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux aarch64)");
    expect(r?.label).toBe("Linux arm64");
    expect(r?.url).toContain("arm64.deb");
    expect(r?.url).toContain("v1.2.2b");
  });

  it("returns macOS arm64 for Mac UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(r?.label).toBe("macOS (Apple Silicon)");
    expect(r?.url).toContain("macos-arm64");
    expect(r?.url).toContain("v1.2.2c");
  });

  it("returns null for unrecognized UA", () => {
    expect(detectPlatform("curl/7.81.0")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
pnpm test tests/CliDownload.test.tsx
```

Expected: FAIL — `detectPlatform` not found.

- [ ] **Step 3: Implement `components/CliDownload.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";

const WIN_TAG = "v1.2.2b";
const WIN_VERSION = "1.2.2";
const LINUX_TAG = "v1.2.2b";
const LINUX_VERSION = "1.2.2";
const MAC_TAG = "v1.2.2c";

const BASE = "https://github.com/c0dezer019/image2/releases/download";
const RELEASES_URL = "https://github.com/c0dezer019/image2/releases/latest";

type PlatformInfo = { label: string; url: string };

export function detectPlatform(ua: string): PlatformInfo | null {
  if (ua.includes("Windows")) {
    return {
      label: "Windows x86_64",
      url: `${BASE}/${WIN_TAG}/img2-${WIN_VERSION}-windows-x86_64.exe`,
    };
  }
  if (ua.includes("Linux")) {
    if (ua.includes("aarch64")) {
      return {
        label: "Linux arm64",
        url: `${BASE}/${LINUX_TAG}/img2_${LINUX_VERSION}_arm64.deb`,
      };
    }
    return {
      label: "Linux x86_64",
      url: `${BASE}/${LINUX_TAG}/img2_${LINUX_VERSION}_amd64.deb`,
    };
  }
  if (ua.includes("Mac")) {
    return {
      label: "macOS (Apple Silicon)",
      url: `${BASE}/${MAC_TAG}/img2-macos-arm64`,
    };
  }
  return null;
}

export function CliDownload() {
  // undefined = not yet mounted (SSR); null = mounted, platform unknown
  const [platform, setPlatform] = useState<PlatformInfo | null | undefined>(undefined);

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent));
  }, []);

  if (platform === undefined) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        marginBottom: 32,
        fontFamily: FONT_MONO,
        fontSize: 11,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {platform && (
        <a
          href={platform.url}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            textDecoration: "none",
            letterSpacing: "inherit",
          }}
        >
          ↓ Download for {platform.label}
        </a>
      )}
      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: COLORS.muted,
          textDecoration: "none",
          letterSpacing: "inherit",
        }}
      >
        All platforms →
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
pnpm test tests/CliDownload.test.tsx
```

Expected: 5 tests PASS.

- [ ] **Step 5: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/CliDownload.tsx tests/CliDownload.test.tsx
git commit -m "feat: add CliDownload component with platform detection"
```

---

### Task 2: Wire `CliDownload` into `page.tsx`

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `CliDownload` from `@/components/CliDownload`

- [ ] **Step 1: Add import to `app/page.tsx`**

Add after the existing component imports (around line 9):

```tsx
import { CliDownload } from "@/components/CliDownload";
```

- [ ] **Step 2: Insert `<CliDownload />` into the JSX**

In `app/page.tsx`, find the closing `</header>` tag (around line 341) followed immediately by `<DropZone`. Insert between them:

```tsx
        </header>

        <CliDownload />

        <DropZone fileName={file?.name ?? null} onFile={handleFile} onError={setError} />
```

- [ ] **Step 3: Verify build compiles**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire CliDownload into main page between header and DropZone"
```
