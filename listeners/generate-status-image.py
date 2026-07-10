#!/usr/bin/env python3
"""Generate a status zone image for a Stream Deck touchscreen zone.

Merges the old generate-volume-image / generate-cpu-image / generate-cpu-chart
scripts behind a single --kind switch.

Usage:
  generate-status-image.py --kind volume --value 42 --out touch-1.png [--muted]
  generate-status-image.py --kind mute   --out touch-2.png [--muted]
  generate-status-image.py --kind cpu    --value 37 --out touch-4.png
"""

import os
import sys
import json
import argparse

from PIL import Image, ImageDraw, ImageFont

ZONE_WIDTH = 200
ZONE_HEIGHT = 100

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

CPU_HISTORY_FILE = os.path.expanduser("~/.cache/streamdeck-cpu-history.json")
CPU_MAX_POINTS = 30


def _font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def _bar_color(value, mid, high):
    if value < mid:
        return '#4CAF50'
    elif value < high:
        return '#FFC107'
    return '#f44336'


def generate_volume(value, muted, draw):
    volume = max(0, min(100, int(value)))

    bar_margin = 15
    bar_height = 20
    bar_y = (ZONE_HEIGHT - bar_height) // 2 + 15
    bar_width = ZONE_WIDTH - (bar_margin * 2)

    draw.rounded_rectangle(
        [(bar_margin, bar_y), (bar_margin + bar_width, bar_y + bar_height)],
        radius=10, fill='#333333')

    if not muted and volume > 0:
        fill_width = int((bar_width * volume) / 100)
        if fill_width > 0:
            draw.rounded_rectangle(
                [(bar_margin, bar_y), (bar_margin + fill_width, bar_y + bar_height)],
                radius=10, fill=_bar_color(volume, 30, 70))

    font = _font(FONT_BOLD, 24)
    if muted:
        text, text_color = "MUTED", '#f44336'
    else:
        text, text_color = f"{volume}%", '#ffffff'

    draw.text((ZONE_WIDTH // 2, 20), text, fill=text_color, font=font, anchor="mm")


def generate_mute(muted, draw):
    font = _font(FONT_BOLD, 30)
    font_small = _font(FONT_REGULAR, 14)

    if muted:
        text, text_color = "MUTED", '#f44336'
    else:
        text, text_color = "SOUND", '#4CAF50'

    draw.text((ZONE_WIDTH // 2, 18), "Audio", fill='#888888', font=font_small, anchor="mm")
    draw.text((ZONE_WIDTH // 2, 60), text, fill=text_color, font=font, anchor="mm")


def generate_cpu(value, draw):
    """CPU sparkline chart with rolling history."""
    cpu = max(0, min(100, int(value)))

    history = _load_cpu_history()
    history.append(cpu)
    if len(history) > CPU_MAX_POINTS:
        history = history[-CPU_MAX_POINTS:]
    _save_cpu_history(history)

    margin_left = 10
    margin_right = 10
    margin_top = 25
    margin_bottom = 10

    chart_width = ZONE_WIDTH - margin_left - margin_right
    chart_height = ZONE_HEIGHT - margin_top - margin_bottom

    draw.rectangle(
        [(margin_left, margin_top), (ZONE_WIDTH - margin_right, ZONE_HEIGHT - margin_bottom)],
        fill='#1a1a1a', outline='#333333')

    for i in range(1, 4):
        y = margin_top + (chart_height * i // 4)
        draw.line([(margin_left, y), (ZONE_WIDTH - margin_right, y)], fill='#2a2a2a', width=1)

    if len(history) >= 2:
        points = []
        for i, val in enumerate(history):
            x = margin_left + (i * chart_width // (CPU_MAX_POINTS - 1))
            y = margin_top + chart_height - (val * chart_height // 100)
            points.append((x, y))
        draw.line(points, fill=_bar_color(cpu, 50, 80), width=2)

    font = _font(FONT_BOLD, 16)
    text_color = _bar_color(cpu, 50, 80)
    draw.text((margin_left + 5, 5), f"CPU {cpu}%", fill=text_color, font=font)


def _load_cpu_history():
    try:
        with open(CPU_HISTORY_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return []


def _save_cpu_history(history):
    os.makedirs(os.path.dirname(CPU_HISTORY_FILE), exist_ok=True)
    with open(CPU_HISTORY_FILE, 'w') as f:
        json.dump(history, f)


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate a Stream Deck status zone image")
    parser.add_argument("--kind", required=True, choices=["volume", "mute", "cpu"])
    parser.add_argument("--value", type=float, default=0.0, help="volume or cpu percent")
    parser.add_argument("--out", required=True, help="output PNG path")
    parser.add_argument("--muted", action="store_true", help="audio is muted")
    args = parser.parse_args(argv)

    img = Image.new('RGB', (ZONE_WIDTH, ZONE_HEIGHT), color='#0a0a0a')
    draw = ImageDraw.Draw(img)

    if args.kind == "volume":
        generate_volume(args.value, args.muted, draw)
    elif args.kind == "mute":
        generate_mute(args.muted, draw)
    elif args.kind == "cpu":
        generate_cpu(args.value, draw)

    img.save(args.out, 'PNG', optimize=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
