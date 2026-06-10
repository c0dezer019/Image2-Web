# Image2 ASCII Forge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Image2 web app — a Next.js (TS) recreation of `ASCII Forge.dc.html` (Approach A) powered by a FastAPI service that imports the real `image2` package (`imgcommon`, `img2ascii`, `img2ansi`).

**Architecture:** Two processes — Next.js app (root) and `server/` FastAPI service. Next's `/api/convert` route proxies multipart uploads to FastAPI `/convert/ascii` or `/convert/ansi`, which run the real image2 enhancement/ramp/ANSI functions and return JSON grids the client renders to `<canvas>`.

**Tech Stack:** Next.js 14 (App Router, TS, Tailwind), Vitest (frontend unit tests), Python 3.14 + FastAPI + Pillow + `image2` (git dependency), pytest + httpx (backend tests).

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: entire Next.js app at repo root (via create-next-app into a temp dir, then merged in)

- [ ] **Step 1: Scaffold into a temp directory**

```bash
npx --yes create-next-app@latest /tmp/image2-scaffold --typescript --eslint --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Expected: completes with "Success! Created image2-scaffold" (or similar), `/tmp/image2-scaffold` contains `package.json`, `app/`, `tsconfig.json`, `tailwind.config.*` or `postcss.config.*`, `.gitignore`.

- [ ] **Step 2: Merge scaffold into repo root, excluding its `.git`**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
rsync -a --exclude='.git' /tmp/image2-scaffold/ ./
rm -rf /tmp/image2-scaffold
```

Expected: `package.json`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `tsconfig.json`, `.gitignore` now exist at repo root. `docs/` untouched.

- [ ] **Step 3: Verify install and lint**

```bash
npm run lint
```

Expected: exits 0 (no errors) on the freshly-generated default app.

- [ ] **Step 4: Add server venv to gitignore**

Append to `.gitignore`:
```
# Python server
server/.venv/
server/__pycache__/
server/**/__pycache__/
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app (TypeScript, Tailwind, App Router)"
```

---

## Task 2: Python server scaffold with health check

**Files:**
- Create: `server/requirements.txt`
- Create: `server/requirements-dev.txt`
- Create: `server/main.py`
- Create: `server/tests/test_main.py`
- Create: `server/tests/__init__.py` (empty)

- [ ] **Step 1: Write requirements files**

`server/requirements.txt`:
```
fastapi
uvicorn[standard]
python-multipart
image2 @ git+https://github.com/c0dezer019/image2.git
```

`server/requirements-dev.txt`:
```
-r requirements.txt
pytest
httpx
```

- [ ] **Step 2: Create venv and install**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements-dev.txt
```

Expected: installs fastapi, uvicorn, pillow, html2image, image2 (from git), pytest, httpx without errors. Verify:

```bash
.venv/bin/python -c "import imgcommon, img2ascii, img2ansi; print('ok')"
```

Expected: prints `ok`.

- [ ] **Step 3: Write the failing test**

`server/tests/__init__.py`: empty file.

`server/tests/test_main.py`:
```python
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest tests/test_main.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'main'` (or import error, since `main.py` doesn't exist yet).

- [ ] **Step 5: Write minimal implementation**

`server/main.py`:
```python
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="image2 server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest tests/test_main.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
git add server/requirements.txt server/requirements-dev.txt server/main.py server/tests
git commit -m "Add FastAPI server scaffold with health check"
```

---

## Task 3: ASCII converter (TDD)

**Files:**
- Create: `server/converters.py`
- Create: `server/tests/test_converters.py`

- [ ] **Step 1: Write the failing test**

`server/tests/test_converters.py`:
```python
import pytest
from PIL import Image

from converters import convert_to_ascii_grid
from img2ascii import ascii_chars


@pytest.fixture
def sample_image_path(tmp_path):
    img = Image.new("RGB", (40, 30))
    for y in range(30):
        for x in range(40):
            img.putpixel((x, y), (x * 6 % 256, y * 8 % 256, 128))
    path = tmp_path / "sample.png"
    img.save(path)
    return str(path)


def test_ascii_grid_dimensions_and_chars(sample_image_path):
    result = convert_to_ascii_grid(sample_image_path, width=20, contrast=1.5, brightness=1.0)
    assert result["cols"] == 20
    assert result["rows"] == len(result["cells"])
    assert len(result["cells"][0]) == 20
    for row in result["cells"]:
        for cell in row:
            assert cell["ch"] in ascii_chars
            assert 0 <= cell["r"] <= 255
            assert 0 <= cell["g"] <= 255
            assert 0 <= cell["b"] <= 255


def test_ascii_text_matches_cells(sample_image_path):
    result = convert_to_ascii_grid(sample_image_path, width=20, contrast=1.5, brightness=1.0)
    lines = result["text"].split("\n")
    assert len(lines) == result["rows"]
    for row, line in zip(result["cells"], lines):
        assert "".join(c["ch"] for c in row) == line
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest tests/test_converters.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'converters'`.

- [ ] **Step 3: Write minimal implementation**

`server/converters.py`:
```python
from __future__ import annotations

from imgcommon import lift_luminance, load_and_enhance, resize_for
from img2ascii import ascii_chars

SHARPNESS_DEFAULT = 2.5
SATURATE_DEFAULT = 1.0
MIN_LUM_DEFAULT = 0.0


