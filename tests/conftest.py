"""Shared test fixtures for the Stream Deck daemon (streamdeckpro package)."""

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


class FakeDeck:
    """Stub of the python-elgato-streamdeck surface the daemon uses.

    Records every call in self.calls as (method, args) tuples so tests can
    assert on interactions without a physical device.
    """

    def __init__(self, deck_type="Stream Deck Plus"):
        self._deck_type = deck_type
        self._open = True
        self.calls = []

    def _record(self, name, *args):
        self.calls.append((name, args))

    def key_count(self):
        self._record("key_count")
        return 8

    def deck_type(self):
        self._record("deck_type")
        return self._deck_type

    def set_key_image(self, key, image):
        self._record("set_key_image", key, image)

    def set_touchscreen_image(self, image, x, y, width, height):
        self._record("set_touchscreen_image", image, x, y, width, height)

    def set_brightness(self, value):
        self._record("set_brightness", value)

    def set_key_callback(self, cb):
        self._record("set_key_callback", cb)

    def set_dial_callback(self, cb):
        self._record("set_dial_callback", cb)

    def set_touchscreen_callback(self, cb):
        self._record("set_touchscreen_callback", cb)

    def reset(self):
        self._record("reset")

    def close(self):
        self._record("close")
        self._open = False

    def is_open(self):
        self._record("is_open")
        return self._open

    def get_serial_number(self):
        self._record("get_serial_number")
        return "FAKE123"

    def get_firmware_version(self):
        self._record("get_firmware_version")
        return "1.0.0"

    def calls_named(self, name):
        return [args for n, args in self.calls if n == name]


@pytest.fixture
def popen_spy(monkeypatch):
    """Capture subprocess.Popen argv instead of running anything."""
    calls = []

    class FakePopen:
        def __init__(self, argv, *args, **kwargs):
            calls.append(SimpleNamespace(argv=argv, args=args, kwargs=kwargs))

    monkeypatch.setattr("subprocess.Popen", FakePopen)
    return calls


def event(name):
    """Build an event object exposing .name like the streamdeck enums do."""
    return SimpleNamespace(name=name)
