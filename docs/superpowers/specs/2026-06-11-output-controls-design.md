# Output Controls — image2 CLI Parity

Date: 2026-06-11

## Goal

Expand `ControlsBar` so every relevant `image2` CLI flag is exposed in the UI,
per [2026-06-10-image2-ascii-forge-design.md](2026-06-10-image2-ascii-forge-design.md).

## Slider + freeform input pattern

Every numeric control gets **both**:
- a `<input type="range">` with a fixed min/max/step (sane default range)
- a paired `<input type="number">` with no `min`/`max` attributes

The range input's displayed `value` is clamped to `[min, max]`; the number
input shows the raw stored value. Typing a value beyond the slider's max
in the number input updates state to that value (slider pegs at its max,
state keeps the typed value). This lets users exceed the slider's nominal
range via free text, matching the CLI's unbounded float/int args.

## New controls → CLI flags

Shared (ASCII + ANSI), sent to both `/convert/ascii` and `/convert/ansi`:

| Control      | CLI flag      | Slider range   | Default |
|---------------|---------------|----------------|---------|
| Sharpness     | `-s`          | 0 – 5, step .1 | 2.5     |
| Saturate      | `--saturate`  | 0 – 3, step .1 | 1.0     |
| Min luminance | `--min-lum`   | 0 – 1, step .05| 0.0     |

Existing Width/Contrast/Brightness sliders gain paired number inputs (no
new ranges).

ASCII-only:

| Control            | CLI flag       | Type                          | Default |
|--------------------|----------------|-------------------------------|---------|
| Image width (px)   | `--img-width`  | slider 0–2000 step 20 + number | 0 (auto/off) |
| Image height (px)  | `--img-height` | slider 0–2000 step 20 + number | 0 (auto/off) |
| Background color   | `-b/--bg`      | freeform text (CSS color)     | `#070c12` (theme bg) |
| Select highlight   | `--select`     | checkbox                      | off     |

ANSI-only: `--mode` already implemented as the Palette segmented control.
`--png` not applicable (no html2image path in v1).

## Behavior details

- **sharpness/saturate/min-lum**: passed straight to `imgcommon.load_and_enhance`
  (sharpness, saturate) and `imgcommon.lift_luminance` (min-lum), replacing the
  hardcoded `SHARPNESS_DEFAULT`/`SATURATE_DEFAULT`/`MIN_LUM_DEFAULT` constants.
  ANSI converter currently skips luminance lifting entirely — add the same
  per-pixel `lift_luminance` pass (mirrors `image2.py`'s `_render_ansi`,
  applied before `image_to_ansi`) so `min-lum` affects both the on-screen
  preview and the exported `.ans` text.

- **Image width (px)**: when > 0, overrides the cols sent to `/convert/ascii`
  (`cols = round(imgWidth / charCellSize(fontSize).w)`), taking precedence
  over the Width slider for ASCII mode only. When 0, Width slider is used as
  today.

- **Image height (px)**: when > 0, converted client-side to a row count
  (`rows = round(imgHeight / charCellSize(fontSize).h)`) and sent as a new
  `img_height` form field (row count) to `/convert/ascii`. The converter
  resizes directly to `(cols, img_height)` instead of the aspect-derived
  `resize_for` height. When 0 (default), behavior is unchanged
  (`resize_for` with `cell_aspect=0.75`).

- **Background color**: freeform CSS color string, fills the ASCII canvas
  background in `drawAsciiGrid` (replacing the hardcoded `BG_HEX`) and is
  therefore included in `.png` exports. ANSI canvas is unaffected (every
  cell is fully painted).

- **Select highlight**: checkbox, ASCII-only. When on, `drawAsciiGrid` draws
  a `rgba(0,0,0,0.2)` rectangle over the bottom half of each text row,
  mirroring the `repeating-linear-gradient` selection-highlight overlay from
  `img2ascii.image_to_ascii_html`'s `--select` CSS. Purely a canvas overlay
  pass after glyphs are drawn — included in `.png` export, no effect on
  `.txt`/Copy text output.

## Files touched

- `server/converters.py` — new params on both converters; ANSI luminance lift.
- `server/main.py` — new `Form(...)` fields on both endpoints.
- `server/tests/test_converters.py`, `server/tests/test_main.py` — cover new params.
- `lib/types.ts`, `lib/convert.ts` — extend `ConvertParams`, send new fields.
- `lib/canvas-render.ts`, `lib/canvas-render.test.ts` — `drawAsciiGrid` gains `bg`/`select` params.
- `components/ControlsBar.tsx` — new fields, shared `SliderField` helper for the slider+number pattern.
- `app/page.tsx` — new state, wiring, effective-width/img-height computation.
