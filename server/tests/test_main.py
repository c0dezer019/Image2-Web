import importlib
import io
import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import MAX_OUTPUT_COLS, MAX_OUTPUT_ROWS, app

client = TestClient(app)


@pytest.fixture
def local_client():
    os.environ["LOCAL_MODE"] = "true"
    import main as main_module
    importlib.reload(main_module)
    from fastapi.testclient import TestClient as TC
    c = TC(main_module.app)
    yield c
    os.environ.pop("LOCAL_MODE", None)
    importlib.reload(main_module)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "version" in body


def _sample_png_bytes(size: tuple[int, int] = (40, 30)) -> bytes:
    img = Image.new("RGB", size, (120, 60, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_analyze_returns_auto_params():
    res = client.post(
        "/analyze",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
    )
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"contrast", "brightness", "saturate", "min_lum"}


def test_analyze_rejects_bad_image():
    res = client.post(
        "/analyze",
        files={"file": ("bad.png", b"not an image", "image/png")},
    )
    assert res.status_code == 422


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


def test_convert_ascii_invert_and_blur_change_output():
    base = client.post(
        "/convert/ascii",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={"width": "20", "contrast": "1.5", "brightness": "1.0"},
    )
    inverted = client.post(
        "/convert/ascii",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={"width": "20", "contrast": "1.5", "brightness": "1.0", "invert": "true", "blur": "4.0"},
    )
    assert inverted.status_code == 200
    assert inverted.json()["cells"] != base.json()["cells"]


def test_analyze_accepts_invert_and_blur():
    res = client.post(
        "/analyze",
        files={"file": ("sample.png", _sample_png_bytes(), "image/png")},
        data={"invert": "true", "blur": "2.0"},
    )
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"contrast", "brightness", "saturate", "min_lum"}


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


# ---------------------------------------------------------------------------
# LOCAL_MODE, /upload, /session tests
# ---------------------------------------------------------------------------


def test_health_returns_local_false_by_default():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["local"] is False


def test_health_returns_local_true_when_env_set():
    import main
    with patch.object(main, "LOCAL_MODE", True):
        local_client = TestClient(main.app)
        res = local_client.get("/health")
        assert res.status_code == 200
        assert res.json()["local"] is True


def test_upload_returns_session_id(local_client):
    res = local_client.post(
        "/upload",
        files={"file": ("test.png", _sample_png_bytes(), "image/png")},
    )
    assert res.status_code == 200
    body = res.json()
    assert "session_id" in body
    assert body["expires_in"] == 3600


def test_session_returns_uploaded_file(local_client):
    png = _sample_png_bytes()
    upload_res = local_client.post(
        "/upload",
        files={"file": ("test.png", png, "image/png")},
    )
    session_id = upload_res.json()["session_id"]
    get_res = local_client.get(f"/session/{session_id}")
    assert get_res.status_code == 200
    assert get_res.content == png


def test_session_404_for_unknown_id(local_client):
    res = local_client.get("/session/does-not-exist")
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
