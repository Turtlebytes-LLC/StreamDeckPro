"""Image and label rendering for buttons and touchscreen zones.

Free functions taking explicit args (dirs, sizes) instead of daemon state.
"""

import logging
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont

try:
    import cairosvg
    SVG_SUPPORT = True
except ImportError:
    cairosvg = None
    SVG_SUPPORT = False

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def load_svg_image(svg_path, target_width, target_height, icon_color="#FFFFFF", bg_color="#000000"):
    if not SVG_SUPPORT or cairosvg is None:
        return None

    try:
        with open(svg_path, 'r') as f:
            svg_data = f.read()

        svg_data = svg_data.replace('stroke="currentColor"', f'stroke="{icon_color}"')
        svg_data = svg_data.replace('fill="currentColor"', f'fill="{icon_color}"')

        png_data = cairosvg.svg2png(
            bytestring=svg_data.encode('utf-8'),
            output_width=target_width * 2,
            output_height=target_height * 2,
            background_color=bg_color
        )

        if png_data is None:
            return None

        img = Image.open(BytesIO(png_data))
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        return img.convert('RGB')
    except Exception as e:
        logging.error(f"Error loading SVG {svg_path}: {e}")
        return None


def resize_with_aspect_ratio(img, target_width, target_height):
    """Resize image maintaining aspect ratio with padding"""
    orig_width, orig_height = img.size

    target_ratio = target_width / target_height
    orig_ratio = orig_width / orig_height

    if orig_ratio > target_ratio:
        new_width = target_width
        new_height = int(target_width / orig_ratio)
    else:
        new_height = target_height
        new_width = int(target_height * orig_ratio)

    img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    background = Image.new('RGB', (target_width, target_height), color='#000000')
    paste_x = (target_width - new_width) // 2
    paste_y = (target_height - new_height) // 2
    background.paste(img_resized, (paste_x, paste_y))
    return background


def wrap_text(text, font, max_width):
    """Wrap or truncate text to fit width (max 2 lines)"""
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = font.getbbox(test_line)
        width = bbox[2] - bbox[0]

        if width <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
                current_line = [word]
            else:
                lines.append(word[:8] + '...')
                current_line = []

    if current_line:
        lines.append(' '.join(current_line))

    return lines[:2]


# --- buttons -----------------------------------------------------------------

