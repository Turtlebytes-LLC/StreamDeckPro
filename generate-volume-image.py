#!/usr/bin/env python3
"""Generate a volume indicator image for Stream Deck touchscreen zone."""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ZONE_WIDTH = 200
ZONE_HEIGHT = 100

def get_volume_icon(volume, muted):
    if muted:
        return "\U0001F507"
    elif volume == 0:
        return "\U0001F508"
    elif volume < 50:
        return "\U0001F509"
    else:
        return "\U0001F50A"

def generate_volume_image(volume_percent, output_path, muted=False):
    volume = max(0, min(100, volume_percent))
    
    img = Image.new('RGB', (ZONE_WIDTH, ZONE_HEIGHT), color='#0a0a0a')
    draw = ImageDraw.Draw(img)
    
    bar_margin = 15
    bar_height = 20
    bar_y = (ZONE_HEIGHT - bar_height) // 2 + 15
    bar_width = ZONE_WIDTH - (bar_margin * 2)
    
    draw.rounded_rectangle(
        [(bar_margin, bar_y), (bar_margin + bar_width, bar_y + bar_height)],
        radius=10,
        fill='#333333'
    )
    
    if not muted and volume > 0:
        fill_width = int((bar_width * volume) / 100)
        if fill_width > 0:
            if volume < 30:
                bar_color = '#4CAF50'
            elif volume < 70:
                bar_color = '#FFC107'
            else:
                bar_color = '#f44336'
            
            draw.rounded_rectangle(
                [(bar_margin, bar_y), (bar_margin + fill_width, bar_y + bar_height)],
                radius=10,
                fill=bar_color
            )
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except:
        font = ImageFont.load_default()
    
    if muted:
        text = "MUTED"
        text_color = '#f44336'
    else:
        text = f"{volume}%"
        text_color = '#ffffff'
    
    draw.text((ZONE_WIDTH // 2, 20), text, fill=text_color, font=font, anchor="mm")
    
    img.save(output_path, 'PNG', optimize=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: generate-volume-image.py <volume_percent> <output_path> [muted]")
        print("Example: generate-volume-image.py 75 /path/to/touch-1.png")
        print("Example: generate-volume-image.py 0 /path/to/touch-1.png muted")
        sys.exit(1)
    
    volume = int(sys.argv[1])
    output_path = sys.argv[2]
    muted = len(sys.argv) > 3 and sys.argv[3].lower() == 'muted'
    
    generate_volume_image(volume, output_path, muted)
