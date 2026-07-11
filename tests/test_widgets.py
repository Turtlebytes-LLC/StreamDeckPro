"""Touch-bar widget rendering and data sources."""

from streamdeckpro import widgets


def test_render_clock_size():
    img = widgets.render_clock((200, 100), "13:37", "Fri 11")
    assert img.size == (200, 100)
    assert img.mode == "RGB"


def test_render_clock_no_date():
    img = widgets.render_clock((120, 120), "09:00")
    assert img.size == (120, 120)


def test_render_stats_size_and_clamp():
    # out-of-range percentages must not raise (bar clamps 0..100)
    img = widgets.render_stats((200, 100), 150, -10)
    assert img.size == (200, 100)


def test_read_mem_percent_is_a_percentage():
    pct = widgets.read_mem_percent()
    assert 0.0 <= pct <= 100.0


def test_read_cpu_percent_is_a_percentage():
    pct = widgets.read_cpu_percent(sample=0.05)
    assert 0.0 <= pct <= 100.0


def test_zone_size_by_element():
    assert widgets._zone_size("touch-1") == (200, 100)
    assert widgets._zone_size("button-3") == (120, 120)


def test_write_widget_image_default_profile(tmp_path, monkeypatch):
    monkeypatch.setattr(widgets.config, "SDP_HOME", tmp_path)
    monkeypatch.setattr(widgets.config, "PROFILE_FILE", tmp_path / ".profile")
    monkeypatch.setattr(widgets.config, "PROFILES_DIR", tmp_path / "profiles")
    img = widgets.render_clock((200, 100), "00:00")
    out = widgets.write_widget_image(img, "touch-1")
    assert out == tmp_path / "touchscreen" / "touch-1.png"
    assert out.exists()


def test_write_widget_image_named_profile(tmp_path, monkeypatch):
    (tmp_path / "profiles" / "work" / "touchscreen").mkdir(parents=True)
    (tmp_path / ".profile").write_text("work")
    monkeypatch.setattr(widgets.config, "SDP_HOME", tmp_path)
    monkeypatch.setattr(widgets.config, "PROFILE_FILE", tmp_path / ".profile")
    monkeypatch.setattr(widgets.config, "PROFILES_DIR", tmp_path / "profiles")
    img = widgets.render_stats((200, 100), 50, 50)
    out = widgets.write_widget_image(img, "touch-2")
    assert out == tmp_path / "profiles" / "work" / "touchscreen" / "touch-2.png"
    assert out.exists()
