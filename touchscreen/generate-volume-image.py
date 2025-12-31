#!/usr/bin/env python3
import subprocess
import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("PIL not installed")
    exit(1)

def get_volume():
    try:
        result = subprocess.run(['wpctl', 'get-volume', '@DEFAULT_AUDIO_SINK@'], 
                              capture_output=True, text=True, timeout=2)
        output = result.stdout.strip()
        if 'MUTED' in output:
            return 0, True
        vol = float(output.split()[1]) * 100
        return int(vol), False
    except:
        return 50, False

def generate_volume_image():
    width, height = 200, 100
    volume, muted = get_volume()
    
    img = Image.new('RGB', (width, height), '#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except:
        font_large = ImageFont.load_default()
        font_small = font_large
    
    if muted:
        draw.text((width//2, 25), "MUTED", fill='#ff4757', font=font_large, anchor='mm')
        bar_color = '#555555'
    else:
        draw.text((width//2, 25), f"{volume}%", fill='#ffffff', font=font_large, anchor='mm')
        if volume > 80:
            bar_color = '#ff6b6b'
        elif volume > 50:
            bar_color = '#feca57'
        else:
            bar_color = '#1dd1a1'
    
    bar_x, bar_y = 20, 55
    bar_width, bar_height = 160, 20
    draw.rectangle([bar_x, bar_y, bar_x + bar_width, bar_y + bar_height], outline='#444444', width=1)
    
    fill_width = int(bar_width * min(volume, 100) / 100)
    if fill_width > 0:
        draw.rectangle([bar_x+1, bar_y+1, bar_x + fill_width - 1, bar_y + bar_height - 1], fill=bar_color)
    
    draw.text((width//2, 88), "VOLUME", fill='#888888', font=font_small, anchor='mm')
    
    script_dir = Path(__file__).parent
    img.save(script_dir / 'touch-3.png')

if __name__ == '__main__':
    generate_volume_image()
