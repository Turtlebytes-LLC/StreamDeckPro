"""Touch-bar widgets: long-running plugins that repaint their element.

A widget renders an image and writes it to its element in the active profile;
the daemon hot-reloads it. Dependency-free (no new runtime deps): system stats
come from /proc, the clock from the standard library. Weather and MPRIS media
widgets are out of scope here (network / dbus + visual review).

    python -m streamdeckpro.widgets clock --element touch-1 --interval 1
    python -m streamdeckpro.widgets stats --element touch-2 --interval 2

The render_* functions take their data as arguments so they are unit testable
without a clock or a running system.
"""

import sys
import time
import logging
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from . import config
from .rendering import FONT_BOLD, FONT_REGULAR


def _font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def render_clock(size, time_text, date_text=None):
    """Render a clock tile. time_text/date_text are supplied by the caller."""
    w, h = size
    img = Image.new("RGB", (w, h), "#111318")
    draw = ImageDraw.Draw(img)
    draw.text((w // 2, h // 2 - (8 if date_text else 0)),
              time_text, fill="#FFFFFF", font=_font(FONT_BOLD, max(20, h // 3)), anchor="mm")
    if date_text:
        draw.text((w // 2, h - max(10, h // 6)),
                  date_text, fill="#8A8F98", font=_font(FONT_REGULAR, max(11, h // 7)), anchor="mm")
    return img


def _bar(draw, x, y, w, h, pct, color):
    draw.rectangle([x, y, x + w, y + h], fill="#23262E")
    fill_w = int(w * max(0.0, min(1.0, pct / 100.0)))
    if fill_w > 0:
        draw.rectangle([x, y, x + fill_w, y + h], fill=color)


def render_stats(size, cpu_pct, mem_pct):
    """Render CPU/MEM bars. Percentages are supplied by the caller."""
    w, h = size
    img = Image.new("RGB", (w, h), "#111318")
    draw = ImageDraw.Draw(img)
    label_font = _font(FONT_REGULAR, max(10, h // 8))
    pad = max(6, w // 20)
    bar_h = max(8, h // 8)
    for i, (label, pct, color) in enumerate([
        ("CPU", cpu_pct, "#4CC38A"),
        ("MEM", mem_pct, "#5B8DEF"),
    ]):
        y = pad + i * (bar_h + label_font.size + pad)
        draw.text((pad, y), f"{label} {int(pct)}%", fill="#FFFFFF", font=label_font)
        _bar(draw, pad, y + label_font.size + 2, w - 2 * pad, bar_h, pct, color)
    return img


# --- data sources (dependency-free) ------------------------------------------

def read_cpu_percent(sample=0.3):
    """CPU busy percent over a short sample window, from /proc/stat."""
    def snapshot():
        with open("/proc/stat") as f:
            parts = [int(x) for x in f.readline().split()[1:]]
        idle = parts[3] + (parts[4] if len(parts) > 4 else 0)
        return sum(parts), idle
    total1, idle1 = snapshot()
    time.sleep(sample)
    total2, idle2 = snapshot()
    dt, di = total2 - total1, idle2 - idle1
    return 0.0 if dt <= 0 else round(100.0 * (dt - di) / dt, 1)


def read_mem_percent():
    """Used-memory percent from /proc/meminfo."""
    info = {}
    with open("/proc/meminfo") as f:
        for line in f:
            k, v = line.split(":", 1)
            info[k] = int(v.strip().split()[0])
    total = info.get("MemTotal", 0)
    avail = info.get("MemAvailable", info.get("MemFree", 0))
    return 0.0 if total <= 0 else round(100.0 * (total - avail) / total, 1)


# --- output ------------------------------------------------------------------

def _active_profile_root():
    f = config.PROFILE_FILE
    name = f.read_text().strip() if f.exists() else ""
    if not name or name == "default":
        return config.SDP_HOME
    root = config.PROFILES_DIR / name
    return root if root.is_dir() else config.SDP_HOME


def _element_dir(element):
    root = _active_profile_root()
    if element.startswith("button-"):
        return root / "buttons"
    if element.startswith("dial-"):
        return root / "dials"
    return root / "touchscreen"


def write_widget_image(img, element):
    """Write a widget image to its element in the active profile."""
    d = _element_dir(element)
    d.mkdir(parents=True, exist_ok=True)
    out = d / f"{element}.png"
    img.save(out, format="PNG")
    return out


def _zone_size(element):
    return (200, 100) if element.startswith("touch-") else (120, 120)


def run(kind, element, interval):
    size = _zone_size(element)
    logging.info(f"widget {kind} -> {element} every {interval}s")
    while True:
        if kind == "clock":
            t = time.localtime()
            img = render_clock(size, time.strftime("%H:%M", t), time.strftime("%a %d", t))
        elif kind == "stats":
            img = render_stats(size, read_cpu_percent(), read_mem_percent())
        else:
            logging.error(f"unknown widget: {kind}")
            return 1
        write_widget_image(img, element)
        time.sleep(interval)


def main(argv=None):
    parser = argparse.ArgumentParser(description="StreamDeckPro touch-bar widgets")
    parser.add_argument("kind", choices=["clock", "stats"])
    parser.add_argument("--element", default="touch-1")
    parser.add_argument("--interval", type=float, default=1.0)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    try:
        return run(args.kind, args.element, args.interval)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
