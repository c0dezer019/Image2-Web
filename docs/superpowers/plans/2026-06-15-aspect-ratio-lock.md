# Aspect Ratio Lock + Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users lock the ASCII-mode "Image width" / "Image height" px controls to a fixed aspect ratio (source-image AR or a preset like 16:9), with the paired field recomputing automatically.

**Architecture:** Pure ratio math lives in a new `lib/aspect-ratio.ts` module (unit-tested with vitest, no DOM). `app/page.tsx` holds the new state (`sourceWidth`/`sourceHeight`/`targetAspectRatio`) and handlers that call into that module. `components/ControlsBar.tsx` gets a lock checkbox + preset button row, ascii-mode only.

**Tech Stack:** Next.js (App Router) + React + TypeScript, vitest for unit tests.

Spec: [docs/superpowers/specs/2026-06-15-aspect-ratio-lock-design.md](../specs/2026-06-15-aspect-ratio-lock-design.md)

---

### Task 1: Aspect ratio math module

**Files:**
- Create: `lib/aspect-ratio.ts`
- Test: `lib/aspect-ratio.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/aspect-ratio.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ASPECT_RATIO_PRESETS, heightForWidth, widthForHeight } from "./aspect-ratio";

describe("heightForWidth", () => {
  it("computes height from width and ratio", () => {
    expect(heightForWidth(1600, 16 / 9)).toBe(900);
  });

  it("rounds to the nearest integer", () => {
    expect(heightForWidth(100, 3)).toBe(33);
  });

  it("returns 0 for a non-positive ratio", () => {
    expect(heightForWidth(100, 0)).toBe(0);
    expect(heightForWidth(100, -1)).toBe(0);
  });
});

describe("widthForHeight", () => {
  it("computes width from height and ratio", () => {
    expect(widthForHeight(900, 16 / 9)).toBe(1600);
  });

  it("rounds to the nearest integer", () => {
    expect(widthForHeight(100, 1 / 3)).toBe(33);
  });

  it("returns 0 for a non-positive ratio", () => {
    expect(widthForHeight(100, 0)).toBe(0);
    expect(widthForHeight(100, -1)).toBe(0);
  });
});

describe("ASPECT_RATIO_PRESETS", () => {
  it("starts with Original (ratio null, resolved against the source image)", () => {
    expect(ASPECT_RATIO_PRESETS[0]).toEqual({ label: "Original", ratio: null });
  });

  it("has 9 presets", () => {
    expect(ASPECT_RATIO_PRESETS).toHaveLength(9);
  });

  it("includes the documented ratios", () => {
    const byLabel = Object.fromEntries(ASPECT_RATIO_PRESETS.map((p) => [p.label, p.ratio]));
    expect(byLabel["1:1"]).toBeCloseTo(1);
    expect(byLabel["4:3"]).toBeCloseTo(4 / 3);
    expect(byLabel["3:2"]).toBeCloseTo(3 / 2);
    expect(byLabel["16:9"]).toBeCloseTo(16 / 9);
    expect(byLabel["9:16"]).toBeCloseTo(9 / 16);
    expect(byLabel["5:4"]).toBeCloseTo(5 / 4);
    expect(byLabel["21:9"]).toBeCloseTo(21 / 9);
    expect(byLabel["2:3"]).toBeCloseTo(2 / 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/aspect-ratio.test.ts`
