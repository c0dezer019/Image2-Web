# Image2-Web Local Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the Image2-Web frontend + FastAPI server to run locally via Docker, with rate limits and output-size caps lifted, and a `/upload`+`/session` API for CLI pre-seeding.

**Architecture:** Server reads `LOCAL_MODE` env var at startup to disable SlowAPI rate limiting, lift output-size validation, and expose two new endpoints (`/upload`, `/session/{id}`). Frontend reads the `local` flag from `/health` on mount and skips client-side output-size clamps. A `SessionLoader` component reads `?session=` URL params on mount and pre-fills the UI with a CLI-uploaded image and its conversion parameters.

**Tech Stack:** FastAPI, SlowAPI, Python 3.14, Next.js 15 App Router, React 19, TypeScript, Vitest, Docker (standalone Next.js output), GitHub Actions.

## Global Constraints

- Python files: line-length 79 (Black), no type annotations on local variables unless needed for clarity.
- TypeScript: strict mode, no `any`, no `// eslint-disable` unless pre-existing.
- Tests run via `.venv/bin/pytest` (server) and `pnpm test` (frontend).
- Do not modify `server/converters.py` — only `server/main.py`.
- Follow existing import order in each file (stdlib → third-party → local).
- `NEXT_PUBLIC_IMAGE2_SERVER_URL` is a build-time env var — setting it in docker-compose has no effect on a pre-built image; the default `http://localhost:8000` in `lib/convert.ts` is used.

---

### Task 1: Server — LOCAL_MODE + /health + /upload + /session + lift output limits

**Files:**
- Modify: `server/main.py`
- Modify: `server/tests/test_main.py`

**Interfaces:**
- Produces:
  - `GET /health` → `{"status": "ok", "version": str, "local": bool}`
  - `POST /upload` (multipart `file`) → `{"session_id": str, "expires_in": 3600}`
  - `GET /session/{session_id}` → raw file bytes (FileResponse)
  - `LOCAL_MODE=true` env var → rate limiting disabled, output size caps lifted

- [ ] **Step 1: Write failing tests for /health local flag and /upload /session endpoints**

Add to `server/tests/test_main.py`:

```python
import importlib
import io
import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image


def _sample_png_bytes(size: tuple[int, int] = (40, 30)) -> bytes:
    img = Image.new("RGB", size, (120, 60, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_health_returns_local_false_by_default():
    from main import app
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["local"] is False


def test_health_returns_local_true_when_env_set():
    import main
    with patch.object(main, "LOCAL_MODE", True):
        client = TestClient(main.app)
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["local"] is True


def test_upload_returns_session_id():
    from main import app
    client = TestClient(app)
    res = client.post(
        "/upload",
        files={"file": ("test.png", _sample_png_bytes(), "image/png")},
    )
    assert res.status_code == 200
    body = res.json()
    assert "session_id" in body
    assert body["expires_in"] == 3600


def test_session_returns_uploaded_file():
    from main import app
    client = TestClient(app)
    png = _sample_png_bytes()
    upload_res = client.post(
        "/upload",
        files={"file": ("test.png", png, "image/png")},
    )
    session_id = upload_res.json()["session_id"]
    get_res = client.get(f"/session/{session_id}")
    assert get_res.status_code == 200
    assert get_res.content == png


def test_session_404_for_unknown_id():
    from main import app
    client = TestClient(app)
    res = client.get("/session/does-not-exist")
    assert res.status_code == 404


def test_validate_output_size_skipped_when_local():
    import main
    with patch.object(main, "LOCAL_MODE", True):
        # Should not raise even with cols/rows exceeding normal limits
        main._validate_output_size(9999, 9999, mode="ascii")


def test_validate_output_size_enforced_when_not_local():
    import main
    with patch.object(main, "LOCAL_MODE", False):
        with pytest.raises(Exception):
            main._validate_output_size(9999, 9999, mode="ascii")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && ../.venv/bin/pytest tests/test_main.py::test_health_returns_local_false_by_default tests/test_main.py::test_upload_returns_session_id -v
```

