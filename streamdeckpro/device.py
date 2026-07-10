"""Device connection, profile detection, reconnect, and brightness init."""

import json
import time
import logging

from StreamDeck.DeviceManager import DeviceManager

from .config import (
    DEVICE_PROFILES,
    DEFAULT_PROFILE,
    BRIGHTNESS_FILE,
    DEVICE_INFO_FILE,
    SCRIPT_DIR,
)


class DeviceConnection:
    def __init__(self, config):
        self.config = config
        self.deck = None
        self.device_profile = None
        self.device_type = None
        self.device_connected = False

        self.reconnect_interval = 2.0
        self.last_reconnect_attempt = 0

        # Brightness state (co-located with the deck it applies to)
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

    def connect_device(self, callbacks):
        """Connect to a Stream Deck and register input callbacks.

        `callbacks` exposes button_callback, dial_callback, touchscreen_callback.
        """
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

            brightness = 100
            if BRIGHTNESS_FILE.exists():
                try:
                    brightness_hex = BRIGHTNESS_FILE.read_text().strip()
                    brightness_raw = int(brightness_hex, 16)
                    brightness = round((brightness_raw / 255) * 100)
                    self.last_brightness_mtime = BRIGHTNESS_FILE.stat().st_mtime
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
            logging.error("Diagnose and fix it with:")
            logging.error(f"  cd {SCRIPT_DIR}")
            logging.error("  ./install.sh doctor")
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
            self.deck.set_key_callback(callbacks.button_callback)
            logging.info("Button callbacks registered")

        if hasattr(self.deck, 'set_dial_callback') and self.device_profile['dials'] > 0:
            self.deck.set_dial_callback(callbacks.dial_callback)
            logging.info("Dial callbacks registered")

        if hasattr(self.deck, 'set_touchscreen_callback') and self.device_profile['touchscreen']:
            self.deck.set_touchscreen_callback(callbacks.touchscreen_callback)
            logging.info("Touchscreen callbacks registered")

        self.device_connected = True
        return True

    def is_device_connected(self):
        if not self.deck:
            return False

        try:
            if hasattr(self.deck, 'connected') and callable(self.deck.connected):
                return self.deck.connected()
            elif hasattr(self.deck, 'is_open') and callable(self.deck.is_open):
                return self.deck.is_open()
            return True
        except Exception as e:
            logging.debug(f"Device connection check failed: {e}")
            return False

    def check_device_presence(self):
        """Check if any Stream Deck device is present via USB enumeration"""
        try:
            decks = DeviceManager().enumerate()
            return len(decks) > 0
        except Exception as e:
            logging.debug(f"Device enumeration failed: {e}")
            return False

    def disconnect_device(self):
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

    def attempt_reconnect(self, callbacks, on_reconnect=None):
        """Attempt to reconnect; on success call on_reconnect() to redraw."""
        current_time = time.time()

        if current_time - self.last_reconnect_attempt < self.reconnect_interval:
            return False

        self.last_reconnect_attempt = current_time

        if self.deck:
            self.disconnect_device()

        logging.info("Attempting to reconnect to Stream Deck...")

        try:
            if self.connect_device(callbacks):
                logging.info("✓ Successfully reconnected to Stream Deck!")
                if on_reconnect:
                    on_reconnect()
                return True
            else:
                logging.debug("Reconnection attempt failed - no device found")
                return False
        except Exception as e:
            logging.debug(f"Reconnection attempt failed: {e}")
            return False

    def save_device_info(self):
        """Save detected device info for the configurator to read"""
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
            "profile": self.device_profile,
        }
        try:
            with open(DEVICE_INFO_FILE, 'w') as f:
                json.dump(info, f, indent=2)
        except Exception as e:
            logging.warning(f"Could not save device info: {e}")

    def get_button_size(self):
        if self.device_profile:
            return self.device_profile['button_size']
        return (120, 120)

    def get_touch_zone_size(self):
        if self.device_profile and self.device_profile.get('touchscreen'):
            ts = self.device_profile['touchscreen']
            zone_count = ts.get('zones', 4)
            zone_width = ts['width'] // zone_count
            return (zone_width, ts['height'])
        return (200, 100)
