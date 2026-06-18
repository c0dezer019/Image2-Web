---
name: download-page
description: Dedicated /download page with dynamic release data from GitHub API, plus a margin-overflow nav button on the homepage
metadata:
  type: project
---

# Download Page — Design Spec

**Date:** 2026-06-17

## Summary

Two changes:

1. **Nav button** — small "Download CLI" link in the right gutter of the homepage, outside the 1000px content column. Removes the existing `<CliDownload />` strip between header and DropZone.
2. **`/download` page** — dedicated page with reasons to download, dynamic platform-detected binaries, and source tarball links. Fetches latest release from GitHub API so asset URLs and version auto-update on new releases.

---

## 1. Nav Button (homepage gutter)

**Placement:** `position: absolute; top: 46px; right: 24px; z-index: 3` inside the existing outer full-width `<div>` (already `position: relative; overflow: hidden` in `app/page.tsx`). The button sits outside the `maxWidth: 1000` content column on wide screens.

**Responsive:** Hidden on screens ≤ 1080px via an inline `<style>` block with a media query (inline styles can't do media queries; a `<style>` tag in the JSX is the minimal approach without adding a CSS file).

**Style:** Matches existing mono/uppercase aesthetic — `FONT_MONO`, `COLORS.accent` border + text, same letterSpacing as other nav elements. Text: `↓ CLI`. Links to `/download` via Next.js `<Link>`.

**Removal:** Delete `<CliDownload />` from between `</header>` and `<DropZone` in `app/page.tsx`.

---

## 2. `/download` Page

**File:** `app/download/page.tsx` — Next.js server component with ISR.

### Data fetching

```ts
export const revalidate = 3600; // re-fetch GitHub API hourly
```

Fetch: `https://api.github.com/repos/c0dezer019/image2/releases/latest`

Response fields used:
- `tag_name` — displayed as current version, used to build source tarball URLs
- `assets[].name` — matched against platform patterns to build download URLs
- `assets[].browser_download_url` — direct download URL per asset

**Fallback constants** (used when fetch fails or asset not found in response):

```ts
const FALLBACK = {
  tag: "v1.2.2c",
  windows: "https://github.com/c0dezer019/image2/releases/download/v1.2.2b/img2-1.2.2-windows-x86_64.exe",
  linuxAmd64: "https://github.com/c0dezer019/image2/releases/download/v1.2.2b/img2_1.2.2_amd64.deb",
  linuxArm64: "https://github.com/c0dezer019/image2/releases/download/v1.2.2b/img2_1.2.2_arm64.deb",
  macArm64: "https://github.com/c0dezer019/image2/releases/download/v1.2.2c/img2-macos-arm64",
  macX64: "https://github.com/c0dezer019/image2/releases/download/v1.2.2c/img2-macos-x86_64",
};
```

**Asset matching** (from `assets[].name`):
- Contains `windows` → Windows binary
- Contains `amd64` → Linux amd64
- Contains `arm64` and contains `linux` or `.deb` → Linux arm64
- Contains `macos-arm64` → macOS arm64
- Contains `macos-x86_64` → macOS x86_64

### Page content structure

```
[ same grid background + nav as homepage ]

header
  "Download image2 CLI"
  version badge: vX.Y.Z

section: Why download?
  • Offline — runs locally, no server required
  • No limits — your machine, your constraints; no upload caps or rate limits

section: Binaries
  <DownloadLinks /> — client component, receives asset URLs as props
  (platform-detected primary button + "All platforms →" link to releases/latest)

section: Source
  "Build it, mod it, make it yours."
  [ .tar.gz ]  [ .zip ]
  (URLs: https://github.com/c0dezer019/image2/archive/refs/tags/{tag}.tar.gz)

[ Footer ]
```

### `DownloadLinks` client component

**File:** `components/DownloadLinks.tsx` (new, replaces `CliDownload` for the download page)

`CliDownload` is updated to no longer hardcode asset URLs — instead it becomes a thin wrapper. `DownloadLinks` receives:

```ts
type ReleaseAssets = {
  windows: string;
  linuxAmd64: string;
  linuxArm64: string;
  macArm64: string;
  macX64: string;
};
```

Platform detection logic (`detectPlatform`) moves to a shared util `lib/detect-platform.ts` so both `CliDownload` (nav, if needed) and `DownloadLinks` can import it without duplication.

**`detectPlatform` signature** (unchanged logic, just moved):

```ts
export function detectPlatform(ua: string, assets: ReleaseAssets): { label: string; url: string } | null
```

### Nav + Footer

`app/download/page.tsx` renders the same `<nav>` markup (logo + "The App Foundry") and `<Footer>` as the homepage. No shared layout component needed — copy is minimal and the pages have different overall structure.

---

## Existing `CliDownload` component

`components/CliDownload.tsx` retains its existing structure and tests. The homepage nav button (`↓ CLI` gutter link) is a plain `<Link>` — not `CliDownload`. `CliDownload` remains available but is no longer used on the homepage after this change; it will be superseded by `DownloadLinks` on the `/download` page. It can be deleted once `DownloadLinks` is wired in (clean-up in final task).

---

## File map

| Action | File |
|---|---|
| Modify | `app/page.tsx` — remove `<CliDownload />`, add gutter nav button |
| Create | `app/download/page.tsx` — server component with ISR fetch |
| Create | `components/DownloadLinks.tsx` — client component, platform detection |
| Create | `lib/detect-platform.ts` — pure `detectPlatform(ua, assets)` function |
| Update | `tests/CliDownload.test.tsx` → `tests/detect-platform.test.ts` — move tests to new util |
| Delete | `components/CliDownload.tsx` — superseded by DownloadLinks + gutter link |

---

## Out of scope

- Installer instructions / shell one-liners
- Changelog or release notes on the download page
- Dark/light mode toggle
- Analytics events on download clicks
