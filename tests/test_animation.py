"""Animated icon frame extraction (GIF)."""

from PIL import Image

from streamdeckpro import rendering


def make_gif(path, n_frames=3, size=(120, 120), duration=80):
    frames = [Image.new("RGB", size, (i * 40, 0, 0)) for i in range(n_frames)]
    frames[0].save(
        path, save_all=True, append_images=frames[1:], duration=duration, loop=0
    )


def test_load_frames_from_gif(tmp_path):
    gif = tmp_path / "spin.gif"
    make_gif(gif, n_frames=3)
    frames, durations = rendering.load_animation_frames(gif, (120, 120))
    assert len(frames) == 3
    assert len(durations) == 3
    assert all(f.size == (120, 120) for f in frames)


def test_frame_cap_respected(tmp_path):
    gif = tmp_path / "long.gif"
    make_gif(gif, n_frames=10)
    frames, _ = rendering.load_animation_frames(gif, (72, 72), max_frames=4)
    assert len(frames) == 4


def test_static_png_is_single_frame(tmp_path):
    png = tmp_path / "static.png"
    Image.new("RGB", (72, 72), (0, 128, 0)).save(png)
    frames, durations = rendering.load_animation_frames(png, (72, 72))
    assert len(frames) == 1
    assert len(durations) == 1


def test_is_animated(tmp_path):
    gif = tmp_path / "a.gif"
    make_gif(gif, n_frames=2)
    png = tmp_path / "b.png"
    Image.new("RGB", (72, 72), (0, 0, 0)).save(png)
    assert rendering.is_animated(gif) is True
    assert rendering.is_animated(png) is False


def test_bad_file_returns_empty(tmp_path):
    bad = tmp_path / "nope.gif"
    bad.write_text("not a gif")
    frames, durations = rendering.load_animation_frames(bad, (72, 72))
    assert frames == [] and durations == []
