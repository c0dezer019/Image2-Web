from __future__ import annotations

import logging
import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from converters import analyze_image, convert_to_ansi_grid, convert_to_ascii_grid

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger("image2")

# Surfaced via /health so a deployed frontend/backend pair can be confirmed to
# be running the code they're expected to (Railway sets this automatically;
# falls back to a manually-set env var, then "dev" for local runs).
APP_VERSION = (
    os.environ.get("RAILWAY_GIT_COMMIT_SHA")
    or os.environ.get("IMAGE2_SERVER_VERSION")
    or "dev"
)[:7]

app = FastAPI(title="image2 server")

# Per-IP rate limits on the compute-heavy endpoints. This is the primary
# anti-abuse measure: it bounds repeated/scripted requests regardless of
# image size, while a single large-but-legitimate request (e.g. from the
# live-preview UI) is unaffected. MAX_OUTPUT_* below remains as a backstop
# against pathologically large single requests.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again shortly."},
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://image2-web-seven.vercel.app",
        "https://image2-*-the-app-foundry.vercel.app",
        "https://image2.theappfoundry.tech",
        "https://image2-web.theappfoundry.tech",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_PALETTES = ("truecolor", "256", "bbs16")
MAX_OUTPUT_COLS = 600
MAX_OUTPUT_ROWS = 600
MAX_OUTPUT_CELLS = 250_000


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": APP_VERSION}


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
) -> dict:
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
) -> dict:
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
) -> dict:
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
