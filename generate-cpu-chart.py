#!/usr/bin/env python3
import sys
import os
import json
from PIL import Image, ImageDraw, ImageFont

ZONE_WIDTH = 200
ZONE_HEIGHT = 100
HISTORY_FILE = os.path.expanduser("~/.cache/streamdeck-cpu-history.json")
MAX_POINTS = 30

def load_history():
    try:
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_history(history):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f)

def generate_cpu_chart(cpu_percent, output_path):
    cpu = max(0, min(100, cpu_percent))
    
    history = load_history()
    history.append(cpu)
    if len(history) > MAX_POINTS:
        history = history[-MAX_POINTS:]
    save_history(history)
    
    img = Image.new('RGB', (ZONE_WIDTH, ZONE_HEIGHT), color='#0a0a0a')
    draw = ImageDraw.Draw(img)
    
    margin_left = 10
    margin_right = 10
    margin_top = 25
    margin_bottom = 10
    
    chart_width = ZONE_WIDTH - margin_left - margin_right
    chart_height = ZONE_HEIGHT - margin_top - margin_bottom
    
    draw.rectangle(
        [(margin_left, margin_top), (ZONE_WIDTH - margin_right, ZONE_HEIGHT - margin_bottom)],
        fill='#1a1a1a',
        outline='#333333'
    )
    
    for i in range(1, 4):
        y = margin_top + (chart_height * i // 4)
        draw.line([(margin_left, y), (ZONE_WIDTH - margin_right, y)], fill='#2a2a2a', width=1)
    
    if len(history) >= 2:
        points = []
        for i, val in enumerate(history):
            x = margin_left + (i * chart_width // (MAX_POINTS - 1))
            y = margin_top + chart_height - (val * chart_height // 100)
            points.append((x, y))
        
        if cpu < 50:
            line_color = '#4CAF50'
        elif cpu < 80:
            line_color = '#FFC107'
        else:
            line_color = '#f44336'
        
        draw.line(points, fill=line_color, width=2)
        
        for i in range(len(points) - 1):
            x1, y1 = points[i]
            x2, y2 = points[i + 1]
            bottom_y = margin_top + chart_height
            
            val_at_point = history[i]
            if val_at_point < 50:
                fill_color = '#4CAF5020'
            elif val_at_point < 80:
                fill_color = '#FFC10720'
            else:
                fill_color = '#f4433620'
    
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except:
        font = ImageFont.load_default()
        font_small = font
    
    if cpu >= 80:
        text_color = '#f44336'
    elif cpu >= 50:
        text_color = '#FFC107'
    else:
        text_color = '#4CAF50'
    
    draw.text((margin_left + 5, 5), f"CPU {cpu}%", fill=text_color, font=font)
    
    img.save(output_path, 'PNG', optimize=True)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: generate-cpu-chart.py <cpu_percent> <output_path>")
        sys.exit(1)
    
    cpu = int(float(sys.argv[1]))
    output_path = sys.argv[2]
    
    generate_cpu_chart(cpu, output_path)
