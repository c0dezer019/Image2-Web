# Image Compression on Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard 10MB upload-size rejection with client-side auto-compression (scale-then-quality-reduce), while raising the hard reject ceiling to 50MB and keeping the "Image width/height" controls showing the original image's true dimensions.

**Architecture:** A new pure/canvas-based module `lib/image-compress.ts` exposes `compressImageIfNeeded(file)`, which no-ops under 10MB, otherwise scales the image to fit a 4096px longest-side cap and re-encodes, stepping JPEG/WebP quality down (falling back to JPEG for PNG/GIF) until under 10MB or a best-effort floor is reached. `lib/validate.ts` switches its size check from the old 10MB hard limit to a new 50MB hard ceiling. `app/page.tsx`'s `handleFile` captures original dimensions first, then runs compression behind a new "Optimizing…" state (mirroring the existing "Analyzing…" state) before setting the working file.

**Tech Stack:** TypeScript, Vitest + jsdom (canvas/Image mocked via `document.createElement`/`Image` stubs, following the existing pattern in `lib/image-dimensions.test.ts` and `lib/sample-image.test.ts`).

Spec: `docs/superpowers/specs/2026-06-14-image-compression-design.md`

---

### Task 1: Pure helpers in `lib/image-compress.ts`

**Files:**
- Create: `lib/image-compress.ts`
- Test: `lib/image-compress.test.ts`

- [ ] **Step 1: Write failing tests for the pure helpers**

Create `lib/image-compress.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { computeScaledDimensions, nextQuality, withJpegExtension } from "./image-compress";

describe("computeScaledDimensions", () => {
  it("leaves dimensions unchanged when within the max", () => {
    expect(computeScaledDimensions(2000, 1500, 4096)).toEqual({ width: 2000, height: 1500 });
  });

  it("scales down a wide image to fit the max on its longest side", () => {
    expect(computeScaledDimensions(8000, 6000, 4096)).toEqual({ width: 4096, height: 3072 });
  });

  it("scales down a tall image to fit the max on its longest side", () => {
    expect(computeScaledDimensions(3000, 5000, 4096)).toEqual({ width: 2458, height: 4096 });
  });
});

describe("nextQuality", () => {
  it("steps down by 0.1", () => {
    expect(nextQuality(0.92)).toBe(0.82);
  });

  it("returns the floor value when stepping lands exactly on it", () => {
    expect(nextQuality(0.6)).toBe(0.5);
  });

  it("returns null once below the 0.5 floor", () => {
    expect(nextQuality(0.52)).toBeNull();
  });
});

describe("withJpegExtension", () => {
  it("replaces an existing extension with .jpg", () => {
    expect(withJpegExtension("photo.png")).toBe("photo.jpg");
  });

  it("appends .jpg when there is no extension", () => {
    expect(withJpegExtension("photo")).toBe("photo.jpg");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/image-compress.test.ts`
Expected: FAIL — `lib/image-compress.ts` does not exist / exports not found.

- [ ] **Step 3: Implement the pure helpers**

Create `lib/image-compress.ts`:

```ts
/**
 * Client-side image compression for uploads exceeding TARGET_BYTES.
 * Scales the image to fit MAX_DIMENSION on its longest side, then (if
 * still too large) steps encode quality down, falling back to JPEG for
 * formats without a usable quality knob (PNG/GIF).
 */

export const TARGET_BYTES = 10 * 1024 * 1024;
export const HARD_MAX_BYTES = 50 * 1024 * 1024;
export const MAX_DIMENSION = 4096;

const INITIAL_QUALITY = 0.92;
const QUALITY_FLOOR = 0.5;
const QUALITY_STEP = 0.1;
const SCALE_FACTOR = 0.85;
const MAX_SCALE_ROUNDS = 5;

const QUALITY_MIME_TYPES = new Set(["image/jpeg", "image/webp"]);

export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function nextQuality(quality: number): number | null {
  const next = Math.round((quality - QUALITY_STEP) * 100) / 100;
  return next >= QUALITY_FLOOR ? next : null;
}

export function withJpegExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  return `${base}.jpg`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run lib/image-compress.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/image-compress.ts lib/image-compress.test.ts
git commit -m "feat: add pure helpers for image compression"
```

---

### Task 2: `compressImageIfNeeded` orchestrator

**Files:**
- Modify: `lib/image-compress.ts`
- Test: `lib/image-compress.test.ts`

- [ ] **Step 1: Write failing tests for the orchestrator**

