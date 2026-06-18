# Download Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/download` page with dynamic GitHub release data and move the CLI download entry point to a gutter nav button on the homepage.

**Architecture:** Extract `detectPlatform` to a testable util; create a `DownloadLinks` client component that accepts asset URLs as props; create a server-component `/download` page that fetches the GitHub releases API with ISR and passes assets down; replace the in-page `CliDownload` strip with a fixed-position gutter link on the homepage.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, inline styles with `@/lib/theme` tokens.

## Global Constraints

- No new npm dependencies
- All styling via inline styles or `globals.css`; use `COLORS` and `FONT_MONO`/`FONT_SANS` from `@/lib/theme`
- `@` alias resolves to project root (not `src/`)
- Tests run with: `pnpm test`
- Build with: `pnpm build`
- Commit messages follow caveman-commit conventions (conventional commits, terse, ≤50 chars preferred)
- No Tailwind classes; Tailwind CSS v4 CSS-first config only

---

### Task 1: Extract `detectPlatform` to `lib/detect-platform.ts`

Platform detection logic moves from `components/CliDownload.tsx` (hardcoded URLs) to a pure util that accepts asset URLs as a parameter. Tests migrate to the new util file.

**Files:**
- Create: `lib/detect-platform.ts`
- Create: `tests/detect-platform.test.ts`
- Delete: `tests/CliDownload.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type ReleaseAssets = {
    windows: string;
    linuxAmd64: string;
    linuxArm64: string;
    macArm64: string;
    macX64: string;
  };
  export type PlatformDownload = { label: string; url: string };
  export function detectPlatform(ua: string, assets: ReleaseAssets): PlatformDownload | null
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/detect-platform.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { detectPlatform, type ReleaseAssets } from "@/lib/detect-platform";

const MOCK: ReleaseAssets = {
  windows: "https://example.com/img2-windows.exe",
  linuxAmd64: "https://example.com/img2-amd64.deb",
  linuxArm64: "https://example.com/img2-arm64.deb",
  macArm64: "https://example.com/img2-macos-arm64",
  macX64: "https://example.com/img2-macos-x86_64",
};

describe("detectPlatform", () => {
  it("returns Windows asset for Windows UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", MOCK);
    expect(r?.label).toBe("Windows x86_64");
    expect(r?.url).toBe(MOCK.windows);
  });

  it("returns amd64 deb for Linux x86_64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux x86_64)", MOCK);
    expect(r?.label).toBe("Linux x86_64");
    expect(r?.url).toBe(MOCK.linuxAmd64);
  });

  it("returns arm64 deb for Linux aarch64 UA", () => {
    const r = detectPlatform("Mozilla/5.0 (X11; Linux aarch64)", MOCK);
    expect(r?.label).toBe("Linux arm64");
    expect(r?.url).toBe(MOCK.linuxArm64);
  });

  it("returns macOS arm64 for Macintosh UA", () => {
    const r = detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", MOCK);
    expect(r?.label).toBe("macOS (Apple Silicon)");
    expect(r?.url).toBe(MOCK.macArm64);
  });

  it("returns null for unrecognized UA", () => {
    expect(detectPlatform("curl/7.81.0", MOCK)).toBeNull();
  });

  it("returns null for iPad UA", () => {
    expect(
      detectPlatform("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15", MOCK)
    ).toBeNull();
  });

  it("returns null for iPhone UA", () => {
    expect(
      detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15", MOCK)
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
pnpm test tests/detect-platform.test.ts
```

Expected: FAIL — `detectPlatform` not found.

- [ ] **Step 3: Implement `lib/detect-platform.ts`**

```ts
export type ReleaseAssets = {
  windows: string;
  linuxAmd64: string;
  linuxArm64: string;
  macArm64: string;
  macX64: string;
};

export type PlatformDownload = { label: string; url: string };

export function detectPlatform(ua: string, assets: ReleaseAssets): PlatformDownload | null {
  if (ua.includes("Windows")) {
    return { label: "Windows x86_64", url: assets.windows };
  }
  if (ua.includes("Linux")) {
    if (ua.includes("aarch64")) {
      return { label: "Linux arm64", url: assets.linuxArm64 };
    }
    return { label: "Linux x86_64", url: assets.linuxAmd64 };
  }
  if (ua.includes("Macintosh")) {
    return { label: "macOS (Apple Silicon)", url: assets.macArm64 };
  }
  return null;
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
pnpm test tests/detect-platform.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 5: Delete the old test file**

```bash
rm tests/CliDownload.test.tsx
```

- [ ] **Step 6: Run full suite — confirm no regressions**

```bash
pnpm test --run
```

Expected: all tests pass (7 fewer than before due to deleted file, 7 new ones added — net zero change in count).

- [ ] **Step 7: Commit**

```bash
git add lib/detect-platform.ts tests/detect-platform.test.ts
git rm tests/CliDownload.test.tsx
git commit -m "refactor(detect-platform): extract to lib util, inject assets"
```

---

### Task 2: `DownloadLinks` client component

New client component that accepts `ReleaseAssets` as props and renders the platform-detected download button + "All platforms" link. Deletes the now-superseded `CliDownload` component.

**Files:**
- Create: `components/DownloadLinks.tsx`
- Delete: `components/CliDownload.tsx`

**Interfaces:**
- Consumes: `detectPlatform`, `ReleaseAssets`, `PlatformDownload` from `@/lib/detect-platform`
- Produces:
  ```ts
  export function DownloadLinks(props: { assets: ReleaseAssets; releasesUrl?: string }): JSX.Element | null
  ```

No new tests needed — detection logic is fully covered in `tests/detect-platform.test.ts`. The only client-side behavior (`navigator.userAgent`, `useEffect`) is integration-level and requires a browser.

- [ ] **Step 1: Create `components/DownloadLinks.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { detectPlatform, type ReleaseAssets, type PlatformDownload } from "@/lib/detect-platform";
import { COLORS, FONT_MONO } from "@/lib/theme";

