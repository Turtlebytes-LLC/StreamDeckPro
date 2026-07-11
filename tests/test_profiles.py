"""Profile-aware path resolution and switching."""

from pathlib import Path
from types import SimpleNamespace

import pytest

from streamdeckpro.profiles import ProfileManager


def make_config(tmp_path):
    """A config stand-in rooted at tmp_path, mirroring the real module layout."""
    return SimpleNamespace(
        SDP_HOME=tmp_path,
        BUTTONS_DIR=tmp_path / "buttons",
        DIALS_DIR=tmp_path / "dials",
        TOUCH_DIR=tmp_path / "touchscreen",
        PROFILES_DIR=tmp_path / "profiles",
        PROFILE_FILE=tmp_path / ".profile",
        BRIGHTNESS_FILE=tmp_path / ".brightness",
    )


@pytest.fixture
def pm(tmp_path):
    return ProfileManager(make_config(tmp_path))


# --- default fallback --------------------------------------------------------

def test_no_profile_file_is_default(pm, tmp_path):
    assert pm.active_profile_name() == "default"
    assert pm.BUTTONS_DIR == tmp_path / "buttons"
    assert pm.DIALS_DIR == tmp_path / "dials"
    assert pm.TOUCH_DIR == tmp_path / "touchscreen"


def test_empty_profile_file_is_default(pm, tmp_path):
    (tmp_path / ".profile").write_text("  \n")
    assert pm.active_profile_name() == "default"
    assert pm.BUTTONS_DIR == tmp_path / "buttons"


def test_literal_default_maps_to_toplevel(pm, tmp_path):
    (tmp_path / ".profile").write_text("default")
    assert pm.BUTTONS_DIR == tmp_path / "buttons"


# --- named profiles ----------------------------------------------------------

def test_named_profile_resolves_under_profiles_dir(pm, tmp_path):
    (tmp_path / "profiles" / "work" / "buttons").mkdir(parents=True)
    (tmp_path / ".profile").write_text("work\n")
    assert pm.active_profile_name() == "work"
    assert pm.BUTTONS_DIR == tmp_path / "profiles" / "work" / "buttons"
    assert pm.TOUCH_DIR == tmp_path / "profiles" / "work" / "touchscreen"


def test_missing_profile_dir_falls_back_to_default(pm, tmp_path):
    (tmp_path / ".profile").write_text("ghost")
    # 'ghost' named but no profiles/ghost dir -> safe fallback to top-level
    assert pm.BUTTONS_DIR == tmp_path / "buttons"


# --- listing -----------------------------------------------------------------

def test_list_profiles_default_first(pm, tmp_path):
    (tmp_path / "profiles" / "work").mkdir(parents=True)
    (tmp_path / "profiles" / "gaming").mkdir(parents=True)
    assert pm.list_profiles() == ["default", "gaming", "work"]


def test_list_profiles_no_dir(pm):
    assert pm.list_profiles() == ["default"]


# --- config delegation -------------------------------------------------------

def test_delegates_unknown_attrs_to_config(pm, tmp_path):
    # Not a path property - must pass through to the wrapped config.
    assert pm.BRIGHTNESS_FILE == tmp_path / ".brightness"
    assert pm.SDP_HOME == tmp_path


def test_switch_reflects_immediately(pm, tmp_path):
    (tmp_path / "profiles" / "gaming" / "dials").mkdir(parents=True)
    assert pm.BUTTONS_DIR == tmp_path / "buttons"
    (tmp_path / ".profile").write_text("gaming")
    assert pm.DIALS_DIR == tmp_path / "profiles" / "gaming" / "dials"
