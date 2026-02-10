#!/usr/bin/env python3
"""
Site Uptime Checker - Generates a Stream Deck button image showing site status
Press button to refresh, or set up a cron/listener for auto-updates.

Usage:
  1. Copy this to ~/streamdeck-actions/buttons/
  2. Edit SITES list below with your domains
  3. Create button-N.sh that runs: python3 generate-uptime-image.py
"""

import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SITES = [
    ("Turtle", "turtlebytes.com"),
    ("GitHub", "github.com"),
    ("AWS", "aws.amazon.com"),
    ("1to1Plus", "1to1plus.com"),
]

BUTTON_SIZE = (120, 120)
SCRIPT_DIR = Path(__file__).parent
OUTPUT_PATH = SCRIPT_DIR / "button-1.png"

def check_site(domain, timeout=2):
    """Check site and return (is_up, ping_time_ms)"""
    import time
    try:
        start = time.time()
        result = subprocess.run(
            ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", 
             "-m", str(timeout), f"https://{domain}"],
            capture_output=True, text=True, timeout=timeout + 1
        )
        elapsed_ms = int((time.time() - start) * 1000)
        code = result.stdout.strip()
        is_up = code.startswith("2") or code.startswith("3")
        return (is_up, elapsed_ms if is_up else None)
    except:
        return (False, None)

def get_font(size):
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]
    for path in font_paths:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def generate_image():
    img = Image.new('RGB', BUTTON_SIZE, color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    title_font = get_font(11)
    site_font = get_font(9)
    
    draw.text((60, 4), "UPTIME", fill='#888888', font=title_font, anchor="mt")
    
    y_start = 18
    row_height = 17
    
    for i, (name, domain) in enumerate(SITES):
        y = y_start + (i * row_height)
        is_up, ping_ms = check_site(domain)
        
        if is_up:
            indicator_color = '#00ff88'
            text_color = '#ffffff'
            status = "●"
            ping_text = f"{ping_ms}ms" if ping_ms else ""
        else:
            indicator_color = '#ff4444'
            text_color = '#888888'
            status = "○"
            ping_text = ""
        
        draw.text((8, y), status, fill=indicator_color, font=site_font)
        label = f"{name[:8]} {ping_text}" if ping_text else name[:8]
        draw.text((20, y), label, fill=text_color, font=site_font)
    
    img.save(OUTPUT_PATH, 'PNG')
    print(f"Generated: {OUTPUT_PATH}")

if __name__ == "__main__":
    generate_image()