Append to `lib/image-compress.test.ts` (add these imports to the existing `import` line and add the new `describe` block):

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImageIfNeeded, computeScaledDimensions, nextQuality, withJpegExtension } from "./image-compress";
```

(replace the existing `import { describe, expect, it } from "vitest";` and `import { computeScaledDimensions, ... }` line with the combined import above)

```ts
type SizeFn = (width: number, height: number, mime?: string, quality?: number) => number;

class MockCanvas {
  width = 0;
  height = 0;
  constructor(private sizeFn: SizeFn, private calls: Array<{ mime?: string; quality?: number }>) {}
  getContext() {
    return { drawImage: vi.fn() };
  }
  toBlob(cb: (blob: Blob | null) => void, mime?: string, quality?: number) {
    this.calls.push({ mime, quality });
    const size = this.sizeFn(this.width, this.height, mime, quality);
    cb(new Blob([new Uint8Array(size)], { type: mime }));
  }
}

function stubCanvas(sizeFn: SizeFn) {
  const calls: Array<{ mime?: string; quality?: number }> = [];
  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") return new MockCanvas(sizeFn, calls) as unknown as HTMLElement;
    return realCreateElement(tag);
  });
  return calls;
}

function stubImage(naturalWidth: number, naturalHeight: number, shouldError = false) {
  class MockImage {
    naturalWidth = 0;
    naturalHeight = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      if (shouldError) {
        queueMicrotask(() => this.onerror?.());
      } else {
        this.naturalWidth = naturalWidth;
        this.naturalHeight = naturalHeight;
        queueMicrotask(() => this.onload?.());
      }
    }
  }
  vi.stubGlobal("Image", MockImage);
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
}

function bigFile(name: string, type: string): File {
  return new File([new Uint8Array(11 * 1024 * 1024)], name, { type });
}

describe("compressImageIfNeeded", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns the file unchanged when already under the target size", async () => {
    const file = new File([new Uint8Array(1024)], "small.jpg", { type: "image/jpeg" });
    const result = await compressImageIfNeeded(file);
    expect(result).toBe(file);
  });

  it("scales an oversized image and succeeds at the initial quality", async () => {
    stubImage(8000, 6000);
    stubCanvas((w, h) => Math.round(w * h * 0.5));

    const file = bigFile("photo.jpg", "image/jpeg");
    const result = await compressImageIfNeeded(file);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(Math.round(4096 * 3072 * 0.5));
  });

  it("steps quality down when scaling alone isn't enough", async () => {
    stubImage(2000, 1500);
    const calls = stubCanvas((w, h, mime, quality) => Math.round(w * h * (quality ?? 1) * 4));

    const file = bigFile("photo.jpg", "image/jpeg");
    const result = await compressImageIfNeeded(file);

    expect(result.size).toBe(Math.round(2000 * 1500 * 0.82 * 4));
    expect(calls.map((c) => c.quality)).toEqual([0.92, 0.82]);
  });

  it("falls back to JPEG when a PNG can't be compressed enough via quality", async () => {
    stubImage(2000, 1500);
    stubCanvas((w, h, mime, quality) => {
      if (mime === "image/png") return w * h * 8;
      return Math.round(w * h * (quality ?? 1) * 2);
    });

    const file = bigFile("photo.png", "image/png");
    const result = await compressImageIfNeeded(file);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(Math.round(2000 * 1500 * 0.92 * 2));
  });

  it("returns the best-effort result if the target is never reached", async () => {
    stubImage(5000, 5000);
    // Just over TARGET_BYTES, never succeeds — exercises all MAX_SCALE_ROUNDS.
    // Kept close to TARGET_BYTES (rather than e.g. 50MB) since this size is
    // allocated repeatedly (5 rounds x up to 5 quality steps).
    stubCanvas(() => 11_000_000);

    const file = bigFile("photo.jpg", "image/jpeg");
    const result = await compressImageIfNeeded(file);

    expect(result).toBeInstanceOf(File);
    expect(result.size).toBe(11_000_000);
  });

  it("rejects when the image fails to decode", async () => {
    stubImage(0, 0, true);
    const file = bigFile("bad.jpg", "image/jpeg");

    await expect(compressImageIfNeeded(file)).rejects.toThrow("Could not read image for compression");
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm vitest run lib/image-compress.test.ts`
Expected: FAIL — `compressImageIfNeeded` is not exported.

- [ ] **Step 3: Implement the orchestrator**

Append to `lib/image-compress.ts`:

```ts
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image for compression"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode image"));
          return;
        }
        resolve(blob);
      },
      mime,
      quality,
    );
  });
}

