"""Hot-reload watcher: detects image/label changes and brightness updates."""

import time
import logging


class FileWatcher:
    def __init__(self, config, device, redraw=None):
        self.config = config
        self.device = device
        self.redraw = redraw

        self.file_mtimes = {}
        self.last_reload_check = 0
        self.reload_check_interval = 0.5

    def check_for_file_changes(self):
        """Return True if any watched image/label file was added/changed/removed."""
        current_time = time.time()

        if current_time - self.last_reload_check < self.reload_check_interval:
            return False

        self.last_reload_check = current_time

        profile = self.device.device_profile
        buttons_dir = self.config.BUTTONS_DIR
        touch_dir = self.config.TOUCH_DIR

        files_to_check = []

        button_count = profile['buttons'] if profile else 8
        for i in range(1, button_count + 1):
            for ext in ['.png', '.jpg', '.jpeg', '.svg', '.txt']:
                files_to_check.append(buttons_dir / f"button-{i}{ext}")
            files_to_check.append(buttons_dir / f"button-{i}-position.txt")
            files_to_check.append(buttons_dir / f"button-{i}-fontsize.txt")

        if profile and profile.get('touchscreen'):
            zone_count = profile['touchscreen'].get('zones', 4)
            for i in range(1, zone_count + 1):
                for ext in ['.png', '.jpg', '.jpeg', '.svg', '.txt']:
                    files_to_check.append(touch_dir / f"touch-{i}{ext}")
                files_to_check.append(touch_dir / f"touch-{i}-position.txt")
                files_to_check.append(touch_dir / f"touch-{i}-fontsize.txt")

        changed = False
        for file_path in files_to_check:
            if file_path.exists():
                try:
                    mtime = file_path.stat().st_mtime
                    if str(file_path) not in self.file_mtimes:
                        logging.info(f"New file detected: {file_path.name}")
                        self.file_mtimes[str(file_path)] = mtime
                        changed = True
                    elif self.file_mtimes[str(file_path)] != mtime:
                        logging.info(f"File modified: {file_path.name}")
                        self.file_mtimes[str(file_path)] = mtime
                        changed = True
                except Exception as e:
                    logging.debug(f"Error checking {file_path}: {e}")
            else:
                if str(file_path) in self.file_mtimes:
                    logging.info(f"File deleted: {file_path.name}")
                    del self.file_mtimes[str(file_path)]
                    changed = True

        return changed

    def check_brightness_change(self):
        """Apply brightness if the .brightness file changed."""
        device = self.device
        if not device.deck or not device.device_connected:
            return

        brightness_file = self.config.BRIGHTNESS_FILE

        try:
            if brightness_file.exists():
                mtime = brightness_file.stat().st_mtime

                if mtime != device.last_brightness_mtime:
                    device.last_brightness_mtime = mtime

                    try:
                        brightness_hex = brightness_file.read_text().strip()
                        brightness_raw = int(brightness_hex, 16)
                        brightness = round((brightness_raw / 255) * 100)

                        if brightness != device.current_brightness:
                            device.current_brightness = brightness
                            device.deck.set_brightness(brightness)
                            logging.info(f"✓ Brightness changed to {brightness}%")
                    except Exception as e:
                        logging.warning(f"Could not read brightness file: {e}")
        except Exception as e:
            logging.debug(f"Error checking brightness: {e}")

    def reload_displays(self):
        """Reload all button and touchscreen displays via the redraw callback."""
        logging.info("Reloading displays with updated images and labels...")
        if self.redraw:
            self.redraw()
        logging.info("Displays reloaded")
