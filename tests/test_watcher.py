"""Characterization of the hot-reload watcher and brightness monitor."""

import os
from types import SimpleNamespace

import pytest

from streamdeckpro.watcher import FileWatcher
from conftest import FakeDeck

PLUS_PROFILE = {
    "buttons": 8,
    "button_layout": (4, 2),
    "button_size": (120, 120),
    "dials": 4,
    "touchscreen": {"width": 800, "height": 100, "zones": 4},
    "pedals": 0,
}


@pytest.fixture
def watcher(tmp_path):
    buttons = tmp_path / "buttons"
    touch = tmp_path / "touchscreen"
    buttons.mkdir()
    touch.mkdir()
    cfg = SimpleNamespace(
        BUTTONS_DIR=buttons,
        TOUCH_DIR=touch,
        BRIGHTNESS_FILE=tmp_path / ".brightness",
    )
    device = SimpleNamespace(
        device_profile=dict(PLUS_PROFILE),
        deck=FakeDeck(),
        device_connected=True,
        current_brightness=50,
        last_brightness_mtime=0,
    )
    w = FileWatcher(cfg, device)
    w.buttons = buttons
    w.touch = touch
    w.cfg = cfg
    w.device = device
    return w


def test_new_file_detected(watcher):
    watcher.last_reload_check = 0
    (watcher.buttons / "button-1.png").write_bytes(b"")
    assert watcher.check_for_file_changes() is True


def test_mtime_change_triggers_reload(watcher):
    f = watcher.buttons / "button-1.txt"
    f.write_text("hello")

    watcher.last_reload_check = 0
    watcher.check_for_file_changes()  # register baseline

    future = os.stat(f).st_mtime + 100
    os.utime(f, (future, future))

    watcher.last_reload_check = 0
    assert watcher.check_for_file_changes() is True


def test_no_change_returns_false(watcher):
    (watcher.buttons / "button-1.txt").write_text("hello")
    watcher.last_reload_check = 0
    watcher.check_for_file_changes()  # register

    watcher.last_reload_check = 0
    assert watcher.check_for_file_changes() is False


def test_reload_interval_gates_checks(watcher):
    import time
    watcher.last_reload_check = time.time()
    assert watcher.check_for_file_changes() is False


# --- brightness --------------------------------------------------------------

def test_brightness_hex_parsed_and_applied(watcher):
    watcher.cfg.BRIGHTNESS_FILE.write_text("FF")
    watcher.device.last_brightness_mtime = 0
    watcher.device.current_brightness = 50

    watcher.check_brightness_change()

    assert watcher.device.deck.calls_named("set_brightness") == [(100,)]
    assert watcher.device.current_brightness == 100


def test_brightness_garbage_does_not_crash_or_change(watcher):
    watcher.cfg.BRIGHTNESS_FILE.write_text("not-hex")
    watcher.device.last_brightness_mtime = 0
    watcher.device.current_brightness = 42

    watcher.check_brightness_change()  # must not raise

    assert watcher.device.deck.calls_named("set_brightness") == []
    assert watcher.device.current_brightness == 42