function blobToFile(blob: Blob, originalName: string, mime: string): File {
  const name =
    mime === "image/jpeg" && !/\.jpe?g$/i.test(originalName)
      ? withJpegExtension(originalName)
      : originalName;
  return new File([blob], name, { type: mime });
}

/**
 * Returns `file` unchanged if it's already under TARGET_BYTES. Otherwise
 * scales it to fit MAX_DIMENSION on its longest side and re-encodes,
 * stepping quality down (falling back to JPEG for PNG/GIF) until the
 * result is under TARGET_BYTES, or returning the smallest result found
 * after MAX_SCALE_ROUNDS as a best effort.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;

  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  let { width, height } = computeScaledDimensions(img.naturalWidth, img.naturalHeight, MAX_DIMENSION);

  let bestBlob: Blob | null = null;
  let bestMime = file.type;

  for (let round = 0; round < MAX_SCALE_ROUNDS; round++) {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    let mime = file.type;
    let quality: number | undefined = QUALITY_MIME_TYPES.has(mime) ? INITIAL_QUALITY : undefined;

    while (true) {
      const blob = await canvasToBlob(canvas, mime, quality);
      bestBlob = blob;
      bestMime = mime;
      if (blob.size <= TARGET_BYTES) {
        return blobToFile(blob, file.name, mime);
      }

      if (quality !== undefined) {
        const next = nextQuality(quality);
        if (next !== null) {
          quality = next;
          continue;
        }
      }

      if (mime !== "image/jpeg") {
        mime = "image/jpeg";
        quality = INITIAL_QUALITY;
        continue;
      }

      break;
    }

    width = Math.max(1, Math.round(width * SCALE_FACTOR));
    height = Math.max(1, Math.round(height * SCALE_FACTOR));
  }

  return blobToFile(bestBlob as Blob, file.name, bestMime);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run lib/image-compress.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/image-compress.ts lib/image-compress.test.ts
git commit -m "feat: add compressImageIfNeeded for oversized uploads"
```

---

### Task 3: Raise `validate.ts` ceiling to 50MB

**Files:**
- Modify: `lib/validate.ts`
- Test: `lib/validate.test.ts`

- [ ] **Step 1: Update the failing-size test**

In `lib/validate.test.ts`, replace the `"rejects files over 10MB"` test:

```ts
  it("rejects files over 50MB", () => {
    const result = validateImageFile(makeFile("a.png", "image/png", 51 * 1024 * 1024));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/50MB/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/validate.test.ts`
Expected: FAIL — current code rejects at 10MB with a "10MB" message, so a 51MB file is rejected but the error text won't match `/50MB/`.

- [ ] **Step 3: Update `lib/validate.ts`**

Replace the full contents of `lib/validate.ts`:

```ts
import { HARD_MAX_BYTES } from "./image-compress";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: "Unsupported file type. Use PNG, JPG, GIF, or WebP." };
  }
  if (file.size > HARD_MAX_BYTES) {
    return { ok: false, error: "File too large. Max 50MB." };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run lib/validate.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/validate.ts lib/validate.test.ts
git commit -m "fix: raise upload size ceiling to 50MB, defer to compression below 10MB"
```

---

### Task 4: Wire compression into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx:1-13` (imports), `app/page.tsx:34` (state), `app/page.tsx:52-76` (conversion effect), `app/page.tsx:114-127` (handleFile), `app/page.tsx:227-269` (ControlsBar props)

- [ ] **Step 1: Add the import and `optimizing` state**

In `app/page.tsx`, add to the import block (after the `getImageDimensions` import on line 10):

```ts
import { compressImageIfNeeded } from "@/lib/image-compress";
```

Add new state right after line 34 (`const [analyzing, setAnalyzing] = useState(false);`):

```ts
  const [optimizing, setOptimizing] = useState(false);
```

- [ ] **Step 2: Skip the conversion effect while optimizing**

In the conversion `useEffect` (around line 56), change:

```ts
    if (!file || analyzing) return;
```

to:

```ts
    if (!file || analyzing || optimizing) return;
```

And add `optimizing` to its dependency array (around line 76):

```ts
  }, [file, analyzing, optimizing, mode, width, contrast, brightness, sharpness, saturate, minLum, fontSize, palette, imgWidth, imgHeight, invert, blur, dense]);
```

- [ ] **Step 3: Rework `handleFile` to compress before setting the working file**

Replace the existing `handleFile` (lines 114-127):

```ts
  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    runAutoParams(f);
    // Pre-fill the Image width/height controls with the source image's real
    // pixel dimensions, mirroring the image2 CLI's use of the actual image
    // size when deriving cols/rows. Leave them at "auto" (0) if probing fails.
    getImageDimensions(f)
      .then(({ width, height }) => {
        setImgWidth(width);
        setImgHeight(height);
      })
      .catch(() => {});
  }, [runAutoParams]);
```

with:

```ts
  const handleFile = useCallback((f: File) => {
    setError(null);
    // Pre-fill the Image width/height controls with the source image's real
    // pixel dimensions, mirroring the image2 CLI's use of the actual image
    // size when deriving cols/rows. Read from the original file, before any
    // compression, so these always reflect the true source size. Leave them
    // at "auto" (0) if probing fails.
    getImageDimensions(f)
      .then(({ width, height }) => {
        setImgWidth(width);
        setImgHeight(height);
      })
      .catch(() => {});

    setOptimizing(true);
    compressImageIfNeeded(f)
      .then((compressed) => {
        setFile(compressed);
        runAutoParams(compressed);
      })
      .catch(() => {
        setError("Could not process image");
      })
      .finally(() => setOptimizing(false));
  }, [runAutoParams]);
```

- [ ] **Step 4: Pass `optimizing` to `ControlsBar`**

In the `<ControlsBar ... />` JSX (around line 247, next to `analyzing={analyzing}`), add:

```tsx
          optimizing={optimizing}
```

- [ ] **Step 5: Run the full test suite and build**

Run: `pnpm vitest run`
Expected: PASS (all suites, including the previously updated ones)

Run: `pnpm exec tsc --noEmit`
Expected: no errors (will fail until Task 5 adds the `optimizing` prop to `ControlsBarProps` — if Task 5 hasn't run yet, this step is expected to fail here; do Task 5 first if running out of order)

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: compress oversized uploads before processing"
```

---

### Task 5: "Optimizing…" state in `ControlsBar`

**Files:**
- Modify: `components/ControlsBar.tsx:27` (props type), `components/ControlsBar.tsx:277` (destructure), `components/ControlsBar.tsx:314-325` (Auto button)

- [ ] **Step 1: Add `optimizing` to `ControlsBarProps`**

In `components/ControlsBar.tsx`, change line 27:

```ts
  analyzing: boolean;
```

to:

```ts
  analyzing: boolean;
  optimizing: boolean;
```

- [ ] **Step 2: Destructure the new prop**

Change line 277:

```ts
  analyzing,
```

to:

```ts
  analyzing,
  optimizing,
```

- [ ] **Step 3: Update the Auto button**

Replace the button block (lines 314-325):

```tsx
        <button
          type="button"
          onClick={onAuto}
          disabled={!hasFile || analyzing}
          style={{
            ...segButtonStyle(false),
            opacity: !hasFile || analyzing ? 0.4 : 1,
            cursor: !hasFile || analyzing ? "default" : "pointer",
          }}
        >
          {analyzing ? "Analyzing…" : "Auto"}
        </button>
```

with:

```tsx
        <button
          type="button"
          onClick={onAuto}
          disabled={!hasFile || analyzing || optimizing}
          style={{
            ...segButtonStyle(false),
            opacity: !hasFile || analyzing || optimizing ? 0.4 : 1,
            cursor: !hasFile || analyzing || optimizing ? "default" : "pointer",
          }}
        >
          {optimizing ? "Optimizing…" : analyzing ? "Analyzing…" : "Auto"}
        </button>
```

- [ ] **Step 4: Run the full test suite and build**

Run: `pnpm vitest run`
Expected: PASS (all suites)

Run: `pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/ControlsBar.tsx
git commit -m "feat: show Optimizing state on the Auto button during compression"
```

---

### Task 6: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify small-file path is unchanged**

Upload a normal small image (e.g. the "try a sample image" option). Confirm:
- No "Optimizing…" flash (or it's instantaneous)
- Image width/height controls pre-fill with the sample's real dimensions
- Conversion runs as before

- [ ] **Step 3: Verify large-file compression path**

Upload an image larger than 10MB (and under 50MB). Confirm:
- "Optimizing…" appears briefly on the Auto button, then disappears
- Image width/height controls show the **original** image's dimensions, not a scaled-down size
- Conversion proceeds normally afterward

- [ ] **Step 4: Verify the 50MB ceiling**

Upload (or construct) a file over 50MB. Confirm the existing error UI shows "File too large. Max 50MB."

- [ ] **Step 5: Stop dev server**

Stop the `pnpm dev` process (Ctrl+C).
