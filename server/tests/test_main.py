import io

from fastapi.testclient import TestClient
from PIL import Image

from main import MAX_OUTPUT_COLS, MAX_OUTPUT_ROWS, app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def _sample_png_bytes(size: tuple[int, int] = (40, 30)) -> bytes:
    img = Image.new("RGB", size, (120, 60, 200))
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


def test_convert_ascii_rejects_oversized_output():
    res = client.post(
        "/convert/ascii",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={
            "width": str(MAX_OUTPUT_COLS),
            "img_height": str(MAX_OUTPUT_ROWS + 1),
            "contrast": "1.5",
            "brightness": "1.0",
        },
    )
    assert res.status_code == 422
    assert res.json() == {"detail": "Output dimensions exceed server limits"}


def test_convert_ansi_rejects_oversized_output():
    res = client.post(
        "/convert/ansi",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={
            "width": str(MAX_OUTPUT_COLS + 1),
            "contrast": "1.5",
            "brightness": "1.0",
            "palette": "truecolor",
        },
    )
    assert res.status_code == 422
    assert res.json() == {"detail": "Output dimensions exceed server limits"}