Expected: FAIL — `local` key missing from /health response, `/upload` endpoint does not exist.

- [ ] **Step 3: Implement LOCAL_MODE + /health + /upload + /session in server/main.py**

Replace `server/main.py` with the following (full file):

```python
from __future__ import annotations

import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, UnidentifiedImageError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from converters import analyze_image, convert_to_ansi_grid, convert_to_ascii_grid

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("image2")

_version_file = Path(__file__).parent / "VERSION"
APP_VERSION = _version_file.read_text().strip() if _version_file.exists() else "0.0.0"

LOCAL_MODE = os.getenv("LOCAL_MODE", "false").lower() == "true"

app = FastAPI(title="image2 server")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please slow down and try again shortly."
        },
    )


if not LOCAL_MODE:
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://image2-web-seven.vercel.app",
        "https://image2.theappfoundry.tech",
        "https://image2-web.theappfoundry.tech",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://image2-[a-z0-9-]+-the-app-foundry\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_PALETTES = ("truecolor", "256", "bbs16")
MAX_OUTPUT_COLS = 600
MAX_OUTPUT_ROWS = 600
MAX_OUTPUT_CELLS = 250_000

# session_id -> temp file path; populated by /upload, consumed by /session/{id}
_upload_store: dict[str, str] = {}


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "version": APP_VERSION, "local": LOCAL_MODE}


@app.post("/upload")
def upload(file: UploadFile = File(...)) -> dict[str, Any]:
    session_id = str(uuid.uuid4())
    path = _save_upload(file)
    _upload_store[session_id] = path
    return {"session_id": session_id, "expires_in": 3600}


@app.get("/session/{session_id}")
def get_session(session_id: str) -> FileResponse:
    path = _upload_store.get(session_id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Session not found")
    return FileResponse(path)


def _save_upload(file: UploadFile) -> str:
    suffix = os.path.splitext(file.filename or "")[1]
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(file.file.read())
    return path


def _estimate_rows(path: str, width: int, img_height: int, cell_aspect: float) -> int:
    if img_height > 0:
        return img_height
    with Image.open(path) as img:
        aspect = img.height / img.width
    return max(1, round(width * aspect * cell_aspect))


def _validate_output_size(cols: int, rows: int, *, mode: str) -> None:
    if cols < 1 or rows < 1:
        logger.warning(
            "Rejecting %s conversion: non-positive output size (cols=%d, rows=%d)",
            mode, cols, rows,
        )
        raise HTTPException(
            status_code=422, detail="Output dimensions exceed server limits"
        )
    if LOCAL_MODE:
        return
    if (
        cols > MAX_OUTPUT_COLS
        or rows > MAX_OUTPUT_ROWS
        or cols * rows > MAX_OUTPUT_CELLS
    ):
        logger.warning(
            "Rejecting %s conversion: cols=%d rows=%d cells=%d exceed limits "
            "(max_cols=%d, max_rows=%d, max_cells=%d)",
            mode, cols, rows, cols * rows,
            MAX_OUTPUT_COLS, MAX_OUTPUT_ROWS, MAX_OUTPUT_CELLS,
        )
        raise HTTPException(
            status_code=422, detail="Output dimensions exceed server limits"
        )


@app.post("/analyze")
@limiter.limit("20/minute")
def analyze(
    request: Request,
    file: UploadFile = File(...),
    invert: bool = Form(False),
    blur: float = Form(0.0, ge=0, le=25),
) -> dict[str, Any]:
    path = _save_upload(file)
    try:
        return analyze_image(path, invert=invert, blur=blur)
    except UnidentifiedImageError:
        raise HTTPException(status_code=422, detail="Could not read image file")
    finally:
        os.remove(path)


@app.post("/convert/ascii")
@limiter.limit("40/minute")
def convert_ascii(
    request: Request,
    file: UploadFile = File(...),
    width: int = Form(100, ge=1, le=1000),
    contrast: float = Form(1.5),
    brightness: float = Form(1.0),
    sharpness: float = Form(2.5, ge=0),
    saturate: float = Form(1.0, ge=0),
    min_lum: float = Form(0.0, ge=0),
    img_height: int = Form(0, ge=0, le=1000),
    invert: bool = Form(False),
    blur: float = Form(0.0, ge=0, le=25),
) -> dict[str, Any]:
    path = _save_upload(file)
    try:
        rows = _estimate_rows(path, width, img_height, cell_aspect=0.75)
        logger.info(
            "convert/ascii request: width=%d img_height=%d -> cols=%d rows=%d cells=%d",
            width, img_height, width, rows, width * rows,
        )
        _validate_output_size(width, rows, mode="ascii")
        return convert_to_ascii_grid(
            path,
            width=width,
            contrast=contrast,
            brightness=brightness,
            sharpness=sharpness,
            saturate=saturate,
            min_lum=min_lum,
            img_height=img_height,
            invert=invert,
            blur=blur,
        )
    except UnidentifiedImageError:
        raise HTTPException(status_code=422, detail="Could not read image file")
    finally:
        os.remove(path)


@app.post("/convert/ansi")
@limiter.limit("40/minute")
def convert_ansi(
    request: Request,
    file: UploadFile = File(...),
    width: int = Form(80, ge=1, le=1000),
    contrast: float = Form(1.5),
    brightness: float = Form(1.0),
    palette: str = Form("truecolor"),
    sharpness: float = Form(2.5),
    saturate: float = Form(1.0),
    min_lum: float = Form(0.0),
    invert: bool = Form(False),
    blur: float = Form(0.0, ge=0, le=25),
) -> dict[str, Any]:
    if palette not in VALID_PALETTES:
        raise HTTPException(status_code=422, detail="Invalid palette")
    path = _save_upload(file)
    try:
        rows = _estimate_rows(path, width, 0, cell_aspect=1.0) // 2
        logger.info(
            "convert/ansi request: width=%d -> cols=%d rows=%d cells=%d",
            width, width, rows, width * rows,
        )
        _validate_output_size(width, rows, mode="ansi")
        return convert_to_ansi_grid(
            path,
            width=width,
            contrast=contrast,
            brightness=brightness,
            palette=palette,
            sharpness=sharpness,
            saturate=saturate,
            min_lum=min_lum,
            invert=invert,
            blur=blur,
        )
    except UnidentifiedImageError:
        raise HTTPException(status_code=422, detail="Could not read image file")
    finally:
        os.remove(path)
```

