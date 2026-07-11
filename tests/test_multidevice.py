"""Simulate non-Plus models through FakeDeck: the daemon must adapt, not crash.

Zach has only a Stream Deck Plus, so these stand in for the hardware verify -
they prove the dial-less / touchscreen-less code paths are skipped cleanly for
Mini/MK.2/XL/Neo without a physical device.
"""

from types import SimpleNamespace

import pytest

from streamdeckpro import config
from streamdeckpro.device import DeviceConnection
from streamdeckpro.events import EventDispatcher
from streamdeckpro.daemon import StreamDeckDaemon
from conftest import FakeDeck

P = config.DEVICE_PROFILES


# --- device profile detection ------------------------------------------------

@pytest.mark.parametrize("deck_type,buttons,dials,has_touch", [
    ("Stream Deck Mini", 6, 0, False),
    ("Stream Deck MK.2", 15, 0, False),
    ("Stream Deck XL", 32, 0, False),
    ("Stream Deck Plus", 8, 4, True),
    ("Stream Deck Neo", 8, 0, True),
])
def test_get_device_profile(deck_type, buttons, dials, has_touch):
    dc = DeviceConnection(config)
    name, profile = dc.get_device_profile(deck_type)
    assert profile["buttons"] == buttons
    assert profile["dials"] == dials
    assert bool(profile.get("touchscreen")) is has_touch


def test_unknown_device_uses_default():
    dc = DeviceConnection(config)
    name, profile = dc.get_device_profile("Elgato Frobnicator 9000")
    assert profile == config.DEFAULT_PROFILE


# --- event setup adapts ------------------------------------------------------

def test_dialless_touchless_model_has_no_touch_zones():
    cfg = SimpleNamespace(BUTTONS_DIR=None, DIALS_DIR=None, TOUCH_DIR=None)
    ev = EventDispatcher(cfg, lambda s, d: None)
    ev.setup_touch_zones(P["Stream Deck Mini"])
    assert ev.touch_zones == []


def test_plus_model_has_four_touch_zones():
    cfg = SimpleNamespace(BUTTONS_DIR=None, DIALS_DIR=None, TOUCH_DIR=None)
    ev = EventDispatcher(cfg, lambda s, d: None)
    ev.setup_touch_zones(P["Stream Deck Plus"])
    assert len(ev.touch_zones) == 4


# --- daemon rendering skips absent hardware ----------------------------------

def _daemon_with(deck_type, keys, profile):
    d = StreamDeckDaemon()
    d.device.deck = FakeDeck(deck_type=deck_type, keys=keys)
    d.device.device_profile = profile
    d.device.device_connected = True
    return d


def test_touchless_model_skips_touchscreen_render():
    d = _daemon_with("Stream Deck Mini", 6, P["Stream Deck Mini"])
    d.update_touchscreen()
    assert d.device.deck.calls_named("set_touchscreen_image") == []


def test_touchscreen_model_renders_touchscreen():
    d = _daemon_with("Stream Deck Plus", 8, P["Stream Deck Plus"])
    d.update_touchscreen()
    assert len(d.device.deck.calls_named("set_touchscreen_image")) == 1


def test_button_render_count_matches_model():
    d = _daemon_with("Stream Deck XL", 32, P["Stream Deck XL"])
    d.update_all_buttons()
    assert len(d.device.deck.calls_named("set_key_image")) == 32


def test_mini_renders_six_buttons_no_crash():
    d = _daemon_with("Stream Deck Mini", 6, P["Stream Deck Mini"])
    d.update_all_buttons()      # must not raise
    assert len(d.device.deck.calls_named("set_key_image")) == 6
    assert d.device.device_connected is True
