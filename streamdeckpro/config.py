"""Paths and device profiles for the Stream Deck daemon.

SDP_HOME is the repo root; action scripts inherit it via the daemon so they
can source lib/sdp-helpers.sh regardless of their working directory.
"""

from pathlib import Path

# Repo root (this file lives at streamdeckpro/config.py)
SDP_HOME = Path(__file__).resolve().parent.parent
SCRIPT_DIR = SDP_HOME

BUTTONS_DIR = SDP_HOME / "buttons"
DIALS_DIR = SDP_HOME / "dials"
TOUCH_DIR = SDP_HOME / "touchscreen"

# Profiles: profiles/<name>/{buttons,dials,touchscreen}/. The active profile is
# named in PROFILE_FILE; absent/empty/"default" means the legacy top-level dirs.
PROFILES_DIR = SDP_HOME / "profiles"
PROFILE_FILE = SDP_HOME / ".profile"

BRIGHTNESS_FILE = SDP_HOME / ".brightness"
DEVICE_INFO_FILE = SDP_HOME / ".device-info.json"

LOGS_DIR = SDP_HOME / "logs"
LOG_FILE = LOGS_DIR / "daemon.log"

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