- [ ] **Step 4: Run all server tests**

```bash
cd server && ../.venv/bin/pytest tests/ -v
```

Expected: all pass, including the new LOCAL_MODE tests.

- [ ] **Step 5: Commit**

```bash
git add server/main.py server/tests/test_main.py
git commit -m "feat(server): add LOCAL_MODE, /upload, /session endpoints; lift limits when local"
```

---

### Task 2: Frontend — HealthResponse type + getServerHealth + isLocalMode + fetchSession

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/convert.ts`
- Modify: `tests/convert.test.ts`

**Interfaces:**
- Consumes: `GET /health` returns `local: boolean` (Task 1)
- Produces:
  - `HealthResponse` interface with `version`, `status`, `local` fields
  - `getServerHealth(): Promise<HealthResponse>`
  - `isLocalMode(): boolean` — reads module-level flag set by `getServerHealth`
  - `fetchSession(sessionId: string): Promise<Blob>`

- [ ] **Step 1: Write failing tests**

Add to `tests/convert.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getServerHealth, isLocalMode, fetchSession } from "../lib/convert";

describe("getServerHealth local mode", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns local: true and sets isLocalMode when server reports local", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0", local: true }),
    }));
    const result = await getServerHealth();
    expect(result.local).toBe(true);
    expect(isLocalMode()).toBe(true);
  });

  it("returns local: false and clears isLocalMode when server is cloud", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0", local: false }),
    }));
    const result = await getServerHealth();
    expect(result.local).toBe(false);
    expect(isLocalMode()).toBe(false);
  });

  it("defaults local to false when server omits the field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0" }),
    }));
    const result = await getServerHealth();
    expect(result.local).toBe(false);
  });
});

