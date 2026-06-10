import pytest
from PIL import Image

from converters import convert_to_ascii_grid
from img2ascii import ascii_chars
from img2ansi import image_to_ansi
from imgcommon import load_and_enhance as _load_and_enhance
from imgcommon import resize_for as _resize_for


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