const RELEASES_URL = "https://github.com/c0dezer019/image2/releases/latest";

type Props = {
  assets: ReleaseAssets;
  releasesUrl?: string;
};

export function DownloadLinks({ assets, releasesUrl = RELEASES_URL }: Props) {
  const [platform, setPlatform] = useState<PlatformDownload | null | undefined>(undefined);

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent, assets));
  }, [assets]);

  if (platform === undefined) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
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
        href={releasesUrl}
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

- [ ] **Step 2: Delete `components/CliDownload.tsx`**

```bash
git rm components/CliDownload.tsx
```

- [ ] **Step 3: Run full suite — confirm no regressions**

```bash
pnpm test --run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/DownloadLinks.tsx
git commit -m "feat(DownloadLinks): add client component, remove CliDownload"
```

---

### Task 3: `/download` server page

Server component that fetches the GitHub releases API with ISR, builds asset URLs from the response (with hardcoded fallback), and renders the full download page.

**Files:**
- Create: `app/download/page.tsx`

**Interfaces:**
- Consumes: `DownloadLinks` from `@/components/DownloadLinks`; `ReleaseAssets` from `@/lib/detect-platform`; `Footer` from `@/components/Footer`; `COLORS`, `FONT_MONO` from `@/lib/theme`

- [ ] **Step 1: Create `app/download/page.tsx`**

```tsx
import Link from "next/link";
import { DownloadLinks } from "@/components/DownloadLinks";
import { Footer } from "@/components/Footer";
import { COLORS, FONT_MONO } from "@/lib/theme";
import type { ReleaseAssets } from "@/lib/detect-platform";

export const revalidate = 3600;

const FALLBACK_ASSETS: ReleaseAssets = {
  windows:
    "https://github.com/c0dezer019/image2/releases/download/v1.2.2b/img2-1.2.2-windows-x86_64.exe",
  linuxAmd64:
    "https://github.com/c0dezer019/image2/releases/download/v1.2.2b/img2_1.2.2_amd64.deb",
  linuxArm64:
    "https://github.com/c0dezer019/image2/releases/download/v1.2.2b/img2_1.2.2_arm64.deb",
  macArm64:
    "https://github.com/c0dezer019/image2/releases/download/v1.2.2c/img2-macos-arm64",
  macX64:
    "https://github.com/c0dezer019/image2/releases/download/v1.2.2c/img2-macos-x86_64",
};
const FALLBACK_TAG = "v1.2.2c";

async function fetchRelease(): Promise<{ tag: string; assets: ReleaseAssets }> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/c0dezer019/image2/releases/latest",
      {
        next: { revalidate: 3600 },
        headers: { Accept: "application/vnd.github+json" },
      }
    );
    if (!res.ok) throw new Error("non-ok");
    const data = await res.json();

    const tag: string = data.tag_name ?? FALLBACK_TAG;
    const raw: Array<{ name: string; browser_download_url: string }> = data.assets ?? [];
    const find = (pred: (n: string) => boolean) =>
      raw.find((a) => pred(a.name))?.browser_download_url;

    return {
      tag,
      assets: {
        windows: find((n) => n.toLowerCase().includes("windows")) ?? FALLBACK_ASSETS.windows,
        linuxAmd64: find((n) => n.includes("amd64")) ?? FALLBACK_ASSETS.linuxAmd64,
        linuxArm64: find((n) => n.includes("arm64") && n.endsWith(".deb")) ?? FALLBACK_ASSETS.linuxArm64,
        macArm64: find((n) => n.includes("macos-arm64")) ?? FALLBACK_ASSETS.macArm64,
        macX64: find((n) => n.includes("macos-x86_64")) ?? FALLBACK_ASSETS.macX64,
      },
    };
  } catch {
    return { tag: FALLBACK_TAG, assets: FALLBACK_ASSETS };
  }
}

export default async function DownloadPage() {
  const { tag, assets } = await fetchRelease();
  const sourceBase = `https://github.com/c0dezer019/image2/archive/refs/tags/${tag}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: "-72px",
          pointerEvents: "none",
          opacity: 0.5,
          backgroundImage: `linear-gradient(${COLORS.accentDim} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.accentDim} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          animation: "gridDrift 36s linear infinite",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(120% 80% at 50% -10%, transparent 50%, ${COLORS.bg} 100%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1000,
          margin: "0 auto",
          padding: "46px 40px 120px",
        }}
      >
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 54,
          }}
        >
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                border: `1px solid ${COLORS.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_MONO,
                fontSize: 12,
                color: COLORS.accent,
              }}
            >
              &gt;
            </div>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 13,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: COLORS.text,
              }}
            >
              Image2
            </div>
          </Link>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: COLORS.muted,
            }}
          >
            The App Foundry
          </div>
        </nav>

        <header style={{ textAlign: "center", paddingBottom: 64 }}>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLORS.accent,
              marginBottom: 18,
            }}
          >
            02 / CLI TOOL
          </div>
          <h1
            style={{
              fontSize: "clamp(32px, 4.8vw, 58px)",
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 0.96,
              margin: "0 0 18px",
            }}
          >
            Download image2 CLI
          </h1>
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COLORS.muted,
            }}
          >
            {tag}
          </div>
        </header>

        <section style={{ maxWidth: 600, margin: "0 auto 64px" }}>
          <h2
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLORS.muted,
              margin: "0 0 24px",
            }}
          >
            Why download?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              {
                n: "01",
                title: "Offline access",
                body: "Runs entirely on your machine. No internet required after install.",
              },
              {
                n: "02",
                title: "No limits",
                body: "Your machine, your constraints. No upload caps, rate limits, or server downtime.",
              },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: COLORS.accent,
                    paddingTop: 3,
                    flexShrink: 0,
                  }}
                >
                  {n}
                </span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
                  <div style={{ color: COLORS.muted, lineHeight: 1.55 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 600, margin: "0 auto 64px" }}>
          <h2
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLORS.muted,
              margin: "0 0 24px",
            }}
          >
            Binaries
          </h2>
          <DownloadLinks assets={assets} />
        </section>

        <section style={{ maxWidth: 600, margin: "0 auto 64px" }}>
          <h2
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: COLORS.muted,
              margin: "0 0 8px",
            }}
          >
            Source
          </h2>
          <p style={{ color: COLORS.muted, lineHeight: 1.55, margin: "0 0 20px" }}>
            Build it, mod it, make it yours.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <a
              href={`${sourceBase}.tar.gz`}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLORS.accent,
                textDecoration: "none",
                border: `1px solid ${COLORS.accent}`,
                padding: "8px 16px",
              }}
            >
              .tar.gz
            </a>
            <a
              href={`${sourceBase}.zip`}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: COLORS.muted,
                textDecoration: "none",
                border: `1px solid ${COLORS.borderStrong}`,
                padding: "8px 16px",
              }}
            >
              .zip
            </a>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/download/page.tsx