describe("fetchSession", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a blob for the given session id", async () => {
    const blob = new Blob(["data"], { type: "image/png" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }));
    const result = await fetchSession("abc-123");
    expect(result).toBe(blob);
  });

  it("throws when session not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchSession("bad-id")).rejects.toThrow("Session not found (404)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- tests/convert.test.ts
```

Expected: FAIL — `isLocalMode`, `fetchSession` not exported; `getServerHealth` does not return `local`.

- [ ] **Step 3: Add HealthResponse to lib/types.ts**

Add after the existing `ConvertParams` interface:

```typescript
export interface HealthResponse {
  version: string;
  status: string;
  local: boolean;
}
```

- [ ] **Step 4: Update lib/convert.ts — getServerHealth + isLocalMode + fetchSession**

Replace the `getServerHealth` function and add the new exports. The full updated top section of `lib/convert.ts` (replace lines 1–23):

```typescript
import { charCellSize } from "./canvas-render";
import type { AnsiResult, AsciiResult, AutoParams, ConvertParams, HealthResponse } from "./types";

const SERVER_URL = (process.env.NEXT_PUBLIC_IMAGE2_SERVER_URL
  || process.env.NEXT_DEV_IMAGE2_SERVER_URL) || "http://localhost:8000";

let _isLocal = false;

/** Returns true after getServerHealth() has been called and server reported local mode. */
export function isLocalMode(): boolean {
  return _isLocal;
}

/** Fetches the image2 server's version, status, and local mode flag from /health. */
export async function getServerHealth(): Promise<HealthResponse> {
  const res = await fetch(`${SERVER_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  const data = await res.json();
  _isLocal = data.local === true;
  return {
    version: data.version ?? "unknown",
    status: data.status ?? "unknown",
    local: _isLocal,
  };
}

/** @deprecated Use getServerHealth instead. */
export async function getServerVersion(): Promise<string> {
  return (await getServerHealth()).version;
}

/** Fetch a pre-uploaded file blob by session ID from the local server. */
export async function fetchSession(sessionId: string): Promise<Blob> {
  const res = await fetch(`${SERVER_URL}/session/${sessionId}`);
  if (!res.ok) throw new Error(`Session not found (${res.status})`);
  return res.blob();
}
```

- [ ] **Step 5: Run tests**

```bash
pnpm test -- tests/convert.test.ts
```

Expected: all new tests pass; existing `convertImage` tests still pass.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/convert.ts tests/convert.test.ts
git commit -m "feat(frontend): add HealthResponse, isLocalMode, fetchSession to convert.ts"
```

---

### Task 3: Frontend — lift output-size clamps when local

**Files:**
- Modify: `lib/convert.ts`
- Modify: `tests/convert.test.ts`

**Interfaces:**
- Consumes: `isLocalMode()` from Task 2; `_isLocal` module-level flag
- Produces: `convertImage` skips `clampOutputSize` and `MAX_OUTPUT_COLS` cap when `_isLocal` is true

- [ ] **Step 1: Write failing tests**

Add to the `convertImage output-size clamping` describe block in `tests/convert.test.ts`:

```typescript
import { getServerHealth } from "../lib/convert";

it("does NOT clamp when server is in local mode", async () => {
  // First prime isLocalMode by calling getServerHealth with local:true
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", version: "1.0.0", local: true }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cols: 1, rows: 1, cells: [[]], text: "" }),
    })
  );
  await getServerHealth();

  await convertImage(new Blob(), {
    ...baseParams,
    imgWidth: 4000,
    imgHeight: 4000,
    fontSize: 2,
  });

  const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
  // Second call is convertImage; get its FormData
  const form = fetchMock.mock.calls[1][1].body as FormData;
  const width = Number(form.get("width"));
  const imgHeight = Number(form.get("img_height"));

  // With local mode, should NOT be clamped to 600
  expect(width).toBeGreaterThan(600);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- tests/convert.test.ts
```

Expected: FAIL — clamping still applied even in local mode.

- [ ] **Step 3: Update convertImage in lib/convert.ts to skip clamps when local**

In `convertImage`, replace the clamping block (lines 120–138 in the original). Find the section that reads:

```typescript
    if (imgHeightRows > 0) {
      ({ cols: width, rows: imgHeightRows } = clampOutputSize(width, imgHeightRows));
    } else {
      width = Math.min(width, MAX_OUTPUT_COLS);
    }
    estimatedServerRows = imgHeightRows;
  } else {
    // ANSI mode doesn't send img_height...
    if (params.imgWidth > 0 && params.imgHeight > 0) {
      const aspect = params.imgHeight / params.imgWidth;
      const estimatedRows = Math.max(1, Math.round((width * aspect) / 2));
      ({ cols: width, rows: estimatedServerRows } = clampOutputSize(width, estimatedRows));
    } else {
      width = Math.min(width, MAX_OUTPUT_COLS);
    }
  }
```

Replace with:

```typescript
    if (!_isLocal) {
      if (imgHeightRows > 0) {
        ({ cols: width, rows: imgHeightRows } = clampOutputSize(width, imgHeightRows));
      } else {
        width = Math.min(width, MAX_OUTPUT_COLS);
      }
    }
    estimatedServerRows = imgHeightRows;
  } else {
    // ANSI mode doesn't send img_height, so the server estimates rows from
    // the source image's aspect ratio (cell_aspect=1.0, halved for ANSI's
    // double-height cells). Mirror that estimate here using imgWidth/imgHeight
    // (preserved through any client-side compression) to clamp consistently.
    if (params.imgWidth > 0 && params.imgHeight > 0) {
      const aspect = params.imgHeight / params.imgWidth;
      const estimatedRows = Math.max(1, Math.round((width * aspect) / 2));
      if (!_isLocal) {
        ({ cols: width, rows: estimatedServerRows } = clampOutputSize(width, estimatedRows));
      } else {
        estimatedServerRows = estimatedRows;
      }
    } else {
      if (!_isLocal) width = Math.min(width, MAX_OUTPUT_COLS);
    }
  }
