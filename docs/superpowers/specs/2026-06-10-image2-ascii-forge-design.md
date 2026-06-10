# Image2 — ASCII Forge Design Spec

Date: 2026-06-10

## Goal

Build "Image2": a Next.js (TypeScript) web app that recreates the
"ASCII Forge" design (Approach A — stacked vertical flow) and is powered by
the real [image2](https://github.com/c0dezer019/image2) Python CLI's
rendering modules (`img2ascii.py`, `img2ansi.py`, `imgcommon.py`). Users
upload an image, tune parameters, and get live ASCII or ANSI text-art output
they can copy or export.

**Source-of-truth rule:** UI features must map to real `image2` capabilities.
Design elements with no backend equivalent (charset selector, invert toggle,
monochrome ASCII tab) are dropped from v1 and documented as future work.

## Architecture

Two processes, one repo:

```
Image2/
  app/                      # Next.js App Router (TS)
    page.tsx                # main "ASCII Forge" page
    layout.tsx
    globals.css
    api/convert/route.ts    # proxies to Python server
  components/
    DropZone.tsx
    ControlsBar.tsx
    ModeTabs.tsx
    OutputCanvas.tsx
    ExportButtons.tsx
  lib/
    types.ts
    convert.ts              # client helper hitting /api/convert
  public/fonts/              # Space Grotesk + DM Mono (from design bundle)
  server/                    # Python FastAPI service
    main.py
    requirements.txt          # image2 @ git+https://github.com/c0dezer019/image2
  docs/superpowers/specs/
```

- Next.js dev server (port 3000) calls `/api/convert`, which proxies
  multipart form data to the FastAPI service (port 8000, configurable via
  `IMAGE2_SERVER_URL`). Proxying avoids CORS and keeps the Python URL out of
  client code.
- FastAPI server depends on the real `image2` package and imports
  `imgcommon.load_and_enhance`, `imgcommon.resize_for`, `imgcommon.lift_luminance`,
  `img2ascii.ascii_chars`, `img2ansi.image_to_ansi` directly — no
  reimplementation of PIL enhancement math or color ramps.

## Visual Design (from `ASCII Forge.dc.html`, Approach A)

- Background `#070c12`, text `oklch(92% 0.01 240)`, muted text
  `oklch(72% 0.02 240)`, accent teal `oklch(82% 0.16 182)`.
- Fonts: Space Grotesk (headings/body, variable weight 300–700), DM Mono
  (labels, monospace UI, light/regular/medium) — both self-hosted from the
  design bundle's `fonts/` files via `next/font/local`.
- Animated grid-drift background (`linear-gradient` 72px grid, 36s drift) +
  radial vignette overlay.
- Layout, top to bottom, max-width ~1000px centered:
  1. **Nav** — `>` glyph mark + "IMAGE2" wordmark (left), "THE APP FOUNDRY"
     label (right).
  2. **Hero** — eyebrow "01 / IMAGE → TEXT ART", H1 "Turn any image into text
     art.", subtext.
  3. **Drop zone** — dashed border, drag/drop + click-to-browse, "or try a
     sample image" link below. Active drag state highlights border/bg.
  4. **Controls bar** — `#0c1220` panel, border (no top border, sits flush
     under drop zone): Width, Contrast, Brightness, Font size sliders +
     numeric readouts; ANSI Palette segmented control (visible only in ANSI
     mode).
  5. **Output header** — "OUTPUT" label + segmented mode tabs (Color ASCII /
     ANSI) on left; Copy / .txt / .png buttons on right.
  6. **Output surface** — bordered panel, `<canvas>` rendering of the
     converted art, or placeholder ASCII art + "your forged output appears
     here" when empty.

All control styling (segmented buttons, sliders, borders) follows the exact
inline styles in the source `.dc.html` (square corners, 1px borders at
`oklch(100% 0 0 / 0.06–0.14)`, teal active states).

## Output Modes

Two tabs (mono ASCII / charset selector / invert dropped — see Future Work):

### Color ASCII (`POST /convert/ascii`)
Backend: `imgcommon.load_and_enhance` → `imgcommon.resize_for` (cell_aspect
0.75, matching `image_to_ascii_html`'s aspect math) → per-pixel loop using
imported `lift_luminance` + imported `ascii_chars` ramp to pick a glyph and
RGB color per cell. Returns:
```ts
{ cols: number, rows: number,
  cells: { ch: string, r: number, g: number, b: number }[][],
  text: string } // plain chars, newline-joined, for .txt export
```
Client renders to `<canvas>`: each cell drawn with DM Mono at `fontSize`,
fillStyle = cell RGB, on `#070c12` background — mirrors
`image_to_ascii_html`'s `<pre>`/span output.

### ANSI (`POST /convert/ansi`)
Backend: `imgcommon.load_and_enhance` → `imgcommon.resize_for` (cell_aspect
1.0, matching `image_to_ansi`'s 2-rows-per-cell sampling) → builds a
truecolor RGB grid (top/bottom pixel pair per cell) for on-screen rendering,
**and** calls the real `img2ansi.image_to_ansi(img, mode=palette)` to produce
the exact `.ans` escape-code text for the chosen palette. Returns:
```ts
{ cols: number, rows: number,
  cells: { topR, topG, topB, botR, botG, botB }[][], // truecolor preview
  ansiText: string } // real img2ansi output for chosen --mode
```
Client renders to `<canvas>`: each cell is a filled rect (top half = topRGB,
bottom half = botRGB), or draws `▀` glyph colored fg=top/bg=bottom — visual
preview is always truecolor regardless of palette (matches
`ansi_image_to_html`'s "always truecolor for PNG preview" behavior). The
chosen palette only affects `ansiText` (Copy/.txt).

## Controls → image2 flags

| UI control          | CLI flag      | Range (UI)        | Default | Notes |
|----------------------|---------------|--------------------|---------|-------|
| Width (cols)         | `-w/--width`  | 40–220             | 100 (ascii) / 80 (ansi) | per-mode default |
| Contrast             | `-c`          | 0.3–2.2 step 0.05  | 1.5     | CLI default |
| Brightness           | `-B`          | 0.2–2.0 step 0.02  | 1.0     | PIL multiplier, NOT additive (design used additive ±0.4 — corrected) |
| Font size            | `--font-size` | unrestricted (≥0.5px), numeric input + slider 2–32 | 6 | drives canvas cell size |
| Palette (ANSI only)  | `--mode`      | truecolor / 256 / bbs16 | truecolor | new control, not in source design |

Server-side fixed at CLI defaults (not exposed in v1): `sharpness=2.5`,
`saturate=1.0`, `min_lum=0.0`.

## Sample Image

"or try a sample image" button stays — generates the same in-browser canvas
sunset gradient as the prototype (client-side only, no backend change),
producing a PNG blob fed through the normal upload→convert flow.

## Export

- **Copy**: `navigator.clipboard.writeText` of `text` (ascii) or `ansiText`
  (ansi). Button shows "Copied ✓" for 1.6s.
- **.txt**: downloads `text` or `ansiText` as `image2.txt`.
- **.png**: `canvas.toBlob()` download as `image2.png`. No html2image /
  headless Chrome dependency.

## Error Handling

- Upload validation: client checks file type (PNG/JPG/GIF/WebP) and size
  (≤10MB) before sending; reject with inline message in drop zone otherwise.
- `/api/convert` proxy: on FastAPI unreachable or non-200, return JSON error;
  client shows an inline error message in the output surface (replacing
  placeholder), output buttons disabled.
- FastAPI: validates image decodes via Pillow; on failure returns 422 with
  message, surfaced as above.

## Dev Workflow

- `npm run dev` — Next.js on :3000.
- `server/`: `pip install -r requirements.txt && uvicorn main:app --reload
  --port 8000`.
- `.env.local`: `IMAGE2_SERVER_URL=http://localhost:8000`.

## Testing

- FastAPI: pytest unit tests for `/convert/ascii` and `/convert/ansi` against
  a small fixture image, asserting grid dimensions and that returned chars
  come from the real `ascii_chars` ramp / `ansiText` matches
  `img2ansi.image_to_ansi` output directly.
- Frontend: component tests for `ControlsBar` (slider→param mapping),
  `ModeTabs`, and `OutputCanvas` (renders given a mock grid response).
- Manual: run dev servers, upload sample image, verify both modes render,
  exports work, drag/drop + sample button work.

## Future Work (not in v1, no current image2 backend support)

- Monochrome "ASCII" tab (single accent-color rendering of the same char
  grid) and charset selector (Dense/Blocks/Min) — `img2ascii.py` has one
  fixed 69-char ramp.
- Invert toggle — no `--invert` flag in `img2ascii.py`/`img2ansi.py`.
- "Advanced" panel exposing `--saturate`, `-s/--sharpness`, `--min-lum`.
- On-screen ANSI preview that reflects 256/bbs16 quantization exactly
  (currently preview is always truecolor; only exports reflect palette).
- Native `--html`/`--png` (html2image) export paths from the CLI.
