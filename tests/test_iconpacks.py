"""Icon pack manifest validation, listing, and resolution."""

import json

from streamdeckpro import iconpacks
from streamdeckpro.config import SDP_HOME


def write_pack(d, name, **extra):
    d.mkdir(parents=True, exist_ok=True)
    manifest = {"name": name, "display_name": name.title(), "version": "1.0.0"}
    manifest.update(extra)
    (d / "pack.json").write_text(json.dumps(manifest))
    return d


# --- validation --------------------------------------------------------------

def test_valid_manifest_has_no_errors():
    assert iconpacks.validate_manifest(
        {"name": "x", "display_name": "X", "version": "1.0.0"}
    ) == []


def test_missing_fields_reported():
    errors = iconpacks.validate_manifest({"name": "x"})
    assert any("display_name" in e for e in errors)
    assert any("version" in e for e in errors)


def test_name_with_space_rejected():
    errors = iconpacks.validate_manifest(
        {"name": "bad name", "display_name": "X", "version": "1.0.0"}
    )
    assert any("slug" in e for e in errors)


# --- load --------------------------------------------------------------------

def test_load_pack_adds_path(tmp_path):
    p = write_pack(tmp_path / "cool", "cool")
    pack = iconpacks.load_pack(p)
    assert pack["name"] == "cool"
    assert pack["path"] == str(p)


def test_load_pack_missing_manifest(tmp_path):
    assert iconpacks.load_pack(tmp_path) is None


def test_load_pack_bad_json(tmp_path):
    (tmp_path / "pack.json").write_text("{not json")
    assert iconpacks.load_pack(tmp_path) is None


# --- list + resolve ----------------------------------------------------------

def test_list_packs_finds_all(tmp_path):
    write_pack(tmp_path / "a", "alpha")
    write_pack(tmp_path / "b", "beta")
    names = [p["name"] for p in iconpacks.list_packs(tmp_path)]
    assert names == ["alpha", "beta"]


def test_resolve_icon_and_prune_nested(tmp_path):
    pack = write_pack(tmp_path / "main", "main")
    (pack / "media").mkdir()
    (pack / "media" / "play.png").write_bytes(b"")
    # a nested pack owns its own icons
    nested = write_pack(pack / "sub", "sub")
    (nested / "stop.png").write_bytes(b"")

    assert iconpacks.resolve_icon(pack, "play").name == "play.png"
    # 'stop' belongs to the nested pack, not to main
    assert iconpacks.resolve_icon(pack, "stop") is None
    assert iconpacks.resolve_icon(nested, "stop").name == "stop.png"


# --- the shipped built-in pack ----------------------------------------------

def test_builtin_pack_is_valid():
    pack = iconpacks.load_pack(SDP_HOME / "icons")
    assert pack is not None
    assert pack["name"] == "builtin"


def test_builtin_pack_has_icons():
    icons = iconpacks.pack_icons(SDP_HOME / "icons")
    assert len(icons) > 0
