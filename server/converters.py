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
