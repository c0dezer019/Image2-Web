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
    sharpness: float = Form(2.5),
    saturate: float = Form(1.0),
    min_lum: float = Form(0.0),
    img_height: int = Form(0),
) -> dict:
    path = _save_upload(file)
    try:
        return convert_to_ascii_grid(
            path, width, contrast, brightness, sharpness, saturate, min_lum, img_height
        )
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
    sharpness: float = Form(2.5),
    saturate: float = Form(1.0),
    min_lum: float = Form(0.0),
) -> dict:
    if palette not in VALID_PALETTES:
        raise HTTPException(status_code=422, detail="Invalid palette")
    path = _save_upload(file)
    try:
        return convert_to_ansi_grid(
            path, width, contrast, brightness, palette, sharpness, saturate, min_lum
        )
    except UnidentifiedImageError:
        raise HTTPException(status_code=422, detail="Could not read image file")
    finally:
        os.remove(path)
