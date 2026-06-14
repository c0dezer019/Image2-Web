from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from converters import analyze_image, convert_to_ansi_grid, convert_to_ascii_grid

app = FastAPI(title="image2 server")

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
    return {"status": "ok"}


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


def _validate_output_size(cols: int, rows: int) -> None:
    if cols < 1 or rows < 1:
        raise HTTPException(
            status_code=422, detail="Output dimensions exceed server limits"
        )
    if (
        cols > MAX_OUTPUT_COLS
        or rows > MAX_OUTPUT_ROWS
        or cols * rows > MAX_OUTPUT_CELLS
    ):
        raise HTTPException(
            status_code=422, detail="Output dimensions exceed server limits"
        )


@app.post("/analyze")
def analyze(
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
def convert_ascii(
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
        _validate_output_size(width, rows)
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
def convert_ansi(
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
        _validate_output_size(width, rows)
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
