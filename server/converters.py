from __future__ import annotations

from typing import Any, cast

from PIL import Image, ImageFilter, ImageOps

from imgcommon import compute_auto_params, lift_luminance, load_and_enhance, resize_for
from img2ascii import ascii_chars
from img2ansi import image_to_ansi

SHARPNESS_DEFAULT = 2.5
SATURATE_DEFAULT = 1.0
MIN_LUM_DEFAULT = 0.0
INVERT_DEFAULT = False
BLUR_DEFAULT = 0.0


def _preprocess(img: Image.Image, invert: bool, blur: float) -> Image.Image:
    """Apply image2 CLI's ``--invert``/``--blur`` preprocessing.

    Mirrors ``image2.py``'s ``main()``, which converts the source to RGB and
    applies invert then Gaussian blur *before* enhancement and (for
    auto-detect) before ``compute_auto_params``. ``ImageOps.invert`` errors on
    non-RGB modes (e.g. RGBA/palette PNGs), so the RGB conversion is required
    whenever either effect is requested.
    """
    if invert or blur > 0:
        img = img.convert("RGB")
        if invert:
            img = ImageOps.invert(img)
        if blur > 0:
            img = img.filter(ImageFilter.GaussianBlur(radius=blur))
    return img


def analyze_image(path: str, invert: bool = INVERT_DEFAULT, blur: float = BLUR_DEFAULT) -> dict[str, Any]:
    """Derive default contrast/brightness/saturate/min_lum for an image.

    Mirrors image2 CLI's auto-detect-by-default behavior
    (``resolve_enhance_params`` over ``imgcommon.compute_auto_params``), so
    the frontend can pre-fill its enhancement sliders per uploaded image
    instead of using the old fixed defaults (contrast 1.5, brightness 1.0,
    saturate 1.0, min_lum 0.0). ``invert``/``blur`` are applied first, since
    the CLI computes auto-detect params on the post-invert/blur image.
    """
    with Image.open(path) as img:
        img = _preprocess(img, invert, blur)
        return compute_auto_params(img)


def convert_to_ascii_grid(
    path: str,
    width: int,
    contrast: float,
    brightness: float,
    sharpness: float = SHARPNESS_DEFAULT,
    saturate: float = SATURATE_DEFAULT,
    min_lum: float = MIN_LUM_DEFAULT,
    img_height: int = 0,
    invert: bool = INVERT_DEFAULT,
    blur: float = BLUR_DEFAULT,
) -> dict[str, Any]:
    pil_img = Image.open(path)
    pil_img = _preprocess(pil_img, invert, blur)
    img = load_and_enhance(pil_img, contrast, sharpness, brightness, saturate)

    if img_height > 0:
        try:
            resample = Image.Resampling.LANCZOS
        except AttributeError:
            resample = getattr(Image, "LANCZOS", Image.BICUBIC)
        img = img.resize((width, img_height), resample=resample).convert("RGB")
    else:
        img = resize_for(img, width, cell_aspect=0.75)
    cols, rows = img.size

    cells: list[list[dict[str, Any]]] = []
    text_lines: list[str] = []
    for y in range(rows):
        row: list[dict[str, Any]] = []
        line_chars: list[str] = []
        for x in range(cols):
            r, g, b = cast("tuple[int, int, int]", img.getpixel((x, y)))
            r, g, b = lift_luminance(r, g, b, min_lum)
            lum = int(0.299 * r + 0.587 * g + 0.114 * b)
            ch = ascii_chars[int(lum / 255 * (len(ascii_chars) - 1))]
            row.append({"ch": ch, "r": r, "g": g, "b": b})
            line_chars.append(ch)
        cells.append(row)
        text_lines.append("".join(line_chars))

    return {"cols": cols, "rows": rows, "cells": cells, "text": "\n".join(text_lines)}


def convert_to_ansi_grid(
    path: str,
    width: int,
    contrast: float,
    brightness: float,
    palette: str,
    sharpness: float = SHARPNESS_DEFAULT,
    saturate: float = SATURATE_DEFAULT,
    min_lum: float = MIN_LUM_DEFAULT,
    invert: bool = INVERT_DEFAULT,
    blur: float = BLUR_DEFAULT,
) -> dict[str, Any]:
    pil_img = Image.open(path)
    pil_img = _preprocess(pil_img, invert, blur)
    img = load_and_enhance(pil_img, contrast, sharpness, brightness, saturate)
    img = resize_for(img, width, cell_aspect=1.0)

    if min_lum > 0:
        img = img.convert("RGB")
        px = img.load()
        assert px is not None
        for y in range(img.height):
            for x in range(img.width):
                r, g, b = cast("tuple[int, int, int]", px[x, y])
                px[x, y] = lift_luminance(r, g, b, min_lum)
    w, h = img.size
    rows = h // 2

    cells: list[list[dict[str, Any]]] = []
    for cy in range(rows):
        y = cy * 2
        row: list[dict[str, Any]] = []
        for x in range(w):
            tr, tg, tb = cast("tuple[int, int, int]", img.getpixel((x, y)))
            br, bg, bb = cast("tuple[int, int, int]", img.getpixel((x, y + 1)))
            row.append(
                {
                    "topR": tr, "topG": tg, "topB": tb,
                    "botR": br, "botG": bg, "botB": bb,
                }
            )
        cells.append(row)

    ansi_text = image_to_ansi(img, mode=palette)
    return {"cols": w, "rows": rows, "cells": cells, "ansiText": ansi_text}