def load_image_for_button(button_num, buttons_dir, button_size):
    """Load custom image for a button, or create default tile"""
    btn_w, btn_h = button_size

    svg_path = buttons_dir / f"button-{button_num}.svg"
    if svg_path.exists():
        img = load_svg_image(svg_path, btn_w, btn_h)
        if img:
            return img

    for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
        img_path = buttons_dir / f"button-{button_num}{ext}"
        if img_path.exists():
            try:
                img = Image.open(img_path)  # animated files land on frame 0
                img = img.convert('RGB')
                img = resize_with_aspect_ratio(img, btn_w, btn_h)
                return img
            except Exception as e:
                logging.error(f"Error loading {img_path}: {e}")

    img = Image.new('RGB', (btn_w, btn_h), color='#1a1a1a')
    draw = ImageDraw.Draw(img)

    font_size = max(24, btn_w // 3)
    try:
        font = ImageFont.truetype(FONT_BOLD, font_size)
    except Exception:
        font = ImageFont.load_default()

    draw.text((btn_w // 2, btn_h // 2), str(button_num), fill='#666666', font=font, anchor="mm")
    return img


def load_animation_frames(image_path, size, max_frames=60):
    """Extract animation frames from a GIF/APNG/WebP as (frames, durations_ms).

    Returns (list[RGB Image], list[int]) sized to `size`. A static image yields
    a single frame. Frame count is capped at max_frames to keep CPU sane (the
    animated-render loop that consumes this is a follow-up). Returns ([], [])
    if the file cannot be opened.
    """
    w, h = size
    try:
        img = Image.open(image_path)
    except Exception as e:
        logging.error(f"Error opening animation {image_path}: {e}")
        return [], []

    frames, durations = [], []
    n = getattr(img, "n_frames", 1)
    for i in range(min(n, max_frames)):
        try:
            img.seek(i)
        except EOFError:
            break
        frame = resize_with_aspect_ratio(img.convert("RGB"), w, h)
        frames.append(frame)
        durations.append(int(img.info.get("duration", 100)) or 100)
    return frames, durations


def is_animated(image_path):
    """True if the file has more than one frame."""
    try:
        return getattr(Image.open(image_path), "n_frames", 1) > 1
    except Exception:
        return False


def load_label_for_button(button_num, buttons_dir):
    label_path = buttons_dir / f"button-{button_num}.txt"
    if label_path.exists():
        try:
            with open(label_path, 'r') as f:
                return f.read().strip()
        except Exception as e:
            logging.error(f"Error loading {label_path}: {e}")
    return None


def load_text_position_for_button(button_num, buttons_dir):
    position_path = buttons_dir / f"button-{button_num}-position.txt"
    if position_path.exists():
        try:
            with open(position_path, 'r') as f:
                position = f.read().strip().lower()
                if position in ['top', 'middle', 'bottom']:
                    return position
        except Exception as e:
            logging.error(f"Error loading {position_path}: {e}")
    return 'bottom'


def load_font_size_for_button(button_num, buttons_dir):
    fontsize_path = buttons_dir / f"button-{button_num}-fontsize.txt"
    if fontsize_path.exists():
        try:
            with open(fontsize_path, 'r') as f:
                fontsize = int(f.read().strip())
                if 10 <= fontsize <= 60:
                    return fontsize
        except Exception as e:
            logging.error(f"Error loading {fontsize_path}: {e}")
    return 24


def render_button(button_num, buttons_dir, button_size):
    """Render a button with image and optional text label"""
    img = load_image_for_button(button_num, buttons_dir, button_size)
    btn_w, btn_h = button_size

    label = load_label_for_button(button_num, buttons_dir)
    if label:
        position = load_text_position_for_button(button_num, buttons_dir)
        fontsize = load_font_size_for_button(button_num, buttons_dir)
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype(FONT_BOLD, fontsize)
        except Exception:
            font = ImageFont.load_default()

        lines = wrap_text(label, font, btn_w - 5)
        line_height = fontsize + 5
        center_x = btn_w // 2
        center_y = btn_h // 2

        if position == 'top':
            bg_height = len(lines) * line_height + 5
            draw.rectangle([(0, 0), (btn_w, bg_height)], fill='#000000dd')
            y_offset = 5
            for line in lines:
                draw.text((center_x, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                y_offset += line_height

        elif position == 'middle':
            total_height = len(lines) * line_height
            start_y = center_y - (total_height // 2)
            draw.rectangle([(0, start_y - 5), (btn_w, start_y + total_height + 5)], fill='#000000dd')
            y_offset = start_y
            for line in lines:
                draw.text((center_x, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                y_offset += line_height

        else:  # bottom (default)
            bg_height = len(lines) * line_height + 5
            draw.rectangle([(0, btn_h - bg_height), (btn_w, btn_h)], fill='#000000dd')
            y_offset = btn_h - bg_height + 5
            for line in lines:
                draw.text((center_x, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                y_offset += line_height

    return img


# --- touchscreen zones -------------------------------------------------------

def load_image_for_touch_zone(zone_name, touch_dir, zone_size):
    zone_w, zone_h = zone_size

    svg_path = touch_dir / f"{zone_name}.svg"
    if svg_path.exists():
        img = load_svg_image(svg_path, zone_w, zone_h)
        if img:
            return img

    for ext in ['.png', '.jpg', '.jpeg']:
        img_path = touch_dir / f"{zone_name}{ext}"
        if img_path.exists():
            try:
                img = Image.open(img_path)
                img = img.convert('RGB')
                img = resize_with_aspect_ratio(img, zone_w, zone_h)
                return img
            except Exception as e:
                logging.error(f"Error loading {img_path}: {e}")
    return None


def load_label_for_touch_zone(zone_name, touch_dir):
    label_path = touch_dir / f"{zone_name}.txt"
    if label_path.exists():
        try:
            with open(label_path, 'r') as f:
                return f.read().strip()
        except Exception as e:
            logging.error(f"Error loading {label_path}: {e}")
    return None


def load_text_position_for_touch_zone(zone_name, touch_dir):
    position_path = touch_dir / f"{zone_name}-position.txt"
    if position_path.exists():
        try:
            with open(position_path, 'r') as f:
                position = f.read().strip().lower()
                if position in ['top', 'middle', 'bottom']:
                    return position
        except Exception as e:
            logging.error(f"Error loading {position_path}: {e}")
    return 'middle'


def load_font_size_for_touch_zone(zone_name, touch_dir):
    fontsize_path = touch_dir / f"{zone_name}-fontsize.txt"
    if fontsize_path.exists():
        try:
            with open(fontsize_path, 'r') as f:
                fontsize = int(f.read().strip())
                if 10 <= fontsize <= 60:
                    return fontsize
        except Exception as e:
            logging.error(f"Error loading {fontsize_path}: {e}")
    return 28


def compose_touchscreen(touch_zones, touch_dir, ts_width, ts_height, zone_size):
    """Compose the single strip image for all touchscreen zones."""
    zone_w, zone_h = zone_size
    img = Image.new('RGB', (ts_width, ts_height), color='#0a0a0a')

    for i, zone in enumerate(touch_zones):
        x = zone['x']
        zone_name = zone['name']

        zone_img = load_image_for_touch_zone(zone_name, touch_dir, zone_size)
        if zone_img:
            img.paste(zone_img, (x, 0))
        else:
            draw = ImageDraw.Draw(img)

            script = touch_dir / f"{zone_name}.sh"
            if script.exists():
                color = '#1a3a2a'
                text_color = '#00ff88'
            else:
                color = '#1a1a1a'
                text_color = '#666666'

            draw.rectangle([(x, 0), (x + zone_w, ts_height)], fill=color)

            label = load_label_for_touch_zone(zone_name, touch_dir)
            position = load_text_position_for_touch_zone(zone_name, touch_dir)
            center_x = x + zone_w // 2
            center_y = ts_height // 2

            if label:
                fontsize = load_font_size_for_touch_zone(zone_name, touch_dir)
                try:
                    font = ImageFont.truetype(FONT_BOLD, fontsize)
                except Exception:
                    font = ImageFont.load_default()

                lines = wrap_text(label, font, zone_w - 5)
                line_height = fontsize + 5

                if position == 'top':
                    y_offset = 5
                    for line in lines[:2]:
                        draw.text((center_x, y_offset), line, fill=text_color, font=font, anchor="mt")
                        y_offset += line_height
                elif position == 'bottom':
                    y_offset = ts_height - 5 - (len(lines[:2]) - 1) * line_height
                    for line in lines[:2]:
                        draw.text((center_x, y_offset), line, fill=text_color, font=font, anchor="mb")
                        y_offset += line_height
                else:
                    total_height = len(lines[:2]) * line_height
                    y_offset = center_y - (total_height // 2)
                    for line in lines[:2]:
                        draw.text((center_x, y_offset), line, fill=text_color, font=font, anchor="mt")
                        y_offset += line_height
            else:
                try:
                    font = ImageFont.truetype(FONT_REGULAR, 14)
                except Exception:
                    font = ImageFont.load_default()

                draw.text((center_x, center_y), f"Zone {i+1}", fill=text_color, font=font, anchor="mm")

    draw = ImageDraw.Draw(img)
    for i, zone in enumerate(touch_zones):
        x = zone['x']

        if i > 0:
            draw.line([(x, 0), (x, ts_height)], fill='#000000', width=4)

        if i == len(touch_zones) - 1:
            draw.line([(x + zone_w, 0), (x + zone_w, ts_height)], fill='#000000', width=4)

    return img
