#!/usr/bin/env python3
"""
Stream Deck Daemon - Universal Script Executor
Supports ALL Stream Deck models: Mini, Original, MK.2, XL, Plus, Pedal, Neo

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
import json
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

# Device profiles for all Stream Deck models
DEVICE_PROFILES = {
    "Stream Deck Mini": {
        "buttons": 6,
        "button_layout": (3, 2),  # cols x rows
        "button_size": (80, 80),
        "dials": 0,
        "touchscreen": None,
        "pedals": 0,
    },
    "Stream Deck": {
        "buttons": 15,
        "button_layout": (5, 3),
        "button_size": (72, 72),
        "dials": 0,
        "touchscreen": None,
        "pedals": 0,
    },
    "Stream Deck MK.2": {
        "buttons": 15,
        "button_layout": (5, 3),
        "button_size": (72, 72),
        "dials": 0,
        "touchscreen": None,
        "pedals": 0,
    },
    "Stream Deck XL": {
        "buttons": 32,
        "button_layout": (8, 4),
        "button_size": (96, 96),
        "dials": 0,
        "touchscreen": None,
        "pedals": 0,
    },
    "Stream Deck +": {
        "buttons": 8,
        "button_layout": (4, 2),
        "button_size": (120, 120),
        "dials": 4,
        "touchscreen": {"width": 800, "height": 100, "zones": 4},
        "pedals": 0,
    },
    "Stream Deck Plus": {
        "buttons": 8,
        "button_layout": (4, 2),
        "button_size": (120, 120),
        "dials": 4,
        "touchscreen": {"width": 800, "height": 100, "zones": 4},
        "pedals": 0,
    },
    "Stream Deck Pedal": {
        "buttons": 0,
        "button_layout": (0, 0),
        "button_size": (0, 0),
        "dials": 0,
        "touchscreen": None,
        "pedals": 3,
    },
    "Stream Deck Neo": {
        "buttons": 8,
        "button_layout": (4, 2),
        "button_size": (96, 96),
        "dials": 0,
        "touchscreen": {"width": 248, "height": 58, "zones": 2, "type": "info_strip"},
        "pedals": 0,
    },
}

# Default profile for unknown devices
DEFAULT_PROFILE = {
    "buttons": 15,
    "button_layout": (5, 3),
    "button_size": (72, 72),
    "dials": 0,
    "touchscreen": None,
    "pedals": 0,
}

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
ACTIONS_DIR = Path(__file__).parent.resolve()
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
    """Universal daemon supporting all Stream Deck models"""

    def __init__(self):
        self.deck = None
        self.running = False
        self.device_profile = None
        self.device_type = None
        self.device_connected = False
        self.reconnect_interval = 2.0
        self.last_reconnect_attempt = 0
        self.last_device_check = 0
        self.device_check_interval = 2.0  # Check for device presence every 2 seconds

        self.touch_zones = []

        self.dial_press_times = {}
        self.dial_longpress_timers = {}
        self.dial_longpress_triggered = {}

        self.touch_press_times = {}
        self.touch_longpress_timers = {}
        self.touch_longpress_triggered = {}

        self.last_swipe_time = 0
        self.swipe_debounce_delay = 0.3
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
        self.swipe_completion_timer = None

        self.file_mtimes = {}
        self.last_reload_check = 0
        self.reload_check_interval = 0.5

        # Brightness monitoring
        self.last_brightness_mtime = 0
        self.current_brightness = 100
    
    def get_device_profile(self, deck_type):
        """Get configuration profile for the detected device"""
        deck_lower = deck_type.lower()
        
        if deck_lower in [name.lower() for name in DEVICE_PROFILES]:
            for name, profile in DEVICE_PROFILES.items():
                if name.lower() == deck_lower:
                    logging.info(f"Device profile matched (exact): {name}")
                    return name, profile
        
        sorted_profiles = sorted(DEVICE_PROFILES.items(), key=lambda x: len(x[0]), reverse=True)
        for name, profile in sorted_profiles:
            if name.lower() in deck_lower or deck_lower in name.lower():
                logging.info(f"Device profile matched: {name}")
                return name, profile
        
        logging.warning(f"Unknown device '{deck_type}', using default profile")
        return deck_type, DEFAULT_PROFILE
    
    def setup_touch_zones(self):
        """Configure touchscreen zones based on device profile"""
        if not self.device_profile or not self.device_profile.get("touchscreen"):
            self.touch_zones = []
            return
        
        ts = self.device_profile["touchscreen"]
        zone_count = ts.get("zones", 4)
        zone_width = ts["width"] // zone_count
        
        self.touch_zones = [
            {"x": i * zone_width, "width": zone_width, "name": f"touch-{i+1}"}
            for i in range(zone_count)
        ]
        logging.info(f"Configured {zone_count} touchscreen zones ({zone_width}px each)")

    def connect_device(self):
        """Connect to Stream Deck and configure based on device type"""
        logging.info("Searching for Stream Deck devices...")
        dm = DeviceManager()
        decks = dm.enumerate()

        if len(decks) == 0:
            logging.error("No Stream Deck found!")
            logging.error("Make sure your device is connected and you have proper permissions.")
            logging.error("Try: sudo chmod 666 /dev/hidraw*")
            return False
        
        if len(decks) > 1:
            logging.info(f"Found {len(decks)} Stream Deck devices:")
            for i, d in enumerate(decks):
                d.open()
                logging.info(f"  [{i}] {d.deck_type()} (Serial: {d.get_serial_number()})")
                d.close()
            logging.info("Using first device. Multi-device support coming soon!")

        self.deck = decks[0]
        self.deck.open()

        try:
            self.deck.reset()

            # Read brightness setting from file if it exists
            brightness = 100  # Default brightness percentage (0-100)
            brightness_file = ACTIONS_DIR / '.brightness'
            if brightness_file.exists():
                try:
                    brightness_hex = brightness_file.read_text().strip()
                    # Convert hex value (0-FF) to 0-255, then to percentage (0-100)
                    brightness_raw = int(brightness_hex, 16)
                    brightness = round((brightness_raw / 255) * 100)
                    self.last_brightness_mtime = brightness_file.stat().st_mtime
                    logging.info(f"Loaded brightness setting: {brightness}% (raw: {brightness_raw})")
                except Exception as e:
                    logging.warning(f"Could not read brightness file: {e}")
                    brightness = 100

            self.current_brightness = brightness
            self.deck.set_brightness(brightness)
        except Exception as e:
            logging.error(f"Failed to reset device: {e}")
            logging.error("")
            logging.error("=" * 70)
            logging.error("USB PERMISSIONS ERROR")
            logging.error("=" * 70)
            logging.error("")
            logging.error("The Stream Deck device was found but cannot be accessed properly.")
            logging.error("This is usually a USB permissions issue.")
            logging.error("")
            logging.error("To fix this, run the USB permissions setup script:")
            logging.error(f"  cd {ACTIONS_DIR}")
            logging.error("  ./setup-udev-rules.sh")
            logging.error("")
            logging.error("Then unplug and replug your Stream Deck, or run:")
            logging.error("  sudo chmod 666 /dev/hidraw*")
            logging.error("")
            logging.error("=" * 70)
            logging.error("")
            if self.deck:
                try:
                    self.deck.close()
                except Exception:
                    pass
            return False
        
        self.device_type, self.device_profile = self.get_device_profile(self.deck.deck_type())
        self.setup_touch_zones()
        
        self.save_device_info()

        logging.info(f"Connected to: {self.device_type}")
        logging.info(f"  Buttons: {self.device_profile['buttons']}")
        if self.device_profile['dials'] > 0:
            logging.info(f"  Dials: {self.device_profile['dials']}")
        if self.device_profile['touchscreen']:
            ts = self.device_profile['touchscreen']
            logging.info(f"  Touchscreen: {ts['width']}x{ts['height']} ({ts['zones']} zones)")
        if self.device_profile['pedals'] > 0:
            logging.info(f"  Pedals: {self.device_profile['pedals']}")

        if hasattr(self.deck, 'set_key_callback') and self.device_profile['buttons'] > 0:
            self.deck.set_key_callback(self.button_callback)
            logging.info("Button callbacks registered")

        if hasattr(self.deck, 'set_dial_callback') and self.device_profile['dials'] > 0:
            self.deck.set_dial_callback(self.dial_callback)
            logging.info("Dial callbacks registered")

        if hasattr(self.deck, 'set_touchscreen_callback') and self.device_profile['touchscreen']:
            self.deck.set_touchscreen_callback(self.touchscreen_callback)
            logging.info("Touchscreen callbacks registered")

        self.device_connected = True
        return True

    def is_device_connected(self):
        """Check if the Stream Deck device is still connected"""
        if not self.deck:
            return False

        try:
            # Try to check if device is still responsive
            if hasattr(self.deck, 'connected') and callable(self.deck.connected):
                return self.deck.connected()
            elif hasattr(self.deck, 'is_open') and callable(self.deck.is_open):
                return self.deck.is_open()
            # Fallback: assume connected if we have a deck object
            return True
        except Exception as e:
            logging.debug(f"Device connection check failed: {e}")
            return False

    def check_device_presence(self):
        """Actively check if any Stream Deck device is present via USB enumeration"""
        try:
            decks = DeviceManager().enumerate()
            return len(decks) > 0
        except Exception as e:
            logging.debug(f"Device enumeration failed: {e}")
            return False

    def disconnect_device(self):
        """Safely disconnect from the device"""
        if self.deck:
            try:
                self.deck.reset()
                self.deck.close()
                logging.info("Device disconnected safely")
            except Exception as e:
                logging.debug(f"Error during disconnect: {e}")
            finally:
                self.deck = None
                self.device_connected = False

    def attempt_reconnect(self):
        """Attempt to reconnect to the Stream Deck device"""
        current_time = time.time()

        # Rate limit reconnection attempts
        if current_time - self.last_reconnect_attempt < self.reconnect_interval:
            return False

        self.last_reconnect_attempt = current_time

        # Clean up existing connection
        if self.deck:
            self.disconnect_device()

        logging.info("Attempting to reconnect to Stream Deck...")

        try:
            if self.connect_device():
                logging.info("✓ Successfully reconnected to Stream Deck!")
                # Reload displays after reconnection
                self.update_all_buttons()
                self.update_touchscreen()
                return True
            else:
                logging.debug("Reconnection attempt failed - no device found")
                return False
        except Exception as e:
            logging.debug(f"Reconnection attempt failed: {e}")
            return False

    def check_brightness_change(self):
        """Check if brightness file has changed and apply new brightness"""
        if not self.deck or not self.device_connected:
            return

        brightness_file = ACTIONS_DIR / '.brightness'

        try:
            if brightness_file.exists():
                mtime = brightness_file.stat().st_mtime

                # Check if file has been modified
                if mtime != self.last_brightness_mtime:
                    self.last_brightness_mtime = mtime

                    try:
                        brightness_hex = brightness_file.read_text().strip()
                        # Convert hex value (0-FF) to 0-255, then to percentage (0-100)
                        brightness_raw = int(brightness_hex, 16)
                        brightness = round((brightness_raw / 255) * 100)

                        # Only apply if brightness has actually changed
                        if brightness != self.current_brightness:
                            self.current_brightness = brightness
                            self.deck.set_brightness(brightness)
                            logging.info(f"✓ Brightness changed to {brightness}%")
                    except Exception as e:
                        logging.warning(f"Could not read brightness file: {e}")
        except Exception as e:
            logging.debug(f"Error checking brightness: {e}")

    def save_device_info(self):
        """Save detected device info for configurator to read"""
        if not self.deck:
            return
            
        serial = None
        firmware = None
        try:
            serial = self.deck.get_serial_number()
        except Exception:
            pass
        try:
            firmware = self.deck.get_firmware_version()
        except Exception:
            pass
            
        info = {
            "device_type": self.device_type,
            "serial": serial,
            "firmware": firmware,
            "profile": self.device_profile
        }
        info_path = ACTIONS_DIR / ".device-info.json"
        try:
            with open(info_path, 'w') as f:
                json.dump(info, f, indent=2)
        except Exception as e:
            logging.warning(f"Could not save device info: {e}")

    def get_button_size(self):
        """Get button dimensions from device profile"""
        if self.device_profile:
            return self.device_profile['button_size']
        return (120, 120)
    
    def load_image_for_button(self, button_num):
        """Load custom image for a button, or create default"""
        btn_w, btn_h = self.get_button_size()
        
        svg_path = BUTTONS_DIR / f"button-{button_num}.svg"
        if svg_path.exists():
            img = load_svg_image(svg_path, btn_w, btn_h)
            if img:
                return img
        
        for ext in ['.png', '.jpg', '.jpeg']:
            img_path = BUTTONS_DIR / f"button-{button_num}{ext}"
            if img_path.exists():
                try:
                    img = Image.open(img_path)
                    img = img.convert('RGB')
                    img = resize_with_aspect_ratio(img, btn_w, btn_h)
                    return img
                except Exception as e:
                    logging.error(f"Error loading {img_path}: {e}")

        img = Image.new('RGB', (btn_w, btn_h), color='#1a1a1a')
        draw = ImageDraw.Draw(img)

        font_size = max(24, btn_w // 3)
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()

        draw.text((btn_w // 2, btn_h // 2), str(button_num), fill='#666666', font=font, anchor="mm")

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
        btn_w, btn_h = self.get_button_size()

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

            # Wrap text to fit button width (with small margin)
            lines = self.wrap_text(label, font, btn_w - 5)

            # Calculate line height based on font size
            line_height = fontsize + 5
            center_x = btn_w // 2
            center_y = btn_h // 2

            # Position text based on preference
            if position == 'top':
                # Draw at top
                bg_height = len(lines) * line_height + 5
                draw.rectangle([(0, 0), (btn_w, bg_height)], fill='#000000dd')

                y_offset = 5
                for line in lines:
                    draw.text((center_x, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                    y_offset += line_height

            elif position == 'middle':
                # Draw in middle
                total_height = len(lines) * line_height
                start_y = center_y - (total_height // 2)
                draw.rectangle([(0, start_y - 5), (btn_w, start_y + total_height + 5)], fill='#000000dd')

                y_offset = start_y
                for line in lines:
                    draw.text((center_x, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                    y_offset += line_height

            else:  # bottom (default)
                # Draw at bottom
                bg_height = len(lines) * line_height + 5
                draw.rectangle([(0, btn_h - bg_height), (btn_w, btn_h)], fill='#000000dd')

                y_offset = btn_h - bg_height + 5
                for line in lines:
                    draw.text((center_x, y_offset), line, fill='#ffffff', font=font, anchor="mt")
                    y_offset += line_height

        return img

    def update_all_buttons(self):
        """Update all button displays"""
        if not self.deck or not hasattr(self.deck, 'set_key_image'):
            return

        if not self.device_profile or self.device_profile['buttons'] == 0:
            return

        try:
            key_count = min(self.deck.key_count(), self.device_profile['buttons'])
            for key in range(key_count):
                button_num = key + 1
                img = self.render_button(button_num)

                buf = BytesIO()
                img.save(buf, format='JPEG', quality=95)

                try:
                    self.deck.set_key_image(key, buf.getvalue())
                except Exception as e:
                    logging.error(f"Error setting button {button_num} image: {e}")
                    # Mark device as disconnected on communication error
                    if self.device_connected and ("hid" in str(e).lower() or "device" in str(e).lower() or "usb" in str(e).lower()):
                        logging.warning("USB communication error detected - device may be disconnected")
                        self.device_connected = False
                    raise
        except Exception as e:
            logging.error(f"Error updating buttons: {e}")
            self.device_connected = False

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
        
        ts_width = 800
        if self.device_profile and self.device_profile.get('touchscreen'):
            ts_width = self.device_profile['touchscreen']['width']
        
        edge_threshold = ts_width // 10
        is_edge_swipe_right = start_x < edge_threshold and dx > 50
        is_edge_swipe_left = start_x > (ts_width - edge_threshold) and dx < -50
        
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

    def get_touch_zone_size(self):
        """Get touchscreen zone dimensions from device profile"""
        if self.device_profile and self.device_profile.get('touchscreen'):
            ts = self.device_profile['touchscreen']
            zone_count = ts.get('zones', 4)
            zone_width = ts['width'] // zone_count
            return (zone_width, ts['height'])
        return (200, 100)
    
    def load_image_for_touch_zone(self, zone_name):
        """Load image for touchscreen zone"""
        zone_w, zone_h = self.get_touch_zone_size()
        
        svg_path = TOUCH_DIR / f"{zone_name}.svg"
        if svg_path.exists():
            img = load_svg_image(svg_path, zone_w, zone_h)
            if img:
                return img
        
        for ext in ['.png', '.jpg', '.jpeg']:
            img_path = TOUCH_DIR / f"{zone_name}{ext}"
            if img_path.exists():
                try:
                    img = Image.open(img_path)
                    img = img.convert('RGB')
                    img = resize_with_aspect_ratio(img, zone_w, zone_h)
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

        if current_time - self.last_reload_check < self.reload_check_interval:
            return False

        self.last_reload_check = current_time

        files_to_check = []

        button_count = self.device_profile['buttons'] if self.device_profile else 8
        for i in range(1, button_count + 1):
            for ext in ['.png', '.jpg', '.jpeg', '.svg', '.txt']:
                files_to_check.append(BUTTONS_DIR / f"button-{i}{ext}")
            files_to_check.append(BUTTONS_DIR / f"button-{i}-position.txt")
            files_to_check.append(BUTTONS_DIR / f"button-{i}-fontsize.txt")

        if self.device_profile and self.device_profile.get('touchscreen'):
            zone_count = self.device_profile['touchscreen'].get('zones', 4)
            for i in range(1, zone_count + 1):
                for ext in ['.png', '.jpg', '.jpeg', '.svg', '.txt']:
                    files_to_check.append(TOUCH_DIR / f"touch-{i}{ext}")
                files_to_check.append(TOUCH_DIR / f"touch-{i}-position.txt")
                files_to_check.append(TOUCH_DIR / f"touch-{i}-fontsize.txt")

        changed = False
        for file_path in files_to_check:
            if file_path.exists():
                try:
                    mtime = file_path.stat().st_mtime
                    if str(file_path) not in self.file_mtimes:
                        logging.info(f"🔄 New file detected: {file_path.name}")
                        self.file_mtimes[str(file_path)] = mtime
                        changed = True
                    elif self.file_mtimes[str(file_path)] != mtime:
                        logging.info(f"🔄 File modified: {file_path.name}")
                        self.file_mtimes[str(file_path)] = mtime
                        changed = True
                except Exception as e:
                    logging.debug(f"Error checking {file_path}: {e}")
            else:
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
        
        if not self.device_profile or not self.device_profile.get('touchscreen'):
            return
        
        ts = self.device_profile['touchscreen']
        ts_width = ts['width']
        ts_height = ts['height']
        zone_w, zone_h = self.get_touch_zone_size()

        img = Image.new('RGB', (ts_width, ts_height), color='#0a0a0a')

        for i, zone in enumerate(self.touch_zones):
            x = zone['x']
            zone_name = zone['name']

            zone_img = self.load_image_for_touch_zone(zone_name)
            if zone_img:
                img.paste(zone_img, (x, 0))
            else:
                draw = ImageDraw.Draw(img)

                script = TOUCH_DIR / f"{zone_name}.sh"
                if script.exists():
                    color = '#1a3a2a'
                    text_color = '#00ff88'
                else:
                    color = '#1a1a1a'
                    text_color = '#666666'

                draw.rectangle([(x, 0), (x + zone_w, ts_height)], fill=color)

                label = self.load_label_for_touch_zone(zone_name)
                position = self.load_text_position_for_touch_zone(zone_name)
                center_x = x + zone_w // 2
                center_y = ts_height // 2

                if label:
                    fontsize = self.load_font_size_for_touch_zone(zone_name)
                    try:
                        font = ImageFont.truetype(
                            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontsize)
                    except:
                        font = ImageFont.load_default()

                    lines = self.wrap_text(label, font, zone_w - 5)
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
                        font = ImageFont.truetype(
                            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
                    except:
                        font = ImageFont.load_default()

                    draw.text((center_x, center_y), f"Zone {i+1}", fill=text_color, font=font, anchor="mm")

        draw = ImageDraw.Draw(img)
        for i, zone in enumerate(self.touch_zones):
            x = zone['x']

            if i > 0:
                draw.line([(x, 0), (x, ts_height)], fill='#000000', width=4)

            if i == len(self.touch_zones) - 1:
                draw.line([(x + zone_w, 0), (x + zone_w, ts_height)], fill='#000000', width=4)

        try:
            buf = BytesIO()
            img.save(buf, format='JPEG', quality=95)
            self.deck.set_touchscreen_image(buf.getvalue(), 0, 0, ts_width, ts_height)
        except Exception as e:
            logging.error(f"Error updating touchscreen: {e}")
            # Mark device as disconnected on communication error
            if self.device_connected and ("hid" in str(e).lower() or "device" in str(e).lower() or "usb" in str(e).lower()):
                logging.warning("USB communication error detected - device may be disconnected")
                self.device_connected = False

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
        logging.info(f"Stream Deck Daemon Running - {self.device_type or 'Unknown Device'}")
        logging.info("="*60)
        logging.info("")
        logging.info(f"Actions directory: {ACTIONS_DIR}")
        logging.info("")
        logging.info("Supported gestures for this device:")
        
        profile = self.device_profile or DEFAULT_PROFILE
        
        if profile['buttons'] > 0:
            logging.info(f"  Buttons (1-{profile['buttons']}): button-N.sh")
        
        if profile['dials'] > 0:
            logging.info(f"  Dials (1-{profile['dials']}): dial-N-cw.sh, dial-N-ccw.sh, dial-N-press.sh, dial-N-longpress.sh")
        
        if profile.get('touchscreen'):
            zones = profile['touchscreen'].get('zones', 4)
            logging.info(f"  Touch zones (1-{zones}): touch-N.sh, touch-N-longpress.sh")
            logging.info("  Touch swipe: touch-N-swipe-up/down/left/right.sh")
            logging.info("  Long swipe: longswipe-left.sh, longswipe-right.sh")
        
        if profile['pedals'] > 0:
            logging.info(f"  Pedals (1-{profile['pedals']}): pedal-N.sh")
        
        logging.info("")
        logging.info("Customize with images and labels:")
        if profile['buttons'] > 0:
            logging.info("  - Add button-N.png/svg (image for button N)")
            logging.info("  - Add button-N.txt (label for button N)")
        if profile.get('touchscreen'):
            logging.info("  - Add touch-N.png/svg (image for touchscreen zone N)")
            logging.info("  - Add touch-N.txt (label for touchscreen zone N)")
        logging.info("")
        logging.info(f"Log file: {LOG_FILE}")
        logging.info("")
        logging.info("Press Ctrl+C to exit")
        logging.info("="*60)
        logging.info("")

        try:
            while self.running:
                current_time = time.time()

                # Periodically check if device is still physically present
                if current_time - self.last_device_check >= self.device_check_interval:
                    self.last_device_check = current_time

                    # Check if device is present via USB enumeration
                    device_present = self.check_device_presence()

                    # If we think we're connected but device is not present, mark as disconnected
                    if self.device_connected and not device_present:
                        logging.warning("⚠ Device unplugged - detected via USB enumeration")
                        self.device_connected = False
                        if self.deck:
                            try:
                                self.deck.close()
                            except Exception:
                                pass
                            self.deck = None

                    # If we think we're disconnected but device is present, try to reconnect
                    if not self.device_connected and device_present:
                        logging.info("✓ Device detected - attempting reconnection...")
                        if self.attempt_reconnect():
                            logging.info("✓ Successfully reconnected after replug!")

                # Check if device is still connected
                if not self.device_connected:
                    # Device is disconnected, try to reconnect
                    if self.attempt_reconnect():
                        logging.info("✓ Device reconnected successfully!")
                    else:
                        # Wait before next iteration if reconnection failed
                        time.sleep(1.0)
                        continue

                # Check for file changes and reload displays if needed
                try:
                    if self.check_for_file_changes():
                        self.reload_displays()
                except Exception as e:
                    logging.error(f"Error checking file changes: {e}")
                    # Don't mark as disconnected for file system errors

                # Check for brightness changes
                try:
                    self.check_brightness_change()
                except Exception as e:
                    logging.error(f"Error checking brightness: {e}")

                time.sleep(0.5)
        except KeyboardInterrupt:
            logging.info("\nShutting down...")
        finally:
            if self.deck:
                try:
                    self.deck.reset()
                    self.deck.close()
                except Exception as e:
                    logging.debug(f"Error during shutdown: {e}")

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