Expected: FAIL — `Failed to resolve import "./aspect-ratio"` (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/aspect-ratio.ts`:

```ts
/**
 * Pure helpers for the Image width/height aspect-ratio lock. Ratios are
 * expressed as width / height. `null` ratio on a preset means "Original" —
 * resolve it against the source image's aspect ratio at the call site.
 */

export interface AspectRatioPreset {
  label: string;
  ratio: number | null;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { label: "Original", ratio: null },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:2", ratio: 3 / 2 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "5:4", ratio: 5 / 4 },
  { label: "21:9", ratio: 21 / 9 },
  { label: "2:3", ratio: 2 / 3 },
];

export function heightForWidth(width: number, ratio: number): number {
  if (ratio <= 0) return 0;
  return Math.max(0, Math.round(width / ratio));
}

export function widthForHeight(height: number, ratio: number): number {
  if (ratio <= 0) return 0;
  return Math.max(0, Math.round(height * ratio));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/aspect-ratio.test.ts`
Expected: PASS (all 9 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/aspect-ratio.ts lib/aspect-ratio.test.ts
git commit -m "Add aspect-ratio math helpers and presets"
```

---

### Task 2: Wire lock/preset state into app/page.tsx

**Files:**
- Modify: `app/page.tsx:41-42` (state block), `app/page.tsx:118-141` (`handleFile`), `app/page.tsx:242-285` (`ControlsBar` usage)

- [ ] **Step 1: Add new state and the `sourceAspectRatio` derived value**

In `app/page.tsx`, after the existing `imgWidth`/`imgHeight` state (currently lines 41-42):

```tsx
  const [imgWidth, setImgWidth] = useState(0);
  const [imgHeight, setImgHeight] = useState(0);
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [targetAspectRatio, setTargetAspectRatio] = useState<number | null>(null);
```

Then, near the top of the component body (after all `useState` calls, before `useEffect`), add the derived value:

```tsx
  const sourceAspectRatio = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : null;
```

- [ ] **Step 2: Capture source dimensions and reset the lock on new upload**

In `handleFile` (currently lines 118-141), the `getImageDimensions` block is:

```tsx
    getImageDimensions(f)
      .then(({ width, height }) => {
        setImgWidth(width);
        setImgHeight(height);
      })
      .catch(() => {});
```

Replace it with:

```tsx
    getImageDimensions(f)
      .then(({ width, height }) => {
        setImgWidth(width);
        setImgHeight(height);
        setSourceWidth(width);
        setSourceHeight(height);
        // New image — drop any AR lock from the previous image rather than
        // applying a stale ratio to it.
        setTargetAspectRatio(null);
      })
      .catch(() => {
        setSourceWidth(0);
        setSourceHeight(0);
        setTargetAspectRatio(null);
      });
```

- [ ] **Step 3: Add the import and the four handlers**

Add to the imports at the top of `app/page.tsx`:

```tsx
import { ASPECT_RATIO_PRESETS, heightForWidth, widthForHeight, type AspectRatioPreset } from "@/lib/aspect-ratio";
```

Add the handlers near `handleBlurChange` (currently lines 154-157):

```tsx
  const handleImgWidthChange = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    const next = Math.round(n);
    setImgWidth(next);
    if (targetAspectRatio !== null) {
      setImgHeight(heightForWidth(next, targetAspectRatio));
    }
  }, [targetAspectRatio]);

  const handleImgHeightChange = useCallback((n: number) => {
    if (!Number.isFinite(n) || n < 0) return;
    const next = Math.round(n);
    setImgHeight(next);
    if (targetAspectRatio !== null) {
      setImgWidth(widthForHeight(next, targetAspectRatio));
    }
  }, [targetAspectRatio]);

  const handleLockAspectChange = useCallback((locked: boolean) => {
    if (!locked) {
      setTargetAspectRatio(null);
      return;
    }
    const ratio = sourceAspectRatio ?? (imgWidth > 0 && imgHeight > 0 ? imgWidth / imgHeight : null);
    if (ratio === null) return;
    setTargetAspectRatio(ratio);
  }, [sourceAspectRatio, imgWidth, imgHeight]);

  const handleAspectPresetChange = useCallback((preset: AspectRatioPreset) => {
    const ratio = preset.ratio ?? sourceAspectRatio;
    if (ratio === null) return;

    // If either field is "auto" (0), seed from the source image's pixel
    // dimensions before applying the ratio.
    const baseWidth = imgWidth === 0 || imgHeight === 0 ? sourceWidth : imgWidth;

    setTargetAspectRatio(ratio);
    if (baseWidth > 0) {
      setImgWidth(baseWidth);
      setImgHeight(heightForWidth(baseWidth, ratio));
    }
  }, [imgWidth, imgHeight, sourceWidth, sourceAspectRatio]);
```

- [ ] **Step 4: Pass new props to `ControlsBar`**

In the `<ControlsBar ... />` element (currently lines 242-285), add these props (place near `imgWidth`/`imgHeight` and their `on*Change` props):

```tsx
          imgWidth={imgWidth}
          imgHeight={imgHeight}
          lockAspect={targetAspectRatio !== null}
          targetAspectRatio={targetAspectRatio}
          sourceAspectRatio={sourceAspectRatio}
```

and replace:

```tsx
          onImgWidthChange={setImgWidth}
          onImgHeightChange={setImgHeight}
```

with:

```tsx
          onImgWidthChange={handleImgWidthChange}
          onImgHeightChange={handleImgHeightChange}
          onLockAspectChange={handleLockAspectChange}
          onAspectPresetChange={handleAspectPresetChange}
```

(`ASPECT_RATIO_PRESETS` is imported for use in Task 3's `ControlsBar` — `page.tsx` doesn't need to reference it directly, but the import in Step 3 above already pulls in `AspectRatioPreset` which `handleAspectPresetChange` needs. If your editor/linter flags `ASPECT_RATIO_PRESETS` as unused in `page.tsx`, remove it from that import — it's only required in `ControlsBar.tsx`.)

- [ ] **Step 5: Typecheck (will fail until Task 3 updates `ControlsBarProps`)**

Run: `npx tsc --noEmit`
Expected: errors in `app/page.tsx` about props (`lockAspect`, `targetAspectRatio`, `sourceAspectRatio`, `onLockAspectChange`, `onAspectPresetChange`) not existing on `ControlsBarProps`, and `onImgWidthChange`/`onImgHeightChange` type mismatches if any. This is expected — Task 3 fixes it. Do not commit yet.

---

### Task 3: ControlsBar lock checkbox + preset buttons

**Files:**
- Modify: `components/ControlsBar.tsx:1-47` (imports/props), `components/ControlsBar.tsx:426-446` (img width/height sliders block)

- [ ] **Step 1: Import the new module and extend `ControlsBarProps`**

Add to the imports (currently line 5):

```tsx
import type { AnsiPalette, OutputMode } from "@/lib/types";
import { ASPECT_RATIO_PRESETS, type AspectRatioPreset } from "@/lib/aspect-ratio";
```

Extend `ControlsBarProps` (currently lines 7-47) — add after `imgHeight: number;`:

```tsx
  imgHeight: number;
  lockAspect: boolean;
  targetAspectRatio: number | null;
  sourceAspectRatio: number | null;
```

and add after `onImgHeightChange: (n: number) => void;`:

```tsx
  onImgHeightChange: (n: number) => void;
  onLockAspectChange: (locked: boolean) => void;
  onAspectPresetChange: (preset: AspectRatioPreset) => void;
```

- [ ] **Step 2: Add a helper to detect the active preset**

Add this helper near the top-level helpers (e.g. right after `segButtonStyle`, currently ending at line 90):

```tsx
const ASPECT_RATIO_EPSILON = 0.005;

function isActivePreset(
  preset: AspectRatioPreset,
  targetAspectRatio: number | null,
  sourceAspectRatio: number | null,
): boolean {
  if (targetAspectRatio === null) return false;
  const presetRatio = preset.ratio ?? sourceAspectRatio;
  if (presetRatio === null) return false;
  return Math.abs(presetRatio - targetAspectRatio) < ASPECT_RATIO_EPSILON;
}
```

- [ ] **Step 3: Destructure the new props**

In the `export function ControlsBar({ ... })` destructure (currently lines 258-298), add after `imgHeight,`:

```tsx
  imgHeight,
  lockAspect,
  targetAspectRatio,
  sourceAspectRatio,
```

and after `onImgHeightChange,`:

```tsx
  onImgHeightChange,
  onLockAspectChange,
  onAspectPresetChange,
```

- [ ] **Step 4: Add the lock checkbox and preset row to the ascii-mode block**

The current ascii-mode block starts with the two sliders (lines 428-446):

```tsx
          <SliderField
            id="img-width-slider"
            label={`Image width — ${imgWidth ? `${imgWidth}px` : "auto"}`}
            value={imgWidth}
            min={0}
            max={2000}
            step={20}
            onChange={onImgWidthChange}
          />

          <SliderField
            id="img-height-slider"
            label={`Image height — ${imgHeight ? `${imgHeight}px` : "auto"}`}
            value={imgHeight}
            min={0}
            max={2000}
            step={20}
            onChange={onImgHeightChange}
          />
```

Replace that whole block with:

```tsx
          <SliderField
            id="img-width-slider"
            label={`Image width — ${imgWidth ? `${imgWidth}px` : "auto"}`}
            value={imgWidth}
            min={0}
            max={2000}
            step={20}
            onChange={onImgWidthChange}
          />

          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
            <label
              htmlFor="lock-aspect-checkbox"
              style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
              title="Lock width/height to an aspect ratio"
            >
              <input
                id="lock-aspect-checkbox"
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => onLockAspectChange(e.target.checked)}
                style={{ accentColor: COLORS.accent }}
              />
              🔗 Lock ratio
            </label>
          </div>

          <SliderField
            id="img-height-slider"
            label={`Image height — ${imgHeight ? `${imgHeight}px` : "auto"}`}
            value={imgHeight}
            min={0}
            max={2000}
            step={20}
            onChange={onImgHeightChange}
          />

          <div style={{ flex: "1 1 100%" }}>
            <span id="aspect-preset-label" style={labelStyle}>Aspect Ratio Presets</span>
            <div role="group" aria-labelledby="aspect-preset-label" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ASPECT_RATIO_PRESETS.map((preset) => {
                const disabled = preset.ratio === null && sourceAspectRatio === null;
                const active = isActivePreset(preset, targetAspectRatio, sourceAspectRatio);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onAspectPresetChange(preset)}
                    disabled={disabled}
                    style={{
                      ...segButtonStyle(active),
                      opacity: disabled ? 0.4 : 1,
                      cursor: disabled ? "default" : "pointer",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
```

- [ ] **Step 5: Typecheck and run the full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all existing tests plus the new `lib/aspect-ratio.test.ts` pass.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/ControlsBar.tsx
git commit -m "Add aspect ratio lock and presets to Image width/height controls"
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify lock behavior in the browser**
  - Upload an image, switch to ASCII mode.
  - Check "Lock ratio" — confirm it becomes checked and no field changes yet.
  - Drag the Image width slider — confirm Image height updates to keep the source aspect ratio (height ≈ width / (sourceWidth/sourceHeight)).
  - Edit the Image height number input directly — confirm Image width updates to match.
  - Uncheck "Lock ratio" — confirm width/height no longer move together.

- [ ] **Step 3: Verify presets**
  - With an image loaded and Image width set to a nonzero value, click "16:9" — confirm "Lock ratio" becomes checked, Image width stays the same, and Image height becomes `round(width * 9/16)`.
  - Click "Original" — confirm it recomputes height back to the source ratio and is disabled only if dimension probing failed (shouldn't happen for a normal image).
  - Click "1:1" — confirm width stays, height becomes equal to width.
  - With Image width/height both at "auto" (0), click a preset — confirm both fields populate from the source image's pixel dimensions before applying the ratio.

- [ ] **Step 4: Verify upload reset**
  - With a lock/preset active, upload a different image — confirm "Lock ratio" unchecks and no preset is highlighted (per Task 2 Step 2's reset-on-upload behavior).

- [ ] **Step 5: Run the full test suite once more**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Stop the dev server** (Ctrl+C)