def convert_to_ascii_grid(
    path: str, width: int, contrast: float, brightness: float
) -> dict:
    img = load_and_enhance(
        path, contrast, SHARPNESS_DEFAULT, brightness, SATURATE_DEFAULT
    )
    img = resize_for(img, width, cell_aspect=0.75)
    cols, rows = img.size

    cells: list[list[dict]] = []
    text_lines: list[str] = []
    for y in range(rows):
        row: list[dict] = []
        line_chars: list[str] = []
        for x in range(cols):
            r, g, b = img.getpixel((x, y))
            r, g, b = lift_luminance(r, g, b, MIN_LUM_DEFAULT)
            lum = int(0.299 * r + 0.587 * g + 0.114 * b)
            ch = ascii_chars[int(lum / 255 * (len(ascii_chars) - 1))]
            row.append({"ch": ch, "r": r, "g": g, "b": b})
            line_chars.append(ch)
        cells.append(row)
        text_lines.append("".join(line_chars))

    return {"cols": cols, "rows": rows, "cells": cells, "text": "\n".join(text_lines)}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest tests/test_converters.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
git add server/converters.py server/tests/test_converters.py
git commit -m "Add ASCII grid converter using real img2ascii ramp + lift_luminance"
```

---

## Task 4: ANSI converter (TDD)

**Files:**
- Modify: `server/converters.py`
- Modify: `server/tests/test_converters.py`

- [ ] **Step 1: Write the failing test**

Append to `server/tests/test_converters.py`:
```python
from img2ansi import image_to_ansi
from imgcommon import load_and_enhance as _load_and_enhance
from imgcommon import resize_for as _resize_for


def test_ansi_grid_matches_real_image_to_ansi(sample_image_path):
    from converters import convert_to_ansi_grid

    result = convert_to_ansi_grid(
        sample_image_path, width=20, contrast=1.5, brightness=1.0, palette="truecolor"
    )

    img = _load_and_enhance(sample_image_path, 1.5, 2.5, 1.0, 1.0)
    img = _resize_for(img, 20, cell_aspect=1.0)
    expected_ansi = image_to_ansi(img, mode="truecolor")

    assert result["ansiText"] == expected_ansi
    assert result["cols"] == img.width
    assert result["rows"] == img.height // 2
    assert len(result["cells"]) == result["rows"]
    assert len(result["cells"][0]) == result["cols"]
    for row in result["cells"]:
        for cell in row:
            for key in ("topR", "topG", "topB", "botR", "botG", "botB"):
                assert 0 <= cell[key] <= 255


def test_ansi_grid_palette_changes_ansi_text_only(sample_image_path):
    from converters import convert_to_ansi_grid

    truecolor = convert_to_ansi_grid(
        sample_image_path, width=20, contrast=1.5, brightness=1.0, palette="truecolor"
    )
    bbs16 = convert_to_ansi_grid(
        sample_image_path, width=20, contrast=1.5, brightness=1.0, palette="bbs16"
    )

    assert truecolor["ansiText"] != bbs16["ansiText"]
    assert truecolor["cells"] == bbs16["cells"]
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest tests/test_converters.py -v
```

Expected: FAIL — `ImportError: cannot import name 'convert_to_ansi_grid' from 'converters'`.

- [ ] **Step 3: Write minimal implementation**

Append to `server/converters.py`:
```python
from img2ansi import image_to_ansi


def convert_to_ansi_grid(
    path: str, width: int, contrast: float, brightness: float, palette: str
) -> dict:
    img = load_and_enhance(
        path, contrast, SHARPNESS_DEFAULT, brightness, SATURATE_DEFAULT
    )
    img = resize_for(img, width, cell_aspect=1.0)
    w, h = img.size
    rows = h // 2

    cells: list[list[dict]] = []
    for cy in range(rows):
        y = cy * 2
        row: list[dict] = []
        for x in range(w):
            tr, tg, tb = img.getpixel((x, y))
            br, bg, bb = img.getpixel((x, y + 1))
            row.append(
                {
                    "topR": tr, "topG": tg, "topB": tb,
                    "botR": br, "botG": bg, "botB": bb,
                }
            )
        cells.append(row)

    ansi_text = image_to_ansi(img, mode=palette)
    return {"cols": w, "rows": rows, "cells": cells, "ansiText": ansi_text}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest tests/test_converters.py -v
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
git add server/converters.py server/tests/test_converters.py
git commit -m "Add ANSI grid converter using real img2ansi.image_to_ansi"
```

---

## Task 5: Wire FastAPI endpoints + integration tests

**Files:**
- Modify: `server/main.py`
- Modify: `server/tests/test_main.py`

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/test_main.py`:
```python
import io

from PIL import Image


def _sample_png_bytes() -> bytes:
    img = Image.new("RGB", (40, 30), (120, 60, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_convert_ascii_returns_grid():
    res = client.post(
        "/convert/ascii",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={"width": "20", "contrast": "1.5", "brightness": "1.0"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["cols"] == 20
    assert len(body["cells"]) == body["rows"]


def test_convert_ansi_returns_grid_and_text():
    res = client.post(
        "/convert/ansi",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={"width": "20", "contrast": "1.5", "brightness": "1.0", "palette": "truecolor"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["cols"] == 20
    assert "ansiText" in body
    assert body["ansiText"].startswith("\x1b[")


def test_convert_ascii_rejects_bad_image():
    res = client.post(
        "/convert/ascii",
        files={"file": ("bad.png", b"not an image", "image/png")},
        data={"width": "20", "contrast": "1.5", "brightness": "1.0"},
    )
    assert res.status_code == 422


def test_convert_ansi_rejects_bad_palette():
    res = client.post(
        "/convert/ansi",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={"width": "20", "contrast": "1.5", "brightness": "1.0", "palette": "bogus"},
    )
    assert res.status_code == 422
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest tests/test_main.py -v
```

