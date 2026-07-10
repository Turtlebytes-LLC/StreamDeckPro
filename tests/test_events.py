"""Characterization of event routing: which script fires for which gesture."""

from pathlib import Path
from types import SimpleNamespace

import pytest

from streamdeckpro.events import EventDispatcher
from conftest import event

PLUS_PROFILE = {
    "buttons": 8,
    "button_layout": (4, 2),
    "button_size": (120, 120),
    "dials": 4,
    "touchscreen": {"width": 800, "height": 100, "zones": 4},
    "pedals": 0,
}


@pytest.fixture
def dispatcher():
    ran = []
    cfg = SimpleNamespace(
        BUTTONS_DIR=Path("/x/buttons"),
        DIALS_DIR=Path("/x/dials"),
        TOUCH_DIR=Path("/x/touchscreen"),
    )
    d = EventDispatcher(cfg, lambda script, desc: ran.append(script.name))
    d.setup_touch_zones(PLUS_PROFILE)
    d.ran = ran
    return d


# --- buttons -----------------------------------------------------------------

def test_short_press_runs_button_script(dispatcher):
    dispatcher.button_callback(None, 0, True)
    dispatcher.button_callback(None, 0, False)
    assert "button-1.sh" in dispatcher.ran
    assert "button-1-longpress.sh" not in dispatcher.ran


def test_longpress_suppresses_short_release(dispatcher):
    dispatcher.button_callback(None, 2, True)
    dispatcher.trigger_button_longpress(2, 3)
    dispatcher.button_callback(None, 2, False)
    assert "button-3-longpress.sh" in dispatcher.ran
    assert "button-3.sh" not in dispatcher.ran


# --- dials -------------------------------------------------------------------

def test_dial_turn_cw_ccw(dispatcher):
    dispatcher.dial_callback(None, 0, event("TURN"), 1)
    dispatcher.dial_callback(None, 0, event("TURN"), -1)
    assert "dial-1-cw.sh" in dispatcher.ran
    assert "dial-1-ccw.sh" in dispatcher.ran


def test_dial_short_press(dispatcher):
    dispatcher.dial_callback(None, 1, event("PUSH"), True)
    dispatcher.dial_callback(None, 1, event("PUSH"), False)
    assert "dial-2-press.sh" in dispatcher.ran
    assert "dial-2-longpress.sh" not in dispatcher.ran


def test_dial_longpress_suppresses_press(dispatcher):
    dispatcher.dial_callback(None, 0, event("PUSH"), True)
    dispatcher.trigger_dial_longpress(0, 1)
    dispatcher.dial_callback(None, 0, event("PUSH"), False)
    assert "dial-1-longpress.sh" in dispatcher.ran
    assert "dial-1-press.sh" not in dispatcher.ran


# --- touchscreen tap vs swipe ------------------------------------------------

def test_tap_runs_zone_script(dispatcher):
    dispatcher.touchscreen_callback(None, event("SHORT"), {"x": 100})
    assert "touch-1.sh" in dispatcher.ran


def test_small_movement_is_tap_not_swipe(dispatcher):
    dispatcher.swipe_in_progress = True
    dispatcher.swipe_start_x = 100
    dispatcher.swipe_start_y = 50
    dispatcher.swipe_end_x = 110   # dx = 10 < 30
    dispatcher.swipe_end_y = 55    # dy = 5  < 30
    dispatcher.touchscreen_callback(None, event("SHORT"), {"x": 100})
    assert "touch-1.sh" in dispatcher.ran
    assert not any("swipe" in n for n in dispatcher.ran)


# --- swipe direction (|dx| vs |dy|) ------------------------------------------

def test_swipe_direction_horizontal(dispatcher):
    dispatcher.swipe_start_x = 100
    dispatcher._execute_swipe(dx=100, dy=0, zones_crossed=0.5)
    dispatcher._execute_swipe(dx=-100, dy=0, zones_crossed=0.5)
    assert "touch-1-swipe-right.sh" in dispatcher.ran
    assert "touch-1-swipe-left.sh" in dispatcher.ran


def test_swipe_direction_vertical(dispatcher):
    dispatcher.swipe_start_x = 100
    dispatcher._execute_swipe(dx=0, dy=100, zones_crossed=0.0)
    dispatcher._execute_swipe(dx=0, dy=-100, zones_crossed=0.0)
    assert "touch-1-swipe-down.sh" in dispatcher.ran
    assert "touch-1-swipe-up.sh" in dispatcher.ran


# --- long swipe edge rules (10% edge, +/-50 dx) ------------------------------

def test_longswipe_right_from_left_edge(dispatcher):
    dispatcher.swipe_start_x = 10
    dispatcher._execute_swipe(dx=100, dy=0, zones_crossed=3.0)
    assert "longswipe-right.sh" in dispatcher.ran


def test_longswipe_left_from_right_edge(dispatcher):
    dispatcher.swipe_start_x = 790
    dispatcher._execute_swipe(dx=-100, dy=0, zones_crossed=3.0)
    assert "longswipe-left.sh" in dispatcher.ran


def test_edge_swipe_below_threshold_is_normal_swipe(dispatcher):
    dispatcher.swipe_start_x = 10
    dispatcher._execute_swipe(dx=40, dy=0, zones_crossed=0.2)
    assert "longswipe-right.sh" not in dispatcher.ran
    assert "touch-1-swipe-right.sh" in dispatcher.ran
