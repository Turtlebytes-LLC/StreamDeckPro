"""Optional app-aware profile switcher (opt-in sidecar).

Polls the focused window class and switches the active profile to match a
user mapping. Runs as a standalone process, NOT inside the daemon loop, so a
flaky window-manager query can never stall the deck:

    python -m streamdeckpro.appswitch [--config app-profiles.conf] [--interval 1.0]

Mapping file (app-profiles.conf), one rule per line:

    # window_class = profile
    firefox   = web
    code      = dev

Detection tries Hyprland (hyprctl) first, then X11 (xdotool). The pure mapping
logic (load_mapping / resolve_profile / decide_switch) has no dependency on a
window manager and is unit tested; detection is monkeypatched in tests.
"""

import sys
import time
import logging
import argparse
import subprocess

from . import config


def load_mapping(path):
    """Parse `window_class = profile` lines into a dict. Ignores blanks/#."""
    mapping = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                cls, profile = line.split("=", 1)
                cls, profile = cls.strip(), profile.strip()
                if cls and profile:
                    mapping[cls] = profile
    except FileNotFoundError:
        logging.warning(f"App-profile mapping not found: {path}")
    return mapping


def _run(argv):
    """Run a command, return stripped stdout or None on any failure."""
    try:
        out = subprocess.run(argv, capture_output=True, text=True, timeout=1.0)
        if out.returncode == 0:
            return out.stdout.strip()
    except Exception as e:
        logging.debug(f"{argv[0]} failed: {e}")
    return None


def detect_window_class():
    """Best-effort focused-window class: Hyprland, then X11. None if unknown."""
    # Hyprland: "class: firefox" line from `hyprctl activewindow`
    hypr = _run(["hyprctl", "activewindow"])
    if hypr:
        for line in hypr.splitlines():
            line = line.strip()
            if line.startswith("class:"):
                cls = line.split(":", 1)[1].strip()
                if cls:
                    return cls
    # X11
    x11 = _run(["xdotool", "getactivewindow", "getwindowclassname"])
    if x11:
        return x11.strip()
    return None


def resolve_profile(window_class, mapping):
    """Profile mapped to this window class (case-insensitive), or None."""
    if not window_class:
        return None
    if window_class in mapping:
        return mapping[window_class]
    wl = window_class.lower()
    for cls, profile in mapping.items():
        if cls.lower() == wl:
            return profile
    return None


def decide_switch(window_class, mapping, current_profile):
    """Target profile to switch to, or None if no change is warranted."""
    target = resolve_profile(window_class, mapping)
    if target is None or target == current_profile:
        return None
    return target


def _write_profile(name):
    config.PROFILE_FILE.write_text(name)


def _current_profile():
    f = config.PROFILE_FILE
    if f.exists():
        name = f.read_text().strip()
        if name:
            return name
    return "default"


def run(config_path, interval):
    mapping = load_mapping(config_path)
    if not mapping:
        logging.error(f"No mappings loaded from {config_path}; nothing to do.")
        return 1
    logging.info(f"App-switcher watching {len(mapping)} rules every {interval}s")
    while True:
        try:
            target = decide_switch(detect_window_class(), mapping, _current_profile())
            if target:
                logging.info(f"Focus -> profile '{target}'")
                _write_profile(target)
        except Exception as e:
            logging.debug(f"poll error: {e}")
        time.sleep(interval)


def main(argv=None):
    parser = argparse.ArgumentParser(description="StreamDeckPro app-aware profile switcher")
    parser.add_argument("--config", default=str(config.SDP_HOME / "app-profiles.conf"))
    parser.add_argument("--interval", type=float, default=1.0)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    try:
        return run(args.config, args.interval)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