```

- [ ] **Step 4: Run all frontend tests**

```bash
pnpm test
```

Expected: all pass including new local-mode no-clamp test; existing clamp tests still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/convert.ts tests/convert.test.ts
git commit -m "feat(frontend): skip output-size clamps when server is in local mode"
```

---

### Task 4: Frontend — SessionLoader component + page.tsx pre-seed

**Files:**
- Create: `components/SessionLoader.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `fetchSession(sessionId)` from Task 2; `handleFile` callback from page.tsx
- Produces: `SessionLoader` — reads `?session=`, `?mode=`, `?contrast=`, `?brightness=`, `?sharpness=`, `?saturate=`, `?min_lum=`, `?width=` from URL on mount; fetches session blob and calls `onFile`; applies remaining params via setter callbacks

`useSearchParams` requires a `Suspense` boundary in Next.js App Router. `SessionLoader` is the component that uses `useSearchParams`; it is wrapped in `<Suspense>` in `page.tsx`.

- [ ] **Step 1: Create components/SessionLoader.tsx**

```tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchSession } from "@/lib/convert";
import type { AnsiPalette, OutputMode } from "@/lib/types";

interface SessionLoaderProps {
  onFile: (file: File) => void;
  onMode: (mode: OutputMode) => void;
  onContrast: (v: number) => void;
  onBrightness: (v: number) => void;
  onSharpness: (v: number) => void;
  onSaturate: (v: number) => void;
  onMinLum: (v: number) => void;
  onWidth: (v: number) => void;
  onPalette: (v: AnsiPalette) => void;
}

