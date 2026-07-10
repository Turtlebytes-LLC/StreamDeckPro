"""Characterization of image/label rendering (streamdeckpro.rendering)."""

from PIL import Image

from streamdeckpro import rendering

BUTTON_SIZE = (120, 120)
ZONE_SIZE = (200, 100)
TOUCH_ZONES = [
    {"x": i * 200, "width": 200, "name": f"touch-{i+1}"} for i in range(4)
]


def make_png(path, size=(10, 10), color=(255, 0, 0)):
    Image.new("RGB", size, color).save(path)


# --- image priority: svg > png/jpg > default tile ----------------------------

def test_svg_takes_priority_over_png(tmp_path, monkeypatch):
    marker = Image.new("RGB", (5, 5), (0, 255, 0))
    monkeypatch.setattr(rendering, "load_svg_image", lambda *a, **k: marker)

    (tmp_path / "button-1.svg").write_text("<svg/>")
    make_png(tmp_path / "button-1.png")

    img = rendering.load_image_for_button(1, tmp_path, BUTTON_SIZE)
    assert img.size == (5, 5)  # the svg marker, not the resized png


def test_png_used_when_no_svg(tmp_path):
    make_png(tmp_path / "button-2.png")
    img = rendering.load_image_for_button(2, tmp_path, BUTTON_SIZE)
    assert img.size == (120, 120)  # resized to Plus button size


def test_default_tile_when_no_files(tmp_path):
    img = rendering.load_image_for_button(5, tmp_path, BUTTON_SIZE)
    assert img.size == (120, 120)


# --- label wrap to 2 lines ---------------------------------------------------

def test_label_wraps_to_two_lines():
    from PIL import ImageFont
    font = ImageFont.load_default()
    lines = rendering.wrap_text("one two three four five six seven eight", font, 60)
    assert len(lines) <= 2


# --- sidecar files -----------------------------------------------------------

def test_position_sidecar(tmp_path):
    (tmp_path / "button-3-position.txt").write_text("top\n")
    assert rendering.load_text_position_for_button(3, tmp_path) == "top"


def test_position_sidecar_default(tmp_path):
    assert rendering.load_text_position_for_button(3, tmp_path) == "bottom"


def test_fontsize_sidecar(tmp_path):
    (tmp_path / "button-3-fontsize.txt").write_text("40\n")
    assert rendering.load_font_size_for_button(3, tmp_path) == 40


def test_fontsize_sidecar_out_of_range_ignored(tmp_path):
    (tmp_path / "button-3-fontsize.txt").write_text("999\n")
    assert rendering.load_font_size_for_button(3, tmp_path) == 24  # default


# --- touchscreen strip: 800x100 with 4px dividers ----------------------------

def test_touchscreen_strip_dimensions(tmp_path):
    img = rendering.compose_touchscreen(TOUCH_ZONES, tmp_path, 800, 100, ZONE_SIZE)
    assert img.size == (800, 100)


def test_touchscreen_has_dividers(tmp_path):
    img = rendering.compose_touchscreen(TOUCH_ZONES, tmp_path, 800, 100, ZONE_SIZE).convert("L")

    def col_mean(x):
        return sum(img.getpixel((x, y)) for y in range(0, 100, 5)) / 20

    # Zone boundaries at x=200/400/600 carry a black divider line; they read
    # darker than the middle of a zone.
    assert col_mean(200) < col_mean(100)
    assert col_mean(400) < col_mean(300)
