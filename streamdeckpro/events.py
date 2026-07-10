"""Input event dispatch: buttons, dials, touchscreen taps/swipes/long-press.

EventDispatcher owns the transient press/timer/swipe state and maps each
gesture to an action script, which it runs through the injected
`action_runner(script_path, description)` callable.
"""

import time
import logging
import threading


class EventDispatcher:
    def __init__(self, config, action_runner):
        self.config = config
        self.run = action_runner

        self.device_profile = None
        self.touch_zones = []

        self.dial_press_times = {}
        self.dial_longpress_timers = {}
        self.dial_longpress_triggered = {}

        self.touch_press_times = {}
        self.touch_longpress_timers = {}
        self.touch_longpress_triggered = {}

        self.button_press_times = {}
        self.button_longpress_timers = {}
        self.button_longpress_triggered = {}

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

    def setup_touch_zones(self, device_profile):
        """Configure touchscreen zones based on device profile."""
        self.device_profile = device_profile
        if not device_profile or not device_profile.get("touchscreen"):
            self.touch_zones = []
            return

        ts = device_profile["touchscreen"]
        zone_count = ts.get("zones", 4)
        zone_width = ts["width"] // zone_count

        self.touch_zones = [
            {"x": i * zone_width, "width": zone_width, "name": f"touch-{i+1}"}
            for i in range(zone_count)
        ]
        logging.info(f"Configured {zone_count} touchscreen zones ({zone_width}px each)")

    # --- buttons -------------------------------------------------------------

    def button_callback(self, deck, key, state):
        button_num = key + 1

        if state:  # Pressed down
            self.button_press_times[key] = time.time()
            self.button_longpress_triggered[key] = False

            timer = threading.Timer(0.5, self.trigger_button_longpress, args=(key, button_num))
            timer.daemon = True
            timer.start()
            self.button_longpress_timers[key] = timer

            logging.info(f"Button {button_num} pushed (tracking for long press)")
        else:  # Released
            if key in self.button_longpress_timers:
                self.button_longpress_timers[key].cancel()
                del self.button_longpress_timers[key]

            if key in self.button_press_times:
                longpress_was_triggered = self.button_longpress_triggered.get(key, False)
                del self.button_press_times[key]

                if key in self.button_longpress_triggered:
                    del self.button_longpress_triggered[key]

                if not longpress_was_triggered:
                    script = self.config.BUTTONS_DIR / f"button-{button_num}.sh"
                    logging.info(f"Button {button_num} pressed (short)")
                    self.run(script, f"Button {button_num} Pressed")
                else:
                    logging.info(f"Button {button_num} released (long press already triggered)")

    def trigger_button_longpress(self, key, button_num):
        if key in self.button_press_times and not self.button_longpress_triggered.get(key, False):
            script = self.config.BUTTONS_DIR / f"button-{button_num}-longpress.sh"
            press_duration = time.time() - self.button_press_times[key]
            logging.info(f"Button {button_num} long pressed ({press_duration:.2f}s)")
            self.run(script, f"Button {button_num} Long Press")
            self.button_longpress_triggered[key] = True

    # --- dials ---------------------------------------------------------------

    def trigger_dial_longpress(self, dial, dial_num):
        if dial in self.dial_press_times and not self.dial_longpress_triggered.get(dial, False):
            script = self.config.DIALS_DIR / f"dial-{dial_num}-longpress.sh"
            press_duration = time.time() - self.dial_press_times[dial]
            logging.info(f"Dial {dial_num} long pressed ({press_duration:.2f}s)")
            self.run(script, f"Dial {dial_num} Long Press")
            self.dial_longpress_triggered[dial] = True

    def dial_callback(self, deck, dial, event, value):
        dial_num = dial + 1

        event_name = event.name if hasattr(event, 'name') else str(event)
        logging.debug(f"Dial {dial_num} event: {event_name}, value: {value}")

        if event_name == "TURN":
            if value > 0:
                script = self.config.DIALS_DIR / f"dial-{dial_num}-cw.sh"
                logging.info(f"Dial {dial_num} rotated clockwise")
                self.run(script, f"Dial {dial_num} Rotate CW")
            else:
                script = self.config.DIALS_DIR / f"dial-{dial_num}-ccw.sh"
                logging.info(f"Dial {dial_num} rotated counter-clockwise")
                self.run(script, f"Dial {dial_num} Rotate CCW")

        elif event_name == "PUSH":
            if value:  # pressed down
                self.dial_press_times[dial] = time.time()
                self.dial_longpress_triggered[dial] = False

                timer = threading.Timer(0.5, self.trigger_dial_longpress, args=(dial, dial_num))
                timer.daemon = True
                timer.start()
                self.dial_longpress_timers[dial] = timer

                logging.info(f"Dial {dial_num} pushed (tracking for long press)")
            else:  # released
                if dial in self.dial_longpress_timers:
                    self.dial_longpress_timers[dial].cancel()
                    del self.dial_longpress_timers[dial]

                if dial in self.dial_press_times:
                    longpress_was_triggered = self.dial_longpress_triggered.get(dial, False)
                    del self.dial_press_times[dial]

                    if dial in self.dial_longpress_triggered:
                        del self.dial_longpress_triggered[dial]

                    if not longpress_was_triggered:
                        script = self.config.DIALS_DIR / f"dial-{dial_num}-press.sh"
                        logging.info(f"Dial {dial_num} pressed (short)")
                        self.run(script, f"Dial {dial_num} Press")
                    else:
                        logging.info(f"Dial {dial_num} released (long press already triggered)")

    # --- touchscreen ---------------------------------------------------------

    def trigger_touch_longpress(self, zone_name):
        if zone_name in self.touch_press_times and not self.touch_longpress_triggered.get(zone_name, False):
            script = self.config.TOUCH_DIR / f"{zone_name}-longpress.sh"
            press_duration = time.time() - self.touch_press_times[zone_name]
            logging.info(f"Touchscreen zone {zone_name} long pressed ({press_duration:.2f}s)")
            self.run(script, f"{zone_name.replace('-', ' ').title()} Long Press")
            self.touch_longpress_triggered[zone_name] = True

    def touchscreen_callback(self, deck, event_type, value):
        event_name = event_type.name if hasattr(event_type, 'name') else str(event_type)
        current_time = time.time()

        logging.debug(f"Touchscreen event: {event_name}, value: {value}")

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

                logging.debug(f"Touch released: dx={dx}, dy={dy}, zones={zones_crossed:.1f}")

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
                        script = self.config.TOUCH_DIR / f"{zone_name}.sh"
                        logging.info(f"Tap on {zone_name}")
                        self.run(script, f"{zone_name.replace('-', ' ').title()} Tap")
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
                        script = self.config.TOUCH_DIR / f"{zone_name}-longpress.sh"
                        logging.info(f"Long press on {zone_name}")
                        self.run(script, f"{zone_name.replace('-', ' ').title()} Long Press")
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
            script = self.config.TOUCH_DIR / "longswipe-right.sh"
            logging.info("Long swipe right (from left edge)")
            self.run(script, "Long Swipe Right")
        elif is_edge_swipe_left:
            script = self.config.TOUCH_DIR / "longswipe-left.sh"
            logging.info("Long swipe left (from right edge)")
            self.run(script, "Long Swipe Left")
        else:
            x = self.swipe_start_x
            for zone in self.touch_zones:
                if zone['x'] <= x < zone['x'] + zone['width']:
                    zone_title = zone['name'].replace('-', ' ').title()
                    if abs(dx) > abs(dy):
                        if dx > 0:
                            script = self.config.TOUCH_DIR / f"{zone['name']}-swipe-right.sh"
                            logging.info(f"Swipe right in {zone['name']}")
                            self.run(script, f"{zone_title} Swipe Right")
                        else:
                            script = self.config.TOUCH_DIR / f"{zone['name']}-swipe-left.sh"
                            logging.info(f"Swipe left in {zone['name']}")
                            self.run(script, f"{zone_title} Swipe Left")
                    else:
                        if dy > 0:
                            script = self.config.TOUCH_DIR / f"{zone['name']}-swipe-down.sh"
                            logging.info(f"Swipe down in {zone['name']}")
                            self.run(script, f"{zone_title} Swipe Down")
                        else:
                            script = self.config.TOUCH_DIR / f"{zone['name']}-swipe-up.sh"
                            logging.info(f"Swipe up in {zone['name']}")
                            self.run(script, f"{zone_title} Swipe Up")
                    break