Expected: FAIL — `404 Not Found` for `/convert/ascii` and `/convert/ansi` (routes don't exist yet).

- [ ] **Step 3: Write minimal implementation**

Replace `server/main.py` with:
```python
from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import UnidentifiedImageError

from converters import convert_to_ansi_grid, convert_to_ascii_grid

app = FastAPI(title="image2 server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_PALETTES = ("truecolor", "256", "bbs16")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _save_upload(file: UploadFile) -> str:
    suffix = os.path.splitext(file.filename or "")[1]
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(file.file.read())
    return path


@app.post("/convert/ascii")
def convert_ascii(
    file: UploadFile = File(...),
    width: int = Form(100),
    contrast: float = Form(1.5),
    brightness: float = Form(1.0),
) -> dict:
    path = _save_upload(file)
    try:
        return convert_to_ascii_grid(path, width, contrast, brightness)
    except UnidentifiedImageError:
        raise HTTPException(status_code=422, detail="Could not read image file")
    finally:
        os.remove(path)


@app.post("/convert/ansi")
def convert_ansi(
    file: UploadFile = File(...),
    width: int = Form(80),
    contrast: float = Form(1.5),
    brightness: float = Form(1.0),
    palette: str = Form("truecolor"),
) -> dict:
    if palette not in VALID_PALETTES:
        raise HTTPException(status_code=422, detail="Invalid palette")
    path = _save_upload(file)
    try:
        return convert_to_ansi_grid(path, width, contrast, brightness, palette)
    except UnidentifiedImageError:
        raise HTTPException(status_code=422, detail="Could not read image file")
    finally:
        os.remove(path)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/pytest -v
```

Expected: PASS (all tests across `test_main.py` and `test_converters.py`).

- [ ] **Step 5: Commit**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
git add server/main.py server/tests/test_main.py
git commit -m "Wire FastAPI /convert/ascii and /convert/ansi endpoints"
```

---

## Task 6: Frontend theme constants + shared types

**Files:**
- Create: `lib/theme.ts`
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/theme.ts`**

```typescript
export const COLORS = {
  bg: "#070c12",
  text: "oklch(92% 0.01 240)",
  muted: "oklch(72% 0.02 240)",
  accent: "oklch(82% 0.16 182)",
  accentFaint: "oklch(82% 0.16 182 / 0.025)",
  accentDim: "oklch(82% 0.16 182 / 0.06)",
  border: "oklch(100% 0 0 / 0.06)",
  borderStrong: "oklch(100% 0 0 / 0.14)",
} as const;

export const FONT_SANS = "'Space Grotesk', sans-serif";
export const FONT_MONO = "'DM Mono', monospace";
export const ACCENT_HEX = "#46e3d0";
export const BG_HEX = "#070c12";
```

- [ ] **Step 2: Write `lib/types.ts`**

```typescript
export type OutputMode = "ascii" | "ansi";
export type AnsiPalette = "truecolor" | "256" | "bbs16";

export interface AsciiCell {
  ch: string;
  r: number;
  g: number;
  b: number;
}

export interface AsciiResult {
  cols: number;
  rows: number;
  cells: AsciiCell[][];
  text: string;
}

export interface AnsiCell {
  topR: number;
  topG: number;
  topB: number;
  botR: number;
  botG: number;
  botB: number;
}

export interface AnsiResult {
  cols: number;
  rows: number;
  cells: AnsiCell[][];
  ansiText: string;
}

export interface ConvertParams {
  mode: OutputMode;
  width: number;
  contrast: number;
  brightness: number;
  fontSize: number;
  palette: AnsiPalette;
}
```

- [ ] **Step 3: Verify it typechecks**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/theme.ts lib/types.ts
git commit -m "Add theme constants and shared types"
```

---

## Task 7: Image file validation (TDD) + Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/validate.ts`
- Create: `lib/validate.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npm install -D vitest jsdom
```

Expected: installs without errors, `package.json` `devDependencies` gains `vitest` and `jsdom`.

- [ ] **Step 2: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 3: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "jsdom" },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 4: Write the failing test**

`lib/validate.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { validateImageFile } from "./validate";

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a small PNG", () => {
    const result = validateImageFile(makeFile("a.png", "image/png", 1024));
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported type", () => {
    const result = validateImageFile(makeFile("a.txt", "text/plain", 1024));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/PNG, JPG, GIF, or WebP/);
  });

  it("rejects files over 10MB", () => {
    const result = validateImageFile(makeFile("a.png", "image/png", 11 * 1024 * 1024));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/10MB/);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx vitest run lib/validate.test.ts
```

Expected: FAIL — `Cannot find module './validate'`.

- [ ] **Step 6: Write minimal implementation**

`lib/validate.ts`:
```typescript
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, error: "Unsupported file type. Use PNG, JPG, GIF, or WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File too large. Max 10MB." };
  }
  return { ok: true };
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx vitest run lib/validate.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts lib/validate.ts lib/validate.test.ts package.json package-lock.json
git commit -m "Add image file validation with Vitest setup"
```

---

## Task 8: Sample image generator (TDD)

