# Client-side image compression on upload

## Problem

`lib/validate.ts` currently hard-rejects any upload over 10MB
(`MAX_BYTES`). The image2 server has no size limit (the app calls it
directly, bypassing the old Vercel proxy — see `lib/convert.ts` comment),
so this 10MB cutoff is an artificial UX dead-end: a user with an 11MB
photo gets an error and has to go compress it themselves elsewhere.

## Goal

Instead of rejecting oversized uploads, auto-compress them client-side
to fit a target size, in two phases:

1. **Phase 1 — scale by aspect ratio**: if the image's longest side
   exceeds a max dimension, scale it down (near-lossless re-encode).
2. **Phase 2 — quality reduction**: if phase 1 alone doesn't bring the
   file under the target size, reduce encode quality (and, as a last
   resort, scale further).

Throughout, the "Image width/height" controls (`imgWidth`/`imgHeight`)
must reflect the **original** source image's dimensions, not the
compressed working copy — the user should not notice anything changed
about their image's reported size.

## Constants (new `lib/image-compress.ts`)

```ts
export const TARGET_BYTES = 10 * 1024 * 1024;   // compression target (was MAX_BYTES)
export const HARD_MAX_BYTES = 50 * 1024 * 1024; // hard reject ceiling
export const MAX_DIMENSION = 4096;              // phase 1 longest-side cap
```

- `TARGET_BYTES` (10MB): the size compression aims for. Matches the
  previous hard limit, now repurposed as a soft target.
- `HARD_MAX_BYTES` (50MB): files above this are still rejected outright
  — too large to safely decode/process client-side via canvas.
- `MAX_DIMENSION` (4096px): phase 1 scales the longest side down to this
  if it exceeds it. No existing pixel-dimension cap was found in the
  codebase (the server's `MAX_OUTPUT_COLS`/`MAX_OUTPUT_ROWS`/
  `MAX_OUTPUT_CELLS` in `server/main.py` cap the output ascii/ansi grid,
  not input image pixels), so this is a new constant.

## `lib/validate.ts` changes

- Remove `MAX_BYTES` (10MB); import `HARD_MAX_BYTES` from
  `lib/image-compress.ts` for the size check.
- Update error message to "File too large. Max 50MB."
- Accepted MIME type list (`ACCEPTED_TYPES`) unchanged.

## `lib/image-compress.ts` — new module

### `compressImageIfNeeded(file: File): Promise<File>`

- If `file.size <= TARGET_BYTES`, return `file` unchanged (no-op for
  the common case).
- Decode the file into an `<img>`/`createImageBitmap` and draw to an
  off-screen `<canvas>` (same pattern as `lib/sample-image.ts` and
  `lib/export.ts`'s `canvas.toBlob` usage).

**Phase 1 — scale:**
- If `max(naturalWidth, naturalHeight) > MAX_DIMENSION`, compute a scale
  factor so the longest side equals `MAX_DIMENSION`, preserving aspect
  ratio. Draw the image into a canvas at the new dimensions.
- Re-encode in the original format/mime:
  - `image/png`, `image/gif`: canvas re-encode is lossless at the new
    resolution (PNG/GIF ignore the `quality` argument to `toBlob`).
  - `image/jpeg`, `image/webp`: re-encode at quality `0.92`
    (near-lossless).
- If the image didn't exceed `MAX_DIMENSION`, phase 1 still re-encodes
  at the same dimensions (quality `0.92` for jpeg/webp, lossless for
  png/gif) so phase 2 has a consistent starting point.
- Check the resulting blob size. If `<= TARGET_BYTES`, done.

**Phase 2 — quality reduction (only if still `> TARGET_BYTES`):**
- For `image/jpeg` and `image/webp`: step quality down from `0.92` to
  `0.5` in `-0.1` increments, re-encoding at the current canvas
  dimensions after each step, checking size after each. Stop as soon as
  `<= TARGET_BYTES` or the quality floor (`0.5`) is reached.
- For `image/png` and `image/gif`: these formats don't support a
  meaningful `toBlob` quality knob, so fall back to re-encoding as
  `image/jpeg` and run the same quality-stepping as above. (Known
  tradeoff: PNG transparency and GIF animation are lost — but this path
  only triggers for oversized PNG/GIF files, which is rare.)
- If still `> TARGET_BYTES` after the quality floor: scale the canvas
  dimensions down by `×0.85` and repeat quality-stepping from `0.92`.
  Cap at 5 total scale rounds.
- If still over target after 5 rounds, return the smallest blob
  achieved anyway — best effort, not a hard failure (the server has no
  size limit, so a slightly-over-target upload still works).

### Output

- Returns a new `File`. If the format changed to JPEG (PNG/GIF
  fallback), update the filename extension to `.jpg` and
  `type: "image/jpeg"`. Otherwise preserve original filename/type.
- Rejects (throws) if the image fails to decode — caller surfaces this
  as an error via the existing error-display path.

## `app/page.tsx` — `handleFile` flow changes

Current flow (in `handleFile`):
1. `setFile(f)`
2. `runAutoParams(f)`
3. `getImageDimensions(f)` → `setImgWidth`/`setImgHeight`

New flow:
1. `getImageDimensions(f)` on the **original** file →
   `setImgWidth`/`setImgHeight`. (Unchanged — this already runs on the
   raw upload, before any compression, so it naturally captures true
   source dimensions.)
2. `setOptimizing(true)` (new state, mirrors `analyzing`).
3. `compressImageIfNeeded(f)` → `compressed`.
   - On success: `setFile(compressed)`, `runAutoParams(compressed)`.
   - On failure: `onError("Could not process image")`, don't set file.
4. `setOptimizing(false)` (in `finally`).

`validateImageFile(file)` still runs first as today, now checking
against `HARD_MAX_BYTES` (50MB) instead of the old 10MB.

## UI feedback

- New `optimizing: boolean` state in `app/page.tsx`, passed to
  `ControlsBar` alongside `analyzing`.
- `ControlsBar`'s Auto button area: while `optimizing`, show
  "Optimizing…" (same visual treatment as the existing "Analyzing…"
  label for `analyzing`), and disable the Auto button.
- The conversion-trigger `useEffect` (line ~56 in `app/page.tsx`, which
  already skips while `analyzing`) should also skip while `optimizing`,
  for the same reason — avoid converting a stale/about-to-be-replaced
  file.

## Testing

- `lib/image-compress.test.ts` (new):
  - No-op: file `<= TARGET_BYTES` returned unchanged.
  - Phase 1 only: large-dimension, small-byte image gets scaled to
    `MAX_DIMENSION`, format preserved.
  - Phase 1 + 2: jpeg input that's still too big after scaling steps
    down through quality levels.
  - PNG/GIF fallback: oversized PNG re-encoded as JPEG.
  - Decode failure: rejects with error.
- `lib/validate.test.ts`: update existing 10MB-rejection test to assert
  50MB threshold instead.

## Out of scope

- Server-side compression/validation changes.
- Preserving animation for oversized GIFs (documented tradeoff above).
- Progress percentage UI during compression (binary "Optimizing…" state
  is sufficient).
