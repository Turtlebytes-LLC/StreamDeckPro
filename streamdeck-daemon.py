#!/usr/bin/env python3
"""
Stream Deck Daemon - Simple Script Executor
Calls script files when buttons/dials/touchscreen are used
Shows custom images and labels from files!
Supports all gestures: swipes, long press, etc!
"""

import os
import sys
import time
import subprocess
import logging
import threading
from pathlib import Path
from io import BytesIO

from StreamDeck.DeviceManager import DeviceManager
from PIL import Image, ImageDraw, ImageFont

try:
    import cairosvg
    SVG_SUPPORT = True
except ImportError:
    cairosvg = None
    SVG_SUPPORT = False

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

    # Calculate aspect ratios
    target_ratio = target_width / target_height
    orig_ratio = orig_width / orig_height

    # Determine new dimensions maintaining aspect ratio
    if orig_ratio > target_ratio:
        # Image is wider - fit to width
        new_width = target_width
        new_height = int(target_width / orig_ratio)
    else:
        # Image is taller - fit to height
        new_height = target_height
        new_width = int(target_height * orig_ratio)

    # Resize image maintaining aspect ratio
    img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Create background with target dimensions (black)
    background = Image.new('RGB', (target_width, target_height), color='#000000')

    # Calculate position to center the image
    paste_x = (target_width - new_width) // 2
    paste_y = (target_height - new_height) // 2

    # Paste resized image onto background
    background.paste(img_resized, (paste_x, paste_y))

    return background

# Paths
ACTIONS_DIR = Path.home() / "streamdeck-actions"
BUTTONS_DIR = ACTIONS_DIR / "buttons"
DIALS_DIR = ACTIONS_DIR / "dials"
TOUCH_DIR = ACTIONS_DIR / "touchscreen"
LOG_FILE = ACTIONS_DIR / "daemon.log"

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

# Set console handler to INFO level (less verbose)
for handler in logging.getLogger().handlers:
    if isinstance(handler, logging.StreamHandler):
        handler.setLevel(logging.INFO)


