#!/usr/bin/env python3
"""
System Stats Button - Shows CPU, RAM, Disk usage with color-coded bars
Auto-updates when button is pressed or via listener.

Usage:
  1. Copy to ~/streamdeck-actions/buttons/
  2. Create button-N.sh that runs: python3 generate-sysinfo-image.py
"""

import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BUTTON_SIZE = (120, 120)
SCRIPT_DIR = Path(__file__).parent
OUTPUT_PATH = SCRIPT_DIR / "button-2.png"

def get_font(size):
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for path in font_paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def get_cpu():
    try:
        result = subprocess.run(["grep", "-c", "^processor", "/proc/cpuinfo"], capture_output=True, text=True)
        cores = int(result.stdout.strip())
        result = subprocess.run(["awk", "{print $1}", "/proc/loadavg"], capture_output=True, text=True)
        load = float(result.stdout.strip())
        return min(100, int((load / cores) * 100))
    except:
        return 0

def get_ram():
    try:
        result = subprocess.run(["free", "-m"], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        mem_line = lines[1].split()
        total, used = int(mem_line[1]), int(mem_line[2])
        return int((used / total) * 100), f"{used//1024}G/{total//1024}G"
    except:
        return 0, "N/A"

def get_disk():
    try:
        result = subprocess.run(["df", "-h", "/"], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        parts = lines[1].split()
        return int(parts[4].replace('%', '')), f"{parts[2]}/{parts[1]}"
    except:
        return 0, "N/A"

def get_color(percent):
    if percent < 50: return '#00ff88'
    elif percent < 80: return '#ffaa00'
    return '#ff4444'

def draw_bar(draw, x, y, width, height, percent, color):
    draw.rectangle([(x, y), (x + width, y + height)], outline='#444444', width=1)
    fill_width = int((width - 2) * (percent / 100))
    if fill_width > 0:
        draw.rectangle([(x + 1, y + 1), (x + 1 + fill_width, y + height - 1)], fill=color)

def generate_image():
    img = Image.new('RGB', BUTTON_SIZE, color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    title_font, label_font, value_font = get_font(10), get_font(9), get_font(8)
    draw.text((60, 4), "SYSTEM", fill='#888888', font=title_font, anchor="mt")
    
    cpu_pct = get_cpu()
    ram_pct, _ = get_ram()
    disk_pct, _ = get_disk()
    
    y, row_h, bar_w, bar_h = 20, 32, 80, 8
    
    for label, pct in [("CPU", cpu_pct), ("RAM", ram_pct), ("DISK", disk_pct)]:
        draw.text((8, y), label, fill='#aaaaaa', font=label_font)
        draw.text((112, y), f"{pct}%", fill=get_color(pct), font=value_font, anchor="rt")
        draw_bar(draw, 8, y + 12, bar_w, bar_h, pct, get_color(pct))
        y += row_h
    
    img.save(OUTPUT_PATH, 'PNG')

if __name__ == "__main__":
    generate_image()
