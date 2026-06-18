---
name: cli-download-banner
description: Add a CLI download section to the main page hero area with platform auto-detection and fallback to all-platforms releases page
metadata:
  type: project
---

# CLI Download Banner — Design Spec

**Date:** 2026-06-17

## Summary

Add a download section between the page header and DropZone in `app/page.tsx`. Detects the user's OS client-side and surfaces a direct binary download. Always shows an "All platforms" escape-hatch link.

---

## Assets (v1.2.2b / v1.2.2c)

| Platform | Release tag | Asset filename |
|---|---|---|
| Windows x86_64 | `v1.2.2b` | `img2-1.2.2-windows-x86_64.exe` |
| Linux amd64 | `v1.2.2b` | `img2_1.2.2_amd64.deb` |
| Linux arm64 | `v1.2.2b` | `img2_1.2.2_arm64.deb` |
| macOS arm64 | `v1.2.2c` | `img2-macos-arm64` |
| macOS x86_64 | `v1.2.2c` | `img2-macos-x86_64` |

Download URL pattern: `https://github.com/c0dezer019/image2/releases/download/<tag>/<filename>`

All-platforms fallback: `https://github.com/c0dezer019/image2/releases/latest`

---

## Component

**File:** `components/CliDownload.tsx`

**Directive:** `"use client"` — platform detection requires `navigator`.

### Version constants (top of file, easy to bump)

```ts
const WIN_TAG = "v1.2.2b";
const WIN_VERSION = "1.2.2";
const LINUX_TAG = "v1.2.2b";
const LINUX_VERSION = "1.2.2";
const MAC_TAG = "v1.2.2c";
```

### Platform detection

Uses `navigator.userAgent` (available after mount only):

| Condition | Platform label | Asset |
|---|---|---|
| UA contains `"Windows"` | Windows | `img2-${WIN_VERSION}-windows-x86_64.exe` |
| UA contains `"Linux"` + `"aarch64"` | Linux arm64 | `img2_${LINUX_VERSION}_arm64.deb` |
| UA contains `"Linux"` | Linux x86_64 | `img2_${LINUX_VERSION}_amd64.deb` |
| UA contains `"Mac"` | macOS arm64 (default) | `img2-macos-arm64` |
| otherwise | `null` | — |

macOS arm64 is the default for Mac because Apple Silicon is now the majority. The "All platforms" link covers Intel Mac users who need x86_64. If macOS x86_64 detection becomes important later, `navigator.userAgentData.getHighEntropyValues(['architecture'])` can be added.

### Hydration

On SSR / before mount, render `null` to avoid `navigator` not-defined errors and hydration mismatch. Use a `mounted` state initialized to `false`, set to `true` in `useEffect`.

### Render

```
[ Download for Linux x86_64 ↓ ]    All platforms →
```

- If detected platform has binary: primary download `<a>` button + secondary "All platforms →" link
- If platform is null: only "All platforms →" link (no broken primary)
- Styling: matches existing `COLORS` + `FONT_MONO` tokens; small strip, not a hero block

---

## Placement in `page.tsx`

Insert `<CliDownload />` between `</header>` (line 341) and `<DropZone` (line 343).

Import added at top of file.

---

## Versioning

Two separate release tags (`v1.2.2b`, `v1.2.2c`) because macOS assets shipped in a later CI run. Version constants are per-platform at the top of `CliDownload.tsx`. When future releases consolidate all platforms into one tag, collapse to a single constant.

---

## Out of scope

- Fetching latest release from GitHub API at runtime
- macOS Intel arm64 high-entropy UA detection
- Install instructions / documentation