class StreamDeckDaemon:
    """Simple daemon that executes scripts on Stream Deck events"""

    def __init__(self):
        self.deck = None
        self.running = False

        # Touchscreen is divided into 4 horizontal zones
        # 800x100 screen = 200 pixels per zone
        self.touch_zones = [
            {"x": 0, "width": 200, "name": "touch-1"},
            {"x": 200, "width": 200, "name": "touch-2"},
            {"x": 400, "width": 200, "name": "touch-3"},
            {"x": 600, "width": 200, "name": "touch-4"},
        ]

        # Track dial press timing for long press detection
        self.dial_press_times = {}
        self.dial_longpress_timers = {}
        self.dial_longpress_triggered = {}

        # Track touchscreen press timing for long press detection
        self.touch_press_times = {}
        self.touch_longpress_timers = {}
        self.touch_longpress_triggered = {}

        # Track swipe timing for debouncing
        self.last_swipe_time = 0
        self.swipe_debounce_delay = 0.3  # Wait 300ms between swipe triggers

        # Track swipe for proper gesture detection
        self.swipe_in_progress = False
        self.swipe_start_x = 0
        self.swipe_start_y = 0
        self.swipe_end_x = 0
        self.swipe_end_y = 0
        self.swipe_min_x = 0
        self.swipe_max_x = 0
        self.swipe_last_event_time = 0
        self.swipe_reset_timeout = 1.0
        self.swipe_min_distance = 30
        self.swipe_completion_timer = None  # Timer for detecting swipe end (no SHORT event from device)

        # Track file modification times for hot-reloading
        self.file_mtimes = {}
        self.last_reload_check = 0
        self.reload_check_interval = 0.1  # Check for changes every 0.1 seconds

    def connect_device(self):
        """Connect to Stream Deck"""
        logging.info("Connecting to Stream Deck...")
        dm = DeviceManager()
        decks = dm.enumerate()

        if len(decks) == 0:
            logging.error("No Stream Deck found!")
            return False

        self.deck = decks[0]
        self.deck.open()
        self.deck.reset()
        self.deck.set_brightness(100)

        logging.info(f"Connected to: {self.deck.deck_type()}")

        # Set up callbacks
        if hasattr(self.deck, 'set_key_callback'):
            self.deck.set_key_callback(self.button_callback)
            logging.info("Button callbacks registered")

        if hasattr(self.deck, 'set_dial_callback'):
            self.deck.set_dial_callback(self.dial_callback)
            logging.info("Dial callbacks registered")

        if hasattr(self.deck, 'set_touchscreen_callback'):
            self.deck.set_touchscreen_callback(self.touchscreen_callback)
            logging.info("Touchscreen callbacks registered")

        return True

    def load_image_for_button(self, button_num):
        """Load custom image for a button, or create default"""
        svg_path = BUTTONS_DIR / f"button-{button_num}.svg"
        if svg_path.exists():
            img = load_svg_image(svg_path, 120, 120)
            if img:
                return img
        
        for ext in ['.png', '.jpg', '.jpeg']:
            img_path = BUTTONS_DIR / f"button-{button_num}{ext}"
            if img_path.exists():
                try:
                    img = Image.open(img_path)
                    img = img.convert('RGB')
                    img = resize_with_aspect_ratio(img, 120, 120)
                    return img
                except Exception as e:
                    logging.error(f"Error loading {img_path}: {e}")

        # No image found, create default
        img = Image.new('RGB', (120, 120), color='#1a1a1a')
        draw = ImageDraw.Draw(img)

        # Draw button number
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejavuSans-Bold.ttf", 48)
        except:
            font = ImageFont.load_default()

        draw.text((60, 60), str(button_num), fill='#666666', font=font, anchor="mm")

        return img

    def load_label_for_button(self, button_num):
        """Load text label from file if it exists"""
        label_path = BUTTONS_DIR / f"button-{button_num}.txt"
        if label_path.exists():
            try:
                with open(label_path, 'r') as f:
                    return f.read().strip()
            except Exception as e:
                logging.error(f"Error loading {label_path}: {e}")
        return None

    def load_text_position_for_button(self, button_num):
        """Load text position preference (top, middle, bottom)"""
        position_path = BUTTONS_DIR / f"button-{button_num}-position.txt"
        if position_path.exists():
            try:
                with open(position_path, 'r') as f:
                    position = f.read().strip().lower()
                    if position in ['top', 'middle', 'bottom']:
                        return position
            except Exception as e:
                logging.error(f"Error loading {position_path}: {e}")
        return 'bottom'  # Default to bottom

    def load_font_size_for_button(self, button_num):
        """Load font size for button text"""
        fontsize_path = BUTTONS_DIR / f"button-{button_num}-fontsize.txt"
        if fontsize_path.exists():
            try:
                with open(fontsize_path, 'r') as f:
                    fontsize = int(f.read().strip())
                    if 10 <= fontsize <= 60:
                        return fontsize
            except Exception as e:
                logging.error(f"Error loading {fontsize_path}: {e}")
        return 24  # Default font size

    def wrap_text(self, text, font, max_width):
        """Wrap or truncate text to fit width"""
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
                    # Word too long, truncate it
                    lines.append(word[:8] + '...')
                    current_line = []

        if current_line:
            lines.append(' '.join(current_line))

        # Limit to 2 lines max
        return lines[:2]

    def render_button(self, button_num):
        """Render a button with image and optional text label"""
        # Load base image
        img = self.load_image_for_button(button_num)

        # Load label and overlay if exists
        label = self.load_label_for_button(button_num)
        if label:
            position = self.load_text_position_for_button(button_num)
            fontsize = self.load_font_size_for_button(button_num)
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontsize)
            except:
                font = ImageFont.load_default()

            # Wrap text to fit button width
            lines = self.wrap_text(label, font, 115)

            # Calculate line height based on font size
            line_height = fontsize + 5

            # Position text based on preference
            if position == 'top':
                # Draw at top
                bg_height = len(lines) * line_height + 5
                draw.rectangle([(0, 0), (120, bg_height)], fill='#000000dd')

                y_offset = 5
                for line in lines:
                    draw.text((60, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                    y_offset += line_height

            elif position == 'middle':
                # Draw in middle
                total_height = len(lines) * line_height
                start_y = 60 - (total_height // 2)
                draw.rectangle([(0, start_y - 5), (120, start_y + total_height + 5)], fill='#000000dd')

                y_offset = start_y
                for line in lines:
                    draw.text((60, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                    y_offset += line_height

            else:  # bottom (default)
                # Draw at bottom
                bg_height = len(lines) * line_height + 5
                draw.rectangle([(0, 120 - bg_height), (120, 120)], fill='#000000dd')

                y_offset = 120 - bg_height + 5
                for line in lines:
                    draw.text((60, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                    y_offset += line_height

        return img

    def update_all_buttons(self):
        """Update all button displays"""
        if not self.deck or not hasattr(self.deck, 'set_key_image'):
            return

        key_count = self.deck.key_count()
        for key in range(key_count):
            button_num = key + 1
            img = self.render_button(button_num)

            # Convert to JPEG
            buf = BytesIO()
            img.save(buf, format='JPEG', quality=95)

            try:
                self.deck.set_key_image(key, buf.getvalue())
            except Exception as e:
                logging.error(f"Error setting button {button_num} image: {e}")

    def button_callback(self, deck, key, state):
        """Handle button press/release"""
        if state:  # Only on press, not release
            button_num = key + 1  # 0-indexed to 1-indexed
            script = BUTTONS_DIR / f"button-{button_num}.sh"

            logging.info(f"Button {button_num} pressed")
            self.execute_script(script, f"Button {button_num} Pressed")

    def trigger_dial_longpress(self, dial, dial_num):
        """Trigger long press for a dial (called by timer)"""
        # Check if dial is still pressed and hasn't already triggered
        if dial in self.dial_press_times and not self.dial_longpress_triggered.get(dial, False):
            script = DIALS_DIR / f"dial-{dial_num}-longpress.sh"
            press_duration = time.time() - self.dial_press_times[dial]
            logging.info(f"Dial {dial_num} long pressed ({press_duration:.2f}s)")
            self.execute_script(script, f"Dial {dial_num} Long Press")
            self.dial_longpress_triggered[dial] = True

    def trigger_touch_longpress(self, zone_name):
        """Trigger long press for a touchscreen zone (called by timer)"""
        # Check if zone is still pressed and hasn't already triggered
        if zone_name in self.touch_press_times and not self.touch_longpress_triggered.get(zone_name, False):
            script = TOUCH_DIR / f"{zone_name}-longpress.sh"
            press_duration = time.time() - self.touch_press_times[zone_name]
            logging.info(f"Touchscreen zone {zone_name} long pressed ({press_duration:.2f}s)")
            self.execute_script(script, f"{zone_name.replace('-', ' ').title()} Long Press")
            self.touch_longpress_triggered[zone_name] = True

    def dial_callback(self, deck, dial, event, value):
        """Handle dial rotation and press (including long press)"""
        dial_num = dial + 1  # 0-indexed to 1-indexed

        # Get event name (handle both string and enum types)
        event_name = event.name if hasattr(event, 'name') else str(event)
        logging.info(f"Dial {dial_num} event: {event_name}, value: {value}")

        # Handle TURN events (rotation)
        if event_name == "TURN":
            if value > 0:  # Clockwise
                script = DIALS_DIR / f"dial-{dial_num}-cw.sh"
                logging.info(f"Dial {dial_num} rotated clockwise")
                self.execute_script(script, f"Dial {dial_num} Rotate CW")
            else:  # Counter-clockwise
                script = DIALS_DIR / f"dial-{dial_num}-ccw.sh"
                logging.info(f"Dial {dial_num} rotated counter-clockwise")
                self.execute_script(script, f"Dial {dial_num} Rotate CCW")

        # Handle PUSH events (press/release based on value True/False)
        elif event_name == "PUSH":
            if value:  # True = pressed down
                # Track when dial was pressed
                self.dial_press_times[dial] = time.time()
                self.dial_longpress_triggered[dial] = False

                # Start timer to trigger long press after 0.5 seconds
                timer = threading.Timer(0.5, self.trigger_dial_longpress, args=(dial, dial_num))
                timer.daemon = True
                timer.start()
                self.dial_longpress_timers[dial] = timer

                logging.info(f"Dial {dial_num} pushed (tracking for long press)")
            else:  # False = released
                # Cancel the timer if it hasn't triggered yet
                if dial in self.dial_longpress_timers:
                    self.dial_longpress_timers[dial].cancel()
                    del self.dial_longpress_timers[dial]

                # Only trigger regular press if long press wasn't triggered
                if dial in self.dial_press_times:
                    longpress_was_triggered = self.dial_longpress_triggered.get(dial, False)
                    del self.dial_press_times[dial]

                    if dial in self.dial_longpress_triggered:
                        del self.dial_longpress_triggered[dial]

                    if not longpress_was_triggered:
                        # It was a short press
                        script = DIALS_DIR / f"dial-{dial_num}-press.sh"
                        logging.info(f"Dial {dial_num} pressed (short)")
                        self.execute_script(script, f"Dial {dial_num} Press")
                    else:
                        logging.info(f"Dial {dial_num} released (long press already triggered)")

    def touchscreen_callback(self, deck, event_type, value):
        """Handle touchscreen gestures: tap, swipe, long swipe"""
        event_name = event_type.name if hasattr(event_type, 'name') else str(event_type)
        current_time = time.time()

        logging.info(f"Touchscreen event: {event_name}, value: {value}")

        if event_name == "DRAG":
            time_since_last = current_time - self.swipe_last_event_time
            
            if not self.swipe_in_progress or time_since_last > self.swipe_reset_timeout:
                self.swipe_in_progress = True
                self.swipe_start_x = value.get('x', 0)
                self.swipe_start_y = value.get('y', 0)
                self.swipe_min_x = self.swipe_start_x
                self.swipe_max_x = self.swipe_start_x

                x = self.swipe_start_x
                for zone in self.touch_zones:
                    if zone['x'] <= x < zone['x'] + zone['width']:
                        zone_name = zone['name']
                        if zone_name in self.touch_longpress_timers:
                            self.touch_longpress_timers[zone_name].cancel()
                        self.touch_press_times[zone_name] = current_time
                        self.touch_longpress_triggered[zone_name] = False
                        timer = threading.Timer(0.5, self.trigger_touch_longpress, args=(zone_name,))
                        timer.daemon = True
                        timer.start()
                        self.touch_longpress_timers[zone_name] = timer
                        break

            current_x = value.get('x', 0)
            current_x_out = value.get('x_out', current_x)
            self.swipe_end_x = current_x_out
            self.swipe_end_y = value.get('y_out', value.get('y', 0))
            self.swipe_last_event_time = current_time

            self.swipe_min_x = min(self.swipe_min_x, current_x, current_x_out)
            self.swipe_max_x = max(self.swipe_max_x, current_x, current_x_out)
            
            dx = self.swipe_end_x - self.swipe_start_x
            dy = self.swipe_end_y - self.swipe_start_y
            
            if abs(dx) > self.swipe_min_distance or abs(dy) > self.swipe_min_distance:
                for zone in self.touch_zones:
                    x = self.swipe_start_x
                    if zone['x'] <= x < zone['x'] + zone['width']:
                        zone_name = zone['name']
                        if zone_name in self.touch_longpress_timers:
                            self.touch_longpress_timers[zone_name].cancel()
                            del self.touch_longpress_timers[zone_name]
                        if zone_name in self.touch_press_times:
                            del self.touch_press_times[zone_name]
                        if zone_name in self.touch_longpress_triggered:
                            del self.touch_longpress_triggered[zone_name]
                        break

            if self.swipe_completion_timer:
                self.swipe_completion_timer.cancel()
            self.swipe_completion_timer = threading.Timer(0.2, self._complete_swipe)
            self.swipe_completion_timer.daemon = True
            self.swipe_completion_timer.start()
            return

        if event_name == "SHORT":
            x = value.get('x', 0)

            if self.swipe_completion_timer:
                self.swipe_completion_timer.cancel()
                self.swipe_completion_timer = None
            
            if self.swipe_in_progress:
                dx = self.swipe_end_x - self.swipe_start_x
                dy = self.swipe_end_y - self.swipe_start_y
                zones_crossed = abs(dx) / 200.0
                
                logging.info(f"Touch released: dx={dx}, dy={dy}, zones={zones_crossed:.1f}")
                
                if abs(dx) > self.swipe_min_distance or abs(dy) > self.swipe_min_distance:
                    self._execute_swipe(dx, dy, zones_crossed)
                    self.swipe_in_progress = False
                    return
                
                self.swipe_in_progress = False
            
            for zone in self.touch_zones:
                if zone['x'] <= x < zone['x'] + zone['width']:
                    zone_name = zone['name']
                    if zone_name in self.touch_longpress_timers:
                        self.touch_longpress_timers[zone_name].cancel()
                        del self.touch_longpress_timers[zone_name]
                    longpress_was_triggered = self.touch_longpress_triggered.get(zone_name, False)
                    if zone_name in self.touch_press_times:
                        del self.touch_press_times[zone_name]
                    if zone_name in self.touch_longpress_triggered:
                        del self.touch_longpress_triggered[zone_name]
                    if not longpress_was_triggered:
                        script = TOUCH_DIR / f"{zone_name}.sh"
                        logging.info(f"Tap on {zone_name}")
                        self.execute_script(script, f"{zone_name.replace('-', ' ').title()} Tap")
                    break

        elif event_name == "LONG":
            x = value.get('x', 0)

            if self.swipe_completion_timer:
                self.swipe_completion_timer.cancel()
                self.swipe_completion_timer = None

            self.swipe_in_progress = False
            
            for zone in self.touch_zones:
                if zone['x'] <= x < zone['x'] + zone['width']:
                    zone_name = zone['name']
                    if zone_name in self.touch_longpress_timers:
                        self.touch_longpress_timers[zone_name].cancel()
                        del self.touch_longpress_timers[zone_name]
                    longpress_was_triggered = self.touch_longpress_triggered.get(zone_name, False)
                    if zone_name in self.touch_press_times:
                        del self.touch_press_times[zone_name]
                    if zone_name in self.touch_longpress_triggered:
                        del self.touch_longpress_triggered[zone_name]
                    if not longpress_was_triggered:
                        script = TOUCH_DIR / f"{zone_name}-longpress.sh"
                        logging.info(f"Long press on {zone_name}")
                        self.execute_script(script, f"{zone_name.replace('-', ' ').title()} Long Press")
                    break

    def _complete_swipe(self):
        if not self.swipe_in_progress:
            return

        dx = self.swipe_end_x - self.swipe_start_x
        dy = self.swipe_end_y - self.swipe_start_y
        total_span = self.swipe_max_x - self.swipe_min_x
        zones_crossed = total_span / 200.0

        if total_span > self.swipe_min_distance or abs(dy) > self.swipe_min_distance:
            self._execute_swipe(dx, dy, zones_crossed)

        self.swipe_in_progress = False
        self.swipe_completion_timer = None

    def _execute_swipe(self, dx, dy, zones_crossed):
        start_x = self.swipe_start_x
        
        is_edge_swipe_right = start_x < 80 and dx > 50
        is_edge_swipe_left = start_x > 720 and dx < -50
        
        if is_edge_swipe_right:
            script = TOUCH_DIR / "longswipe-right.sh"
            logging.info("Long swipe right (from left edge)")
            self.execute_script(script, "Long Swipe Right")
        elif is_edge_swipe_left:
            script = TOUCH_DIR / "longswipe-left.sh"
            logging.info("Long swipe left (from right edge)")
            self.execute_script(script, "Long Swipe Left")
        else:
            x = self.swipe_start_x
            for zone in self.touch_zones:
                if zone['x'] <= x < zone['x'] + zone['width']:
                    zone_title = zone['name'].replace('-', ' ').title()
                    if abs(dx) > abs(dy):
                        if dx > 0:
                            script = TOUCH_DIR / f"{zone['name']}-swipe-right.sh"
                            logging.info(f"Swipe right in {zone['name']}")
                            self.execute_script(script, f"{zone_title} Swipe Right")
                        else:
                            script = TOUCH_DIR / f"{zone['name']}-swipe-left.sh"
                            logging.info(f"Swipe left in {zone['name']}")
                            self.execute_script(script, f"{zone_title} Swipe Left")
                    else:
                        if dy > 0:
                            script = TOUCH_DIR / f"{zone['name']}-swipe-down.sh"
                            logging.info(f"Swipe down in {zone['name']}")
                            self.execute_script(script, f"{zone_title} Swipe Down")
                        else:
                            script = TOUCH_DIR / f"{zone['name']}-swipe-up.sh"
                            logging.info(f"Swipe up in {zone['name']}")
                            self.execute_script(script, f"{zone_title} Swipe Up")
                    break

    def execute_script(self, script_path, action_description=None):
        """Execute a script file if it exists, or create it with template"""
        logging.info(f"ACTION: {script_path.name}")

        if not script_path.exists():
            # Auto-create script with notification template
            self.create_script_template(script_path, action_description)
            logging.info(f"Created template script: {script_path}")
            # Execute the newly created script

        if not os.access(script_path, os.X_OK):
            # Make it executable
            os.chmod(script_path, 0o755)
            logging.info(f"Made executable: {script_path}")

        try:
            subprocess.Popen(
                [str(script_path)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
        except Exception as e:
            logging.error(f"Error executing {script_path}: {e}")

    def create_script_template(self, script_path, action_description):
        """Create a script template with notification"""
        if action_description is None:
            action_description = script_path.stem.replace('-', ' ').title()

        template = f"""#!/bin/bash
# Auto-generated script for: {action_description}
notify-send "Stream Deck" "{action_description}" -t 2000

# Add your commands below:
# Example: firefox &
# Example: xdotool key Super_L+d
"""

        script_path.parent.mkdir(parents=True, exist_ok=True)
        with open(script_path, 'w') as f:
            f.write(template)
        os.chmod(script_path, 0o755)

    def load_image_for_touch_zone(self, zone_name):
        """Load image for touchscreen zone"""
        svg_path = TOUCH_DIR / f"{zone_name}.svg"
        if svg_path.exists():
            img = load_svg_image(svg_path, 200, 100)
            if img:
                return img
        
        for ext in ['.png', '.jpg', '.jpeg']:
            img_path = TOUCH_DIR / f"{zone_name}{ext}"
            if img_path.exists():
                try:
                    img = Image.open(img_path)
                    img = img.convert('RGB')
                    img = resize_with_aspect_ratio(img, 200, 100)
                    return img
                except Exception as e:
                    logging.error(f"Error loading {img_path}: {e}")
        return None

    def load_label_for_touch_zone(self, zone_name):
        """Load text label for touchscreen zone"""
        label_path = TOUCH_DIR / f"{zone_name}.txt"
        if label_path.exists():
            try:
                with open(label_path, 'r') as f:
                    return f.read().strip()
            except Exception as e:
                logging.error(f"Error loading {label_path}: {e}")
        return None

    def load_text_position_for_touch_zone(self, zone_name):
        """Load text position preference for touchscreen zone (top, middle, bottom)"""
        position_path = TOUCH_DIR / f"{zone_name}-position.txt"
        if position_path.exists():
            try:
                with open(position_path, 'r') as f:
                    position = f.read().strip().lower()
                    if position in ['top', 'middle', 'bottom']:
                        return position
            except Exception as e:
                logging.error(f"Error loading {position_path}: {e}")
        return 'middle'  # Default to middle for touchscreen

    def load_font_size_for_touch_zone(self, zone_name):
        """Load font size for touchscreen zone text"""
        fontsize_path = TOUCH_DIR / f"{zone_name}-fontsize.txt"
        if fontsize_path.exists():
            try:
                with open(fontsize_path, 'r') as f:
                    fontsize = int(f.read().strip())
                    if 10 <= fontsize <= 60:
                        return fontsize
            except Exception as e:
                logging.error(f"Error loading {fontsize_path}: {e}")
        return 28  # Default font size for touchscreen

    def check_for_file_changes(self):
        """Check if any image or label files have been added or modified"""
        current_time = time.time()

        # Only check every N seconds
        if current_time - self.last_reload_check < self.reload_check_interval:
            return False

        self.last_reload_check = current_time

        # Get all image and label files
        files_to_check = []

        # Button images, labels, and text positions
        for i in range(1, 9):
            for ext in ['.png', '.jpg', '.jpeg', '.svg', '.txt']:
                files_to_check.append(BUTTONS_DIR / f"button-{i}{ext}")
            files_to_check.append(BUTTONS_DIR / f"button-{i}-position.txt")

        # Touchscreen images, labels, and text positions
        for i in range(1, 5):
            for ext in ['.png', '.jpg', '.jpeg', '.svg', '.txt']:
                files_to_check.append(TOUCH_DIR / f"touch-{i}{ext}")
            files_to_check.append(TOUCH_DIR / f"touch-{i}-position.txt")

        # Check modification times
        changed = False
        for file_path in files_to_check:
            if file_path.exists():
                try:
                    mtime = file_path.stat().st_mtime
                    if str(file_path) not in self.file_mtimes:
                        # New file detected
                        logging.info(f"🔄 New file detected: {file_path.name}")
                        self.file_mtimes[str(file_path)] = mtime
                        changed = True
                    elif self.file_mtimes[str(file_path)] != mtime:
                        # File modified
                        logging.info(f"🔄 File modified: {file_path.name}")
                        self.file_mtimes[str(file_path)] = mtime
                        changed = True
                except Exception as e:
                    logging.debug(f"Error checking {file_path}: {e}")
            else:
                # File was deleted
                if str(file_path) in self.file_mtimes:
                    logging.info(f"🔄 File deleted: {file_path.name}")
                    del self.file_mtimes[str(file_path)]
                    changed = True

        return changed

    def reload_displays(self):
        """Reload all button and touchscreen displays"""
        logging.info("♻️  Reloading displays with updated images and labels...")
        self.update_all_buttons()
        self.update_touchscreen()
        logging.info("✓ Displays reloaded!")

    def update_touchscreen(self):
        """Update the touchscreen LCD with custom images and labels"""
        if not self.deck or not hasattr(self.deck, 'set_touchscreen_image'):
            return

        # Create full touchscreen image
        img = Image.new('RGB', (800, 100), color='#0a0a0a')

        # Draw each zone
        for i, zone in enumerate(self.touch_zones):
            x = zone['x']
            zone_name = zone['name']

            # Try to load custom image for this zone
            zone_img = self.load_image_for_touch_zone(zone_name)
            if zone_img:
                img.paste(zone_img, (x, 0))
            else:
                # No image, draw default background
                draw = ImageDraw.Draw(img)

                # Check if script exists
                script = TOUCH_DIR / f"{zone_name}.sh"
                if script.exists():
                    color = '#1a3a2a'  # Dark green if script exists
                    text_color = '#00ff88'
                else:
                    color = '#1a1a1a'  # Dark gray if no script
                    text_color = '#666666'

                draw.rectangle([(x, 0), (x + 200, 100)], fill=color)

                # Load and draw label
                label = self.load_label_for_touch_zone(zone_name)
                position = self.load_text_position_for_touch_zone(zone_name)

                if label:
                    fontsize = self.load_font_size_for_touch_zone(zone_name)
                    try:
                        font = ImageFont.truetype(
                            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontsize)
                    except:
                        font = ImageFont.load_default()

                    # Wrap text to fit touchscreen zone width (200px)
                    lines = self.wrap_text(label, font, 195)

                    # Calculate line height based on font size
                    line_height = fontsize + 5

                    # Position text based on preference
                    if position == 'top':
                        y_offset = 5
                        for line in lines[:2]:  # Max 2 lines
                            draw.text((x + 100, y_offset), line, fill=text_color, font=font, anchor="mt")
                            y_offset += line_height
                    elif position == 'bottom':
                        y_offset = 95 - (len(lines[:2]) - 1) * line_height
                        for line in lines[:2]:  # Max 2 lines
                            draw.text((x + 100, y_offset), line, fill=text_color, font=font, anchor="mt")
                            y_offset += line_height
                    else:  # middle (default)
                        total_height = len(lines[:2]) * line_height
                        y_offset = 50 - (total_height // 2)
                        for line in lines[:2]:  # Max 2 lines
                            draw.text((x + 100, y_offset), line, fill=text_color, font=font, anchor="mt")
                            y_offset += line_height
                else:
                    # Just show zone number (always centered)
                    try:
                        font = ImageFont.truetype(
                            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
                    except:
                        font = ImageFont.load_default()

                    draw.text((x + 100, 50), f"Zone {i+1}", fill=text_color, font=font, anchor="mm")

        # Draw dark borders around all zones (after all zones are rendered)
        draw = ImageDraw.Draw(img)
        for i, zone in enumerate(self.touch_zones):
            x = zone['x']

            # Draw left border for each zone
            if i > 0:  # Skip leftmost border
                draw.line([(x, 0), (x, 100)], fill='#000000', width=4)

            # Draw right border for last zone
            if i == len(self.touch_zones) - 1:
                draw.line([(x + 200, 0), (x + 200, 100)], fill='#000000', width=4)

        # Send to device
        try:
            buf = BytesIO()
            img.save(buf, format='JPEG', quality=95)
            self.deck.set_touchscreen_image(buf.getvalue(), 0, 0, 800, 100)
        except Exception as e:
            logging.error(f"Error updating touchscreen: {e}")

    def run(self):
        """Main run loop"""
        if not self.connect_device():
            return 1

        self.running = True

        # Update all displays
        logging.info("Updating button displays...")
        self.update_all_buttons()

        logging.info("Updating touchscreen display...")
        self.update_touchscreen()

        logging.info("")
        logging.info("="*60)
        logging.info("Stream Deck Daemon Running - ALL GESTURES ENABLED!")
        logging.info("="*60)
        logging.info("")
        logging.info(f"Actions directory: {ACTIONS_DIR}")
        logging.info("")
        logging.info("Supported gestures:")
        logging.info("  Buttons: button-N.sh")
        logging.info("  Dials: dial-N-cw.sh, dial-N-ccw.sh, dial-N-press.sh, dial-N-longpress.sh")
        logging.info("  Touch tap: touch-N.sh, touch-N-longpress.sh")
        logging.info("  Touch swipe: touch-N-swipe-up/down/left/right.sh")
        logging.info("  Long swipe: longswipe-left.sh, longswipe-right.sh")
        logging.info("")
        logging.info("Long swipe gesture:")
        logging.info("  - Swipe RIGHT: Start from LEFT edge, swipe right quickly")
        logging.info("  - Swipe LEFT: Start from RIGHT edge, swipe left quickly")
        logging.info("")
        logging.info("Customize with images and labels:")
        logging.info("  - Add button-N.png (image for button N)")
        logging.info("  - Add button-N.txt (label for button N)")
        logging.info("  - Add touch-N.png (image for touchscreen zone N)")
        logging.info("  - Add touch-N.txt (label for touchscreen zone N)")
        logging.info("")
        logging.info(f"Log file: {LOG_FILE}")
        logging.info("")
        logging.info("Press Ctrl+C to exit")
        logging.info("="*60)
        logging.info("")

        try:
            while self.running:
                # Check for file changes and reload displays if needed
                if self.check_for_file_changes():
                    self.reload_displays()

                time.sleep(0.1)
        except KeyboardInterrupt:
            logging.info("\nShutting down...")
        finally:
            if self.deck:
                self.deck.reset()
                self.deck.close()

        return 0


def main():
    # Ensure directories exist
    BUTTONS_DIR.mkdir(parents=True, exist_ok=True)
    DIALS_DIR.mkdir(parents=True, exist_ok=True)
    TOUCH_DIR.mkdir(parents=True, exist_ok=True)

    daemon = StreamDeckDaemon()
    return daemon.run()


if __name__ == "__main__":
    sys.exit(main())