function parseNum(v: string | null): number | null {
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function SessionLoader({
  onFile, onMode, onContrast, onBrightness,
  onSharpness, onSaturate, onMinLum, onWidth, onPalette,
}: SessionLoaderProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (!sessionId) return;

    const modeParam = searchParams.get("mode");
    if (modeParam === "ascii" || modeParam === "ansi") onMode(modeParam);

    const palette = searchParams.get("palette");
    if (palette === "truecolor" || palette === "256" || palette === "bbs16") {
      onPalette(palette);
    }

    const mappings: Array<[string, (v: number) => void]> = [
      ["contrast",   onContrast],
      ["brightness", onBrightness],
      ["sharpness",  onSharpness],
      ["saturate",   onSaturate],
      ["min_lum",    onMinLum],
      ["width",      onWidth],
    ];
    for (const [key, setter] of mappings) {
      const n = parseNum(searchParams.get(key));
      if (n !== null) setter(n);
    }

    fetchSession(sessionId)
      .then((blob) => {
        onFile(new File([blob], "upload", { type: blob.type || "image/png" }));
      })
      .catch(() => {
        // Session expired or server not running — silently ignore
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
```

- [ ] **Step 2: Add SessionLoader to app/page.tsx**

Add `Suspense` import and `SessionLoader` import at the top of `app/page.tsx`:

```tsx
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SessionLoader } from "@/components/SessionLoader";
```

Inside the `return (...)`, add `SessionLoader` as the first child inside the outermost `<div>`, just before the grid background divs:

```tsx
<Suspense>
  <SessionLoader
    onFile={handleFile}
    onMode={setMode}
    onContrast={setContrast}
    onBrightness={setBrightness}
    onSharpness={setSharpness}
    onSaturate={setSaturate}
    onMinLum={setMinLum}
    onWidth={(n) => { if (!Number.isFinite(n)) return; setWidth(Math.max(1, Math.round(n))); }}
    onPalette={setPalette}
  />
</Suspense>
```

- [ ] **Step 3: Verify build compiles**

```bash
pnpm build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/SessionLoader.tsx app/page.tsx
git commit -m "feat(frontend): add SessionLoader for CLI session pre-seed via URL params"
```

---

### Task 5: Docker — next.config.ts standalone output + Dockerfile + .dockerignore

**Files:**
- Modify: `next.config.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: `c0dezer019/image2-web` Docker image serving Next.js on port 3000 with `NEXT_PUBLIC_IMAGE2_SERVER_URL` defaulting to `http://localhost:8000` (baked in at build time via the existing fallback in `lib/convert.ts`)

- [ ] **Step 1: Enable standalone output in next.config.ts**

Replace `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Verify build still works**

```bash
pnpm build
```

Expected: build succeeds; `.next/standalone/` directory created.

- [ ] **Step 3: Create .dockerignore**

```
node_modules
.next
server/
.git
.github
docs/
*.md
```

- [ ] **Step 4: Create Dockerfile**

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

- [ ] **Step 5: Build and smoke-test the Docker image locally**

```bash
docker build -t image2-web-local:test .
docker run --rm -p 3000:3000 image2-web-local:test
```

Open `http://localhost:3000` in browser. Expected: UI loads. Stop container with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts Dockerfile .dockerignore
git commit -m "feat(docker): add Next.js standalone Dockerfile and .dockerignore for image2-web"
```

---

### Task 6: CI — add conditional web Docker publish jobs

**Files:**
- Modify: `.github/workflows/docker-image.yml`

**Interfaces:**
- Produces: two new jobs `build-and-push-web-dev` and `build-and-push-web-prod` that mirror the existing server jobs, gated on non-`server/` file changes, publishing to `c0dezer019/image2-web`

The existing workflow uses `vars.DOCKER_IMAGE` and `vars.DOCKER_BUILD_DIR`. Add a new pair of repo variables: `DOCKER_WEB_IMAGE=c0dezer019/image2-web` and keep build dir as `.` (root). The new jobs hardcode the image name via a new variable rather than reusing `DOCKER_IMAGE`.

- [ ] **Step 1: Add gate-web + build jobs to .github/workflows/docker-image.yml**

Append the following to the `jobs:` section of `.github/workflows/docker-image.yml`:

```yaml
  gate-web:
    name: Continue Only if Changes Are On Frontend
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'success'
    outputs:
      should_deploy: ${{ steps.check.outputs.should_deploy }}
    steps:
      - name: Check path filter
        id: check
        uses: actions/github-script@v7
        with:
          script: |
            const sha = context.payload.workflow_run.head_sha;
            const { data } = await github.rest.repos.getCommit({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: sha,
            });
            const touchedFrontend = data.files.some(
              f => !f.filename.startsWith('server/')
            );
            core.setOutput('should_deploy', String(touchedFrontend));

  build-and-push-web-dev:
    name: Build and Push Web Dev
    needs: gate-web
    if: |
      needs.gate-web.outputs.should_deploy == 'true' &&
      github.event.workflow_run.head_branch != 'main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        run: |
          docker buildx build \
            -t ${{ vars.DOCKER_WEB_IMAGE }}:dev \
            -f Dockerfile \
            --attest type=provenance,mode=max,version=v1 \
            --sbom=true \
            --push \
            .

  build-and-push-web-prod:
    name: Build and Push Web
    needs: gate-web
    if: |
      needs.gate-web.outputs.should_deploy == 'true' &&
      github.event.workflow_run.head_branch == 'main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        run: |
          docker buildx build \
            -t ${{ vars.DOCKER_WEB_IMAGE }}:latest \
            -t ${{ vars.DOCKER_WEB_IMAGE }}:$(git rev-parse --short HEAD) \
            -f Dockerfile \
            --attest type=provenance,mode=max,version=v1 \
            --sbom=true \
            --push \
            .
```

- [ ] **Step 2: Add DOCKER_WEB_IMAGE repo variable in GitHub**

In the Image2-Web GitHub repo → Settings → Variables → Actions, add:
- `DOCKER_WEB_IMAGE` = `c0dezer019/image2-web`

(This cannot be done via code — manual step in GitHub UI.)

- [ ] **Step 3: Validate workflow YAML syntax**

```bash
# Use actionlint if available, otherwise just check YAML parses
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docker-image.yml'))"
```

Expected: no output (valid YAML).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/docker-image.yml
git commit -m "ci: add conditional web Docker publish jobs to docker-image workflow"
```

---

### Task 7: README — local mode section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the current README**

```bash
cat README.md
```

- [ ] **Step 2: Add Local Mode section**

Add the following section near the end of `README.md`, before any license/contributing sections:

```markdown
## Running Locally via Docker

Image2-Web can run on your own machine via the [image2 CLI](https://github.com/c0dezer019/image2).

```bash
img2 ui          # spin up and open browser
img2 ui --stop   # tear down
```

When running locally, the server operates in **local mode**:
- Per-IP rate limiting is disabled
- Output size caps (600×600 / 250,000 cells) are lifted
- The version footer shows `local` in place of the server origin

### Manual Docker Compose

```bash
docker compose up -d   # from the image2 repo root
```

The compose stack uses `LOCAL_MODE=true` on the server container. The frontend
image has `http://localhost:8000` baked in as the server URL.

### Session Pre-seed URL Params

The `--ui` flag on `img2 ascii`/`img2 ansi` opens the browser with the image
pre-loaded via URL params:

```
http://localhost:3000?session=<id>&mode=ascii&contrast=1.2&brightness=1.1
```

Supported params: `session`, `mode`, `contrast`, `brightness`, `sharpness`,
`saturate`, `min_lum`, `width`, `palette`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add local mode / Docker section to README"
```
