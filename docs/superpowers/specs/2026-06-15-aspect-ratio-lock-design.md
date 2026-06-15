# Aspect Ratio Lock + Presets for Image Width/Height

Date: 2026-06-15

## Goal

Let users lock the ASCII-mode "Image width" / "Image height" px controls
(`--img-width` / `--img-height`, see
[2026-06-11-output-controls-design.md](2026-06-11-output-controls-design.md))
to a fixed aspect ratio, and pick from common AR presets.

## State (app/page.tsx)

- `sourceAspectRatio: number | null` — captured alongside the existing
  `imgWidth`/`imgHeight` pre-fill in `handleFile` (via `getImageDimensions`),
  as `naturalWidth / naturalHeight` of the uploaded original. Fixed per file,
  cleared/reset on new upload.
- `targetAspectRatio: number | null` — `null` means unlocked. Set by the lock
  checkbox or a preset click.

## Behavior

- **Lock checkbox**: ON sets `targetAspectRatio = sourceAspectRatio`
  (fallback: `imgWidth / imgHeight` if `sourceAspectRatio` is null and both
  are nonzero; if neither available, lock is a no-op). OFF sets it to `null`.
- **`onImgWidthChange(n)`**: sets `imgWidth = n`; if `targetAspectRatio` is
  set, also sets `imgHeight = Math.round(n / targetAspectRatio)`.
- **`onImgHeightChange(n)`**: sets `imgHeight = n`; if `targetAspectRatio` is
  set, also sets `imgWidth = Math.round(n * targetAspectRatio)`.
- **Auto (0) seeding**: if either field is `0` ("auto") when lock or a preset
  is applied, both `imgWidth`/`imgHeight` are first seeded from
  `sourceWidth`/`sourceHeight` (the raw natural dims captured at upload)
  before the ratio math runs.

## Presets

Segmented button row, ASCII mode only:

| Label   | Ratio (w/h) |
|---------|-------------|
| Original| `sourceAspectRatio` |
| 1:1     | 1           |
| 4:3     | 4/3         |
| 3:2     | 3/2         |
| 16:9    | 16/9        |
| 9:16    | 9/16        |
| 5:4     | 5/4         |
| 21:9    | 21/9        |
| 2:3     | 2/3         |

Clicking a preset:
1. Sets `targetAspectRatio` to that ratio (auto-enables lock).
2. Seeds from source dims if currently "auto" (per above).
3. Recomputes `imgHeight = Math.round(imgWidth / targetAspectRatio)`,
   keeping `imgWidth` fixed.

"Original" is disabled if `sourceAspectRatio === null` (dimension probe
failed).

## UI (components/ControlsBar.tsx)

- Lock toggle (chain-link checkbox) placed between the Image width and
  Image height `SliderField`s, ascii-mode only — follows existing
  checkbox pattern (e.g. `invert-checkbox`).
- Preset segmented-button row below the two sliders, same `segButtonStyle`
  pattern as the ANSI palette buttons. Highlights the active preset when
  `targetAspectRatio` matches one of the table values (within float
  tolerance); no preset highlighted otherwise.
- No fields become disabled — locked fields stay editable, edits to either
  one drive the paired recompute.

## Props added to `ControlsBarProps`

- `lockAspect: boolean`, `onLockAspectChange: (b: boolean) => void`
- `aspectPreset: number | null` (for highlighting), `onAspectPresetChange:
  (ar: number | null) => void`

`onImgWidthChange`/`onImgHeightChange` signatures stay the same; the ratio
math lives in `page.tsx` handlers, not in `ControlsBar`.
