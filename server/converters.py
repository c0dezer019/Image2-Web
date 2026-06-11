from __future__ import annotations

from PIL import Image

from imgcommon import lift_luminance, load_and_enhance, resize_for
from img2ascii import ascii_chars
from img2ansi import image_to_ansi

SHARPNESS_DEFAULT = 2.5
SATURATE_DEFAULT = 1.0
MIN_LUM_DEFAULT = 0.0


def convert_to_ascii_grid(
    path: str,
    width: int,
    contrast: float,
    brightness: float,
    sharpness: float = SHARPNESS_DEFAULT,
    saturate: float = SATURATE_DEFAULT,
    min_lum: float = MIN_LUM_DEFAULT,
    img_height: int = 0,
) -> dict:
    img = load_and_enhance(path, contrast, sharpness, brightness, saturate)
    if img_height > 0:
        resample = getattr(
            getattr(Image, "Resampling", None),
            "LANCZOS",
            getattr(Image, "LANCZOS", Image.BICUBIC),
        )
        img = img.resize((width, img_height), resample=resample).convert("RGB")
    else:
        img = resize_for(img, width, cell_aspect=0.75)
    cols, rows = img.size

    cells: list[list[dict]] = []
    text_lines: list[str] = []
    for y in range(rows):
        row: list[dict] = []
        line_chars: list[str] = []
        for x in range(cols):
            r, g, b = img.getpixel((x, y))
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
) -> dict:
    img = load_and_enhance(path, contrast, sharpness, brightness, saturate)
    img = resize_for(img, width, cell_aspect=1.0)

    if min_lum > 0:
        img = img.convert("RGB")
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b = px[x, y]
                px[x, y] = lift_luminance(r, g, b, min_lum)
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