**Files:**
- Create: `lib/sample-image.ts`
- Create: `lib/sample-image.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/sample-image.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { drawSampleScene } from "./sample-image";

function makeCtx() {
  return {
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
  };
}

describe("drawSampleScene", () => {
  it("paints sky, sun, and mountains", () => {
    const ctx = makeCtx();
    drawSampleScene(ctx as unknown as CanvasRenderingContext2D, 420, 300);

    expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalledWith(210, 126, 90, 0, Math.PI * 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx vitest run lib/sample-image.test.ts
```

Expected: FAIL — `Cannot find module './sample-image'`.

- [ ] **Step 3: Write minimal implementation**

`lib/sample-image.ts`:
```typescript
export function drawSampleScene(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0a1a3a");
  sky.addColorStop(1, "#b8632a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunX = w * 0.5;
  const sunY = h * 0.42;
  const sun = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  sun.addColorStop(0, "#fff3c4");
  sun.addColorStop(0.5, "#ffcf5c");
  sun.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1530";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.18, h * 0.62);
  ctx.lineTo(w * 0.36, h * 0.8);
  ctx.lineTo(w * 0.55, h * 0.55);
  ctx.lineTo(w * 0.78, h * 0.82);
  ctx.lineTo(w, h * 0.66);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

export function createSampleImageBlob(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));
  drawSampleScene(ctx, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create sample image"));
        return;
      }
      resolve(blob);
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx vitest run lib/sample-image.test.ts
```

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/sample-image.ts lib/sample-image.test.ts
git commit -m "Add sample image generator"
```

---

## Task 9: Canvas rendering for ASCII and ANSI grids (TDD)

**Files:**
- Create: `lib/canvas-render.ts`
- Create: `lib/canvas-render.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/canvas-render.test.ts`:
```typescript
import { describe, expect, it, vi } from "vitest";
import { charCellSize, drawAsciiGrid, drawAnsiGrid } from "./canvas-render";
import type { AnsiResult, AsciiResult } from "./types";

function makeCtx() {
  return {
    canvas: { width: 0, height: 0 },
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: "",
    font: "",
    textBaseline: "",
  };
}

describe("charCellSize", () => {
  it("scales with font size", () => {
    expect(charCellSize(10)).toEqual({ w: 6, h: 11.2 });
  });
});

describe("drawAsciiGrid", () => {
  const result: AsciiResult = {
    cols: 2,
    rows: 2,
    cells: [
      [{ ch: "A", r: 255, g: 0, b: 0 }, { ch: " ", r: 0, g: 255, b: 0 }],
      [{ ch: "B", r: 0, g: 0, b: 255 }, { ch: "C", r: 1, g: 2, b: 3 }],
    ],
    text: "A \nBC",
  };

  it("sizes the canvas and skips space glyphs", () => {
    const ctx = makeCtx();
    drawAsciiGrid(ctx as unknown as CanvasRenderingContext2D, result, 10);

    const { w, h } = charCellSize(10);
    expect(ctx.canvas.width).toBe(Math.round(2 * w));
    expect(ctx.canvas.height).toBe(Math.round(2 * h));
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
    expect(ctx.fillText).toHaveBeenCalledWith("A", 0, 0);
    expect(ctx.fillText).toHaveBeenCalledWith("B", 0, h);
    expect(ctx.fillText).toHaveBeenCalledWith("C", w, h);
  });
});

