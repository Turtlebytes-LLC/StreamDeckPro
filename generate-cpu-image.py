#!/usr/bin/env python3
import sys
from PIL import Image, ImageDraw, ImageFont

ZONE_WIDTH = 200
ZONE_HEIGHT = 100

def generate_cpu_image(cpu_percent, output_path):
    cpu = max(0, min(100, cpu_percent))
    
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
    
    if cpu > 0:
        fill_width = int((bar_width * cpu) / 100)
        if fill_width > 0:
            if cpu < 50:
                bar_color = '#4CAF50'
            elif cpu < 80:
                bar_color = '#FFC107'
            else:
                bar_color = '#f44336'
            
            draw.rounded_rectangle(
                [(bar_margin, bar_y), (bar_margin + fill_width, bar_y + bar_height)],
                radius=10,
                fill=bar_color
            )
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except:
        font = ImageFont.load_default()
        font_small = font
    
    draw.text((ZONE_WIDTH // 2, 18), "CPU", fill='#888888', font=font_small, anchor="mm")
    
    if cpu >= 80:
        text_color = '#f44336'
    elif cpu >= 50:
        text_color = '#FFC107'
    else:
        text_color = '#ffffff'
    
    draw.text((ZONE_WIDTH // 2 - 10, 18), f"{cpu}%", fill=text_color, font=font, anchor="mm")
    draw.text((ZONE_WIDTH // 2 + 30, 18), "CPU", fill='#666666', font=font_small, anchor="mm")
    
    img.save(output_path, 'PNG', optimize=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: generate-cpu-image.py <cpu_percent> <output_path>")
        sys.exit(1)
    
    cpu = int(float(sys.argv[1]))
    output_path = sys.argv[2]
    
    generate_cpu_image(cpu, output_path)
