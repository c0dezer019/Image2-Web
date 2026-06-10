import pytest
from PIL import Image

from converters import convert_to_ascii_grid
from img2ascii import ascii_chars


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
