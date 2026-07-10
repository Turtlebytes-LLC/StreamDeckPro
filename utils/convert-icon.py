#!/usr/bin/env python3
"""
Convert SVG icon to PNG with proper rendering
Uses cairosvg for accurate SVG stroke rendering
"""

import sys
import cairosvg
from PIL import Image
from io import BytesIO

# Predefined color palette
COLORS = {
    'blue': '#1976D2',
    'red': '#f44336',
    'green': '#4CAF50',
    'orange': '#FF9800',
    'purple': '#9C27B0',
    'pink': '#E91E63',
    'teal': '#009688',
    'indigo': '#3F51B5',
    'cyan': '#00BCD4',
    'yellow': '#FFC107',
    'lime': '#CDDC39',
    'amber': '#FFC107',
    'brown': '#795548',
    'grey': '#9E9E9E',
    'black': '#212121',
    'white': '#FAFAFA',
}

def convert_svg_to_png(svg_path, png_path, size=120, icon_color="#1976D2", bg_color="#000000"):
    """Convert SVG to PNG with colored icon on transparent/black background"""

    # Read SVG and replace currentColor with the icon color
    with open(svg_path, 'r') as f:
        svg_data = f.read()

    # Replace currentColor with the desired icon color
    svg_data = svg_data.replace('stroke="currentColor"', f'stroke="{icon_color}"')
    svg_data = svg_data.replace('fill="currentColor"', f'fill="{icon_color}"')

    # Convert SVG to PNG using cairosvg (renders at high quality)
    png_data = cairosvg.svg2png(
        bytestring=svg_data.encode('utf-8'),
        output_width=size * 2,  # Render at 2x for quality
        output_height=size * 2,
        background_color=bg_color
    )

    # Load with PIL and resize with high quality
    img = Image.open(BytesIO(png_data))
    img = img.resize((size, size), Image.Resampling.LANCZOS)

    # Save
    img.save(png_path, 'PNG', optimize=True)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: convert-icon.py input.svg output.png [color]")
        print("\nAvailable colors:")
        for name in sorted(COLORS.keys()):
            print(f"  {name}")
        print("\nOr use a hex color like #FF5722")
        sys.exit(1)

    svg_path = sys.argv[1]
    png_path = sys.argv[2]

    # Get color from argument or use default blue
    icon_color = "#1976D2"  # Default blue
    if len(sys.argv) > 3:
        color_arg = sys.argv[3].lower()
        if color_arg in COLORS:
            icon_color = COLORS[color_arg]
        elif color_arg.startswith('#'):
            icon_color = color_arg
        else:
            print(f"Unknown color: {color_arg}, using default blue")

    try:
        convert_svg_to_png(svg_path, png_path, icon_color=icon_color)
        print(f"✓ Converted: {png_path}")
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)