describe("drawAnsiGrid", () => {
  const result: AnsiResult = {
    cols: 2,
    rows: 1,
    cells: [
      [
        { topR: 255, topG: 0, botR: 0, botG: 255, topB: 0, botB: 0 },
        { topR: 0, topG: 0, topB: 255, botR: 255, botG: 255, botB: 255 },
      ],
    ],
    ansiText: "",
  };

  it("sizes the canvas and fills top/bottom halves per cell", () => {
    const ctx = makeCtx();
    drawAnsiGrid(ctx as unknown as CanvasRenderingContext2D, result, 10);

    const { w, h } = charCellSize(10);
    expect(ctx.canvas.width).toBe(Math.round(2 * w));
    expect(ctx.canvas.height).toBe(Math.round(1 * h));
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx vitest run lib/canvas-render.test.ts
```

Expected: FAIL — `Cannot find module './canvas-render'`.

- [ ] **Step 3: Write minimal implementation**

`lib/canvas-render.ts`:
```typescript
import { BG_HEX, FONT_MONO } from "./theme";
import type { AnsiResult, AsciiResult } from "./types";

export function charCellSize(fontSize: number): { w: number; h: number } {
  return { w: fontSize * 0.6, h: fontSize * 1.12 };
}

export function drawAsciiGrid(
  ctx: CanvasRenderingContext2D,
  result: AsciiResult,
  fontSize: number,
): void {
  const { w: charW, h: charH } = charCellSize(fontSize);
  ctx.canvas.width = Math.round(result.cols * charW);
  ctx.canvas.height = Math.round(result.rows * charH);

  ctx.fillStyle = BG_HEX;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.font = `${fontSize}px ${FONT_MONO}`;
  ctx.textBaseline = "top";

  result.cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell.ch === " ") return;
      ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`;
      ctx.fillText(cell.ch, x * charW, y * charH);
    });
  });
}

export function drawAnsiGrid(
  ctx: CanvasRenderingContext2D,
  result: AnsiResult,
  fontSize: number,
): void {
  const { w: cellW, h: cellH } = charCellSize(fontSize);
  const halfH = cellH / 2;
  ctx.canvas.width = Math.round(result.cols * cellW);
  ctx.canvas.height = Math.round(result.rows * cellH);

  result.cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      ctx.fillStyle = `rgb(${cell.topR},${cell.topG},${cell.topB})`;
      ctx.fillRect(x * cellW, y * cellH, cellW, halfH);
      ctx.fillStyle = `rgb(${cell.botR},${cell.botG},${cell.botB})`;
      ctx.fillRect(x * cellW, y * cellH + halfH, cellW, halfH);
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx vitest run lib/canvas-render.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/canvas-render.ts lib/canvas-render.test.ts
git commit -m "Add canvas rendering for ASCII and ANSI grids"
```

---

## Task 10: Convert proxy — client helper + API route

**Files:**
- Create: `lib/convert.ts`
- Create: `app/api/convert/route.ts`

- [ ] **Step 1: Write `lib/convert.ts`**

```typescript
import type { AnsiResult, AsciiResult, ConvertParams } from "./types";

export async function convertImage(
  file: Blob,
  params: ConvertParams,
): Promise<AsciiResult | AnsiResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("width", String(params.width));
  form.append("contrast", String(params.contrast));
  form.append("brightness", String(params.brightness));
  if (params.mode === "ansi") {
    form.append("palette", params.palette);
  }

  const res = await fetch(`/api/convert?mode=${params.mode}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Conversion failed (${res.status})`);
  }

  return res.json();
}
```

- [ ] **Step 2: Write `app/api/convert/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

const SERVER_URL = process.env.IMAGE2_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  if (mode !== "ascii" && mode !== "ansi") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const formData = await req.formData();
  const upstream = await fetch(`${SERVER_URL}/convert/${mode}`, {
    method: "POST",
    body: formData,
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return NextResponse.json({ error: data.detail || "Conversion failed" }, { status: upstream.status });
  }

  return NextResponse.json(data);
}
```

- [ ] **Step 3: Create `.env.local`**

```
IMAGE2_SERVER_URL=http://localhost:8000
```

(Already covered by create-next-app's default `.gitignore` `.env*` pattern — verify with `git status` that `.env.local` is untracked.)

- [ ] **Step 4: Verify it typechecks**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/convert.ts app/api/convert/route.ts
git commit -m "Add /api/convert proxy to FastAPI server"
```

---

## Task 11: Fonts, global styles, page shell (nav + hero + background)

**Files:**
- Create: `public/fonts/` (copied `.ttf` files)
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`

- [ ] **Step 1: Copy fonts from extracted design bundle**

```bash
mkdir -p /home/brian/Documents/c0de_box/www/Image2/public/fonts
cp /tmp/design_extracted/image2/project/fonts/*.ttf /home/brian/Documents/c0de_box/www/Image2/public/fonts/
ls /home/brian/Documents/c0de_box/www/Image2/public/fonts/
```

Expected: lists `SpaceGrotesk-VariableFont_wght.ttf`, `DMMono-Light.ttf`, `DMMono-Regular.ttf`, `DMMono-Medium.ttf` (or equivalent names — adjust the `next/font/local` paths in Step 2 to match actual filenames).

- [ ] **Step 2: Rewrite `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const spaceGrotesk = localFont({
  src: "../public/fonts/SpaceGrotesk-VariableFont_wght.ttf",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmMono = localFont({
  src: [
    { path: "../public/fonts/DMMono-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/DMMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/DMMono-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Image2",
  description: "Turn any image into ASCII or ANSI text art.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Rewrite `app/globals.css`**

```css
@import "tailwindcss";

html,
body {
  margin: 0;
  padding: 0;
  background: #070c12;
  color: oklch(92% 0.01 240);
  font-family: var(--font-space-grotesk), sans-serif;
}

@keyframes gridDrift {
  to {
    transform: translate(72px, 72px);
  }
}

::selection {
  background: oklch(82% 0.16 182 / 0.3);
}
```

- [ ] **Step 4: Write intermediate `app/page.tsx` (shell only)**

```tsx
import { COLORS, FONT_MONO } from "@/lib/theme";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, position: "relative", overflow: "hidden" }}>
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
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "46px 40px 120px" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
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
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
              Image2
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.muted }}>
            The App Foundry
          </div>
        </nav>

        <header style={{ textAlign: "center", paddingBottom: 44 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: COLORS.accent, marginBottom: 18 }}>
            01 / IMAGE &rarr; TEXT ART
          </div>
          <h1 style={{ fontSize: "clamp(38px, 5.6vw, 68px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 0.96, margin: "0 0 18px" }}>
            Turn any image
            <br />
            into text art.
          </h1>
          <p style={{ maxWidth: 470, margin: "0 auto", fontSize: 17, lineHeight: 1.5, color: COLORS.muted }}>
            Drop a picture below. We forge it into crisp ASCII or full-color ANSI — tune it, then copy or export.
          </p>
        </header>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run dev server and verify visually**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npm run dev
```

Expected: `localhost:3000` shows dark background, animated grid drift, vignette, "Image2" nav, "THE APP FOUNDRY" label, hero heading "Turn any image into text art." Stop the server (Ctrl+C) after checking.

- [ ] **Step 6: Commit**

```bash
git add public/fonts app/layout.tsx app/globals.css app/page.tsx
git commit -m "Add page shell: fonts, background animation, nav, hero"
```

---

## Task 12: DropZone component

**Files:**
- Create: `components/DropZone.tsx`

- [ ] **Step 1: Write `components/DropZone.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { COLORS } from "@/lib/theme";
import { createSampleImageBlob } from "@/lib/sample-image";
import { validateImageFile } from "@/lib/validate";

interface DropZoneProps {
  fileName: string | null;
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

export function DropZone({ fileName, onFile, onError }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const result = validateImageFile(file);
    if (!result.ok) {
      onError(result.error ?? "Invalid file");
      return;
    }
    onFile(file);
  }

  async function handleSample() {
    const blob = await createSampleImageBlob();
    onFile(new File([blob], "sample.png", { type: "image/png" }));
  }

  const borderColor = dragging ? COLORS.accent : "oklch(72% 0.02 240 / 0.45)";
  const bgColor = dragging ? "oklch(82% 0.16 182 / 0.08)" : COLORS.accentFaint;

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          border: `1.5px dashed ${borderColor}`,
          background: bgColor,
          borderRadius: 0,
          padding: "54px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          style={{
            width: 46,
            height: 46,
            border: `1px solid ${COLORS.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>
          {fileName ?? "Drag & drop an image here"}
        </div>
        <div style={{ fontSize: 13, color: COLORS.muted }}>
          {fileName ? "click to replace · PNG, JPG, GIF, WebP" : "PNG, JPG, GIF, WebP — up to 10MB"}
        </div>
        <div
          style={{
            border: `1px solid ${COLORS.accent}`,
            color: COLORS.accent,
            fontSize: 12,
            padding: "6px 14px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Browse files
        </div>
      </div>
      <div style={{ textAlign: "right", marginTop: 10 }}>
        <button
          onClick={handleSample}
          style={{
            background: "none",
            border: "none",
            color: COLORS.muted,
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
          }}
        >
          or try a sample image
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add components/DropZone.tsx
git commit -m "Add DropZone component with drag/drop and sample image"
```

---

## Task 13: ControlsBar component

**Files:**
- Create: `components/ControlsBar.tsx`

- [ ] **Step 1: Write `components/ControlsBar.tsx`**

```tsx
"use client";

import { COLORS, FONT_MONO } from "@/lib/theme";
import type { AnsiPalette, OutputMode } from "@/lib/types";

interface ControlsBarProps {
  mode: OutputMode;
  width: number;
  contrast: number;
  brightness: number;
  fontSize: number;
  palette: AnsiPalette;
  onWidthChange: (n: number) => void;
  onContrastChange: (n: number) => void;
  onBrightnessChange: (n: number) => void;
  onFontSizeChange: (n: number) => void;
  onPaletteChange: (p: AnsiPalette) => void;
}

const labelStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: COLORS.muted,
  display: "block",
  marginBottom: 8,
};

function sliderStyle(): React.CSSProperties {
  return { width: "100%", accentColor: COLORS.accent };
}

function segButtonStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "6px 14px",
    cursor: "pointer",
    background: active ? COLORS.accent : "transparent",
    color: active ? COLORS.bg : COLORS.muted,
    border: `1px solid ${active ? COLORS.accent : COLORS.borderStrong}`,
  };
}

export function ControlsBar({
  mode,
  width,
  contrast,
  brightness,
  fontSize,
  palette,
  onWidthChange,
  onContrastChange,
  onBrightnessChange,
  onFontSizeChange,
  onPaletteChange,
}: ControlsBarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "20px 32px",
        border: `1px solid ${COLORS.border}`,
        borderTop: "none",
        background: "#0c1220",
        padding: "22px 24px",
        marginTop: 18,
      }}
    >
      <div style={{ flex: "1 1 160px" }}>
        <label style={labelStyle}>Width — {width} cols</label>
        <input
          type="range"
          min={40}
          max={220}
          step={2}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          style={sliderStyle()}
        />
      </div>

      <div style={{ flex: "1 1 160px" }}>
        <label style={labelStyle}>Contrast — {contrast.toFixed(2)}</label>
        <input
          type="range"
          min={0.3}
          max={2.2}
          step={0.05}
          value={contrast}
          onChange={(e) => onContrastChange(Number(e.target.value))}
          style={sliderStyle()}
        />
      </div>

      <div style={{ flex: "1 1 160px" }}>
        <label style={labelStyle}>Brightness — {brightness.toFixed(2)}&times;</label>
        <input
          type="range"
          min={0.2}
          max={2.0}
          step={0.02}
          value={brightness}
          onChange={(e) => onBrightnessChange(Number(e.target.value))}
          style={sliderStyle()}
        />
      </div>

      <div style={{ flex: "1 1 160px" }}>
        <label style={labelStyle}>Font size — {fontSize}px</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="range"
            min={2}
            max={32}
            step={0.5}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            style={sliderStyle()}
          />
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            style={{
              width: 56,
              background: "transparent",
              border: `1px solid ${COLORS.borderStrong}`,
              color: COLORS.text,
              fontFamily: FONT_MONO,
              fontSize: 12,
              padding: "4px 6px",
            }}
          />
        </div>
      </div>

      {mode === "ansi" && (
        <div style={{ flex: "1 1 100%" }}>
          <label style={labelStyle}>ANSI Palette</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["truecolor", "256", "bbs16"] as AnsiPalette[]).map((p) => (
              <button key={p} onClick={() => onPaletteChange(p)} style={segButtonStyle(palette === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ControlsBar.tsx
git commit -m "Add ControlsBar with width/contrast/brightness/font-size sliders and ANSI palette selector"
```

---

## Task 14: OutputHeader component

**Files:**
- Create: `components/OutputHeader.tsx`

- [ ] **Step 1: Write `components/OutputHeader.tsx`**

```tsx
"use client";

import { COLORS, FONT_MONO } from "@/lib/theme";
import type { OutputMode } from "@/lib/types";

interface OutputHeaderProps {
  mode: OutputMode;
  onModeChange: (m: OutputMode) => void;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onDownloadPng: () => void;
  copied: boolean;
  hasOutput: boolean;
}

const TABS: { label: string; value: OutputMode }[] = [
  { label: "Color ASCII", value: "ascii" },
  { label: "ANSI", value: "ansi" },
];

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: FONT_MONO,
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "6px 14px",
    cursor: "pointer",
    background: active ? COLORS.accent : "transparent",
    color: active ? COLORS.bg : COLORS.muted,
    border: `1px solid ${active ? COLORS.accent : COLORS.borderStrong}`,
  };
}

export function OutputHeader({
  mode,
  onModeChange,
  onCopy,
  onDownloadTxt,
  onDownloadPng,
  copied,
  hasOutput,
}: OutputHeaderProps) {
  const disabledStyle: React.CSSProperties = hasOutput
    ? {}
    : { opacity: 0.4, pointerEvents: "none" };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginTop: 28,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: COLORS.accent }}>
          Output
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {TABS.map((tab) => (
            <button key={tab.value} onClick={() => onModeChange(tab.value)} style={tabStyle(mode === tab.value)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, ...disabledStyle }}>
        <button
          onClick={onCopy}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 14px",
            cursor: "pointer",
            background: copied ? COLORS.accent : "transparent",
            color: copied ? COLORS.bg : COLORS.accent,
            border: `1px solid ${COLORS.accent}`,
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={onDownloadTxt}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 14px",
            cursor: "pointer",
            background: "transparent",
            color: COLORS.muted,
            border: `1px solid ${COLORS.borderStrong}`,
          }}
        >
          .txt
        </button>
        <button
          onClick={onDownloadPng}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 14px",
            cursor: "pointer",
            background: "transparent",
            color: COLORS.muted,
            border: `1px solid ${COLORS.borderStrong}`,
          }}
        >
          .png
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx tsc --noEmit
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add components/OutputHeader.tsx
git commit -m "Add OutputHeader with mode tabs and export buttons"
```

---

## Task 15: OutputCanvas, export helpers, final page wiring

**Files:**
- Create: `components/OutputCanvas.tsx`
- Create: `lib/export.ts`
- Modify: `app/page.tsx` (full rewrite of Task 11's shell)

- [ ] **Step 1: Write `lib/export.ts`**

```typescript
export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}
```

- [ ] **Step 2: Write `components/OutputCanvas.tsx`**

```tsx
"use client";

import { forwardRef } from "react";
import { COLORS, FONT_MONO } from "@/lib/theme";

interface OutputCanvasProps {
  hasOutput: boolean;
  errorMessage: string | null;
}

const PLACEHOLDER_ART = `        .
       .:.
      .:::.
   ..:::::::..
 .::::::::::::::.
:::::::::::::::::::
 \`::::::::::::::::\`
   \`::::::::::::\`
      \`::::::\`
        \`::\`
         \`\``;

export const OutputCanvas = forwardRef<HTMLCanvasElement, OutputCanvasProps>(
  function OutputCanvas({ hasOutput, errorMessage }, ref) {
    return (
      <div
        style={{
          border: `1px solid ${COLORS.border}`,
          background: COLORS.bg,
          minHeight: 240,
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
        }}
      >
        {errorMessage ? (
          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: COLORS.muted, textAlign: "center" }}>
            {errorMessage}
          </div>
        ) : hasOutput ? (
          <canvas ref={ref} style={{ display: "block", imageRendering: "pixelated" }} />
        ) : (
          <div style={{ textAlign: "center" }}>
            <pre
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                lineHeight: 1.15,
                color: "oklch(82% 0.16 182 / 0.28)",
                margin: "0 0 14px",
              }}
            >
              {PLACEHOLDER_ART}
            </pre>
            <div style={{ fontFamily: FONT_MONO, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.muted }}>
              your forged output appears here
            </div>
          </div>
        )}
      </div>
    );
  },
);
```

- [ ] **Step 3: Rewrite `app/page.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { ControlsBar } from "@/components/ControlsBar";
import { OutputHeader } from "@/components/OutputHeader";
import { OutputCanvas } from "@/components/OutputCanvas";
import { COLORS, FONT_MONO } from "@/lib/theme";
import { convertImage } from "@/lib/convert";
import { drawAsciiGrid, drawAnsiGrid } from "@/lib/canvas-render";
import { downloadCanvasPng, downloadText } from "@/lib/export";
import type { AnsiPalette, AnsiResult, AsciiResult, OutputMode } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<OutputMode>("ascii");
  const [width, setWidth] = useState(100);
  const [contrast, setContrast] = useState(1.5);
  const [brightness, setBrightness] = useState(1.0);
  const [fontSize, setFontSize] = useState(6);
  const [palette, setPalette] = useState<AnsiPalette>("truecolor");
  const [result, setResult] = useState<AsciiResult | AnsiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!file) return;
    const id = ++requestIdRef.current;
    const params = { mode, width, contrast, brightness, fontSize, palette };
    const timer = setTimeout(() => {
      setError(null);
      convertImage(file, params)
        .then((data) => {
          if (requestIdRef.current === id) setResult(data);
        })
        .catch((err: Error) => {
          if (requestIdRef.current === id) {
            setError(err.message);
            setResult(null);
          }
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [file, mode, width, contrast, brightness, fontSize, palette]);

  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if (mode === "ascii") {
      drawAsciiGrid(ctx, result as AsciiResult, fontSize);
    } else {
      drawAnsiGrid(ctx, result as AnsiResult, fontSize);
    }
  }, [result, mode, fontSize]);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
  }, []);

  function handleCopy() {
    if (!result) return;
    const text = mode === "ascii" ? (result as AsciiResult).text : (result as AnsiResult).ansiText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function handleDownloadTxt() {
    if (!result) return;
    const text = mode === "ascii" ? (result as AsciiResult).text : (result as AnsiResult).ansiText;
    downloadText("image2.txt", text);
  }

  function handleDownloadPng() {
    if (!canvasRef.current) return;
    downloadCanvasPng(canvasRef.current, "image2.png");
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, position: "relative", overflow: "hidden" }}>
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
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1000, margin: "0 auto", padding: "46px 40px 120px" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
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
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
              Image2
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.muted }}>
            The App Foundry
          </div>
        </nav>

        <header style={{ textAlign: "center", paddingBottom: 44 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: COLORS.accent, marginBottom: 18 }}>
            01 / IMAGE &rarr; TEXT ART
          </div>
          <h1 style={{ fontSize: "clamp(38px, 5.6vw, 68px)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 0.96, margin: "0 0 18px" }}>
            Turn any image
            <br />
            into text art.
          </h1>
          <p style={{ maxWidth: 470, margin: "0 auto", fontSize: 17, lineHeight: 1.5, color: COLORS.muted }}>
            Drop a picture below. We forge it into crisp ASCII or full-color ANSI — tune it, then copy or export.
          </p>
        </header>

        <DropZone fileName={file?.name ?? null} onFile={handleFile} onError={setError} />

        <ControlsBar
          mode={mode}
          width={width}
          contrast={contrast}
          brightness={brightness}
          fontSize={fontSize}
          palette={palette}
          onWidthChange={setWidth}
          onContrastChange={setContrast}
          onBrightnessChange={setBrightness}
          onFontSizeChange={setFontSize}
          onPaletteChange={setPalette}
        />

        <OutputHeader
          mode={mode}
          onModeChange={setMode}
          onCopy={handleCopy}
          onDownloadTxt={handleDownloadTxt}
          onDownloadPng={handleDownloadPng}
          copied={copied}
          hasOutput={!!result}
        />

        <OutputCanvas ref={canvasRef} hasOutput={!!result} errorMessage={error} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run typecheck and unit tests**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npx tsc --noEmit
npx vitest run
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/OutputCanvas.tsx lib/export.ts app/page.tsx
git commit -m "Wire page together: state, debounced conversion, canvas rendering, export"
```

---

## Task 16: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the FastAPI server**

```bash
cd /home/brian/Documents/c0de_box/www/Image2/server
.venv/bin/uvicorn main:app --reload --port 8000
```

Expected: server starts, `GET http://localhost:8000/health` returns `{"status":"ok"}`.

- [ ] **Step 2: Start the Next.js dev server**

```bash
cd /home/brian/Documents/c0de_box/www/Image2
npm run dev
```

Expected: server starts on `http://localhost:3000`.

- [ ] **Step 3: Verify layout and background**

Open `http://localhost:3000` in a browser. Expected: dark `#070c12` background with animated drifting grid + vignette, "Image2" nav with `>` glyph mark, "THE APP FOUNDRY" label, hero "01 / IMAGE → TEXT ART" eyebrow, "Turn any image into text art." heading, drop zone, controls bar, output header, output placeholder with sunburst ASCII art.

- [ ] **Step 4: Verify sample image flow (ASCII mode)**

Click "or try a sample image". Expected: a sunset-gradient image is generated client-side, uploaded, and within ~1s the output canvas renders colored ASCII glyphs on a dark background.

- [ ] **Step 5: Verify drag-and-drop and click-to-browse**

Drag an image file onto the drop zone — border highlights while dragging, drops and converts. Click the drop zone — opens a file picker, selecting an image converts it.

- [ ] **Step 6: Verify ANSI mode**

Click the "ANSI" tab. Expected: output canvas re-renders as a half-block grid (top/bottom color per cell); a "Palette" segmented control (truecolor / 256 / bbs16) appears in the controls bar.

- [ ] **Step 7: Verify live controls**

Drag the Width, Contrast, Brightness, and Font size sliders. Expected: after a short debounce, the output canvas re-renders reflecting each change. Switching ANSI palette changes only the exported `.ans` text, not the on-screen preview.

- [ ] **Step 8: Verify export buttons**

Click "Copy" — clipboard receives the ASCII text or ANSI escape sequence (paste into a terminal/editor to confirm), button shows "Copied ✓" for ~1.6s. Click ".txt" — downloads `image2.txt` with the same content. Click ".png" — downloads `image2.png` matching the on-screen canvas.

- [ ] **Step 9: Verify error handling**

Try uploading a non-image file (e.g. `.pdf`) via the file picker. Expected: inline error message in the drop zone, no request sent. Try uploading a file >10MB. Expected: inline "File too large. Max 10MB." message.

- [ ] **Step 10: Stop both dev servers**

```bash
# Ctrl+C in each terminal running uvicorn and npm run dev
```

If any issues were found and fixed during verification, commit those fixes with a descriptive message before finishing.

---