git commit -m "feat(download): add /download page with ISR GitHub release fetch"
```

---

### Task 4: Homepage — remove `CliDownload`, add gutter nav button

Remove the in-page download strip. Replace with a small `↓ CLI` link in the right gutter (outside the 1000px content column), hidden on screens ≤ 1080px via an inline `<style>` tag.

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Link` from `next/link` (already imported or needs adding); `COLORS`, `FONT_MONO` from `@/lib/theme` (already imported)

- [ ] **Step 1: Edit `app/page.tsx`**

Remove this import (around line 8 currently):
```tsx
import { CliDownload } from "@/components/CliDownload";
```

Add `Link` to the next/link import if not already present. The file currently uses `<a>` tags, not `<Link>` — add the import:
```tsx
import Link from "next/link";
```

Inside the outermost `<div>` (the one with `minHeight: "100vh", background: COLORS.bg`), add two things immediately after its opening tag and before the first background `<div>`:

```tsx
      <style>{`
        @media (max-width: 1080px) { .cli-gutter { display: none !important; } }
      `}</style>
      <Link
        href="/download"
        className="cli-gutter"
        style={{
          position: "absolute",
          top: 46,
          right: 24,
          zIndex: 3,
          fontFamily: FONT_MONO,
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: COLORS.accent,
          textDecoration: "none",
          border: `1px solid ${COLORS.accent}`,
          padding: "6px 12px",
        }}
      >
        ↓ CLI
      </Link>
```

Remove `<CliDownload />` from between `</header>` and `<DropZone` (currently around line 344).

The final JSX structure inside the outer div should be:
```tsx
<div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, position: "relative", overflow: "hidden" }}>
  <style>{`@media (max-width: 1080px) { .cli-gutter { display: none !important; } }`}</style>
  <Link href="/download" className="cli-gutter" style={{ position: "absolute", top: 46, right: 24, zIndex: 3, fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.accent, textDecoration: "none", border: `1px solid ${COLORS.accent}`, padding: "6px 12px" }}>
    ↓ CLI
  </Link>
  {/* background grid div */}
  {/* background radial div */}
  <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, ... }}>
    <nav>...</nav>
    <header>...</header>
    {/* NO <CliDownload /> here */}
    <DropZone ... />
    ...
  </div>
</div>
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test --run
```

Expected: all tests pass.

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(page): replace CliDownload strip with gutter nav button"
```
