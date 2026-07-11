"""Orchestrator: composes device, events, rendering, and the watcher."""

import sys
import time
import logging
from io import BytesIO

from PIL import Image  # noqa: F401 (kept for parity / future use)

from . import config
from . import rendering
from . import actions
from .logging_setup import setup_logging
from .device import DeviceConnection
from .events import EventDispatcher
from .watcher import FileWatcher
from .profiles import ProfileManager


class StreamDeckDaemon:
    """Universal daemon supporting all Stream Deck models."""

    def __init__(self):
        self.config = config
        self.paths = ProfileManager(config)
        self.running = False

        self.device = DeviceConnection(config)
        self.events = EventDispatcher(self.paths, actions.execute_script)
        self.watcher = FileWatcher(self.paths, self.device, redraw=self.redraw_all)

        self.last_device_check = 0
        self.device_check_interval = 2.0

    # --- rendering -----------------------------------------------------------

    def redraw_all(self):
        self.update_all_buttons()
        self.update_touchscreen()

    def update_all_buttons(self):
        deck = self.device.deck
        profile = self.device.device_profile

        if not deck or not hasattr(deck, 'set_key_image'):
            return
        if not profile or profile['buttons'] == 0:
            return

        try:
            key_count = min(deck.key_count(), profile['buttons'])
            for key in range(key_count):
                button_num = key + 1
                img = rendering.render_button(button_num, self.paths.BUTTONS_DIR, self.device.get_button_size())

                buf = BytesIO()
                img.save(buf, format='JPEG', quality=95)

                try:
                    deck.set_key_image(key, buf.getvalue())
                except Exception as e:
                    logging.error(f"Error setting button {button_num} image: {e}")
                    if self.device.device_connected and ("hid" in str(e).lower() or "device" in str(e).lower() or "usb" in str(e).lower()):
                        logging.warning("USB communication error detected - device may be disconnected")
                        self.device.device_connected = False
                    raise
        except Exception as e:
            logging.error(f"Error updating buttons: {e}")
            self.device.device_connected = False

    def update_touchscreen(self):
        deck = self.device.deck
        profile = self.device.device_profile

        if not deck or not hasattr(deck, 'set_touchscreen_image'):
            return
        if not profile or not profile.get('touchscreen'):
            return

        ts = profile['touchscreen']
        ts_width = ts['width']
        ts_height = ts['height']
        zone_size = self.device.get_touch_zone_size()

        img = rendering.compose_touchscreen(
            self.events.touch_zones, self.paths.TOUCH_DIR, ts_width, ts_height, zone_size
        )

        try:
            buf = BytesIO()
            img.save(buf, format='JPEG', quality=95)
            deck.set_touchscreen_image(buf.getvalue(), 0, 0, ts_width, ts_height)
        except Exception as e:
            logging.error(f"Error updating touchscreen: {e}")
            if self.device.device_connected and ("hid" in str(e).lower() or "device" in str(e).lower() or "usb" in str(e).lower()):
                logging.warning("USB communication error detected - device may be disconnected")
                self.device.device_connected = False

    # --- connection ----------------------------------------------------------

    def _after_connect(self):
        self.events.setup_touch_zones(self.device.device_profile)

    def connect(self):
        if self.device.connect_device(self.events):
            self._after_connect()
            return True
        return False

    def attempt_reconnect(self):
        def on_reconnect():
            self._after_connect()
            self.redraw_all()

        return self.device.attempt_reconnect(self.events, on_reconnect=on_reconnect)

    # --- main loop -----------------------------------------------------------

    def run(self):
        if not self.connect():
            return 1

        self.running = True

        logging.info("Updating button displays...")
        self.update_all_buttons()

        logging.info("Updating touchscreen display...")
        self.update_touchscreen()

        profile = self.device.device_profile or config.DEFAULT_PROFILE

        logging.info("")
        logging.info("=" * 60)
        logging.info(f"Stream Deck Daemon Running - {self.device.device_type or 'Unknown Device'}")
        logging.info("=" * 60)
        logging.info("")
        logging.info(f"Actions directory: {config.SCRIPT_DIR}")
        logging.info("")
        logging.info("Supported gestures for this device:")

        if profile['buttons'] > 0:
            logging.info(f"  Buttons (1-{profile['buttons']}): button-N.sh, button-N-longpress.sh")
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
        logging.info("Press Ctrl+C to exit")
        logging.info("=" * 60)
        logging.info("")

        try:
            while self.running:
                current_time = time.time()

                if current_time - self.last_device_check >= self.device_check_interval:
                    self.last_device_check = current_time

                    device_present = self.device.check_device_presence()

                    if self.device.device_connected and not device_present:
                        logging.warning("Device unplugged - detected via USB enumeration")
                        self.device.device_connected = False
                        if self.device.deck:
                            try:
                                self.device.deck.close()
                            except Exception:
                                pass
                            self.device.deck = None

                    if not self.device.device_connected and device_present:
                        logging.info("Device detected - attempting reconnection...")
                        if self.attempt_reconnect():
                            logging.info("✓ Successfully reconnected after replug!")

                if not self.device.device_connected:
                    if self.attempt_reconnect():
                        logging.info("✓ Device reconnected successfully!")
                    else:
                        time.sleep(1.0)
                        continue

                try:
                    if self.watcher.check_for_file_changes():
                        self.watcher.reload_displays()
                except Exception as e:
                    logging.error(f"Error checking file changes: {e}")

                try:
                    self.watcher.check_brightness_change()
                except Exception as e:
                    logging.error(f"Error checking brightness: {e}")

                try:
                    self.watcher.check_profile_change()
                except Exception as e:
                    logging.error(f"Error checking profile: {e}")

                time.sleep(0.5)
        except KeyboardInterrupt:
            logging.info("Shutting down...")
        finally:
            if self.device.deck:
                try:
                    self.device.deck.reset()
                    self.device.deck.close()
                except Exception as e:
                    logging.debug(f"Error during shutdown: {e}")

        return 0


def main():
    setup_logging()

    config.BUTTONS_DIR.mkdir(parents=True, exist_ok=True)
    config.DIALS_DIR.mkdir(parents=True, exist_ok=True)
    config.TOUCH_DIR.mkdir(parents=True, exist_ok=True)

    daemon = StreamDeckDaemon()
    return daemon.run()


if __name__ == "__main__":
    sys.exit(main())
