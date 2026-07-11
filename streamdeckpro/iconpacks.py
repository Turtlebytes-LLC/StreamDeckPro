"""Icon pack format and loader.

An icon pack is a directory containing a ``pack.json`` manifest; icon image
files live anywhere beneath it. The whole ``icons/`` tree is the built-in pack
(icons/pack.json); additional packs are subdirectories with their own
``pack.json``. Resolution prunes nested packs so a pack never claims another
pack's icons.

Manifest schema (pack.json):

    {
      "name": "builtin",            # required, unique slug
      "display_name": "Built-in",   # required
      "version": "1.0.0",           # required, semver-ish
      "author": "StreamDeckPro",    # optional
      "license": "MIT",             # optional
      "description": "..."          # optional
    }
"""

import json
import logging
from pathlib import Path

MANIFEST = "pack.json"
ICON_EXTS = (".png", ".svg", ".jpg", ".jpeg", ".gif")
REQUIRED_FIELDS = ("name", "display_name", "version")


def validate_manifest(data):
    """Return a list of human-readable errors ([] means valid)."""
    errors = []
    if not isinstance(data, dict):
        return ["manifest is not a JSON object"]
    for field in REQUIRED_FIELDS:
        if not data.get(field):
            errors.append(f"missing required field: {field}")
    name = data.get("name")
    if name and (not isinstance(name, str) or " " in name):
        errors.append("name must be a slug with no spaces")
    return errors


def load_pack(pack_dir):
    """Read and validate pack_dir/pack.json. Returns the manifest with an added
    'path' key, or None if absent/invalid."""
    pack_dir = Path(pack_dir)
    manifest_path = pack_dir / MANIFEST
    if not manifest_path.exists():
        return None
    try:
        data = json.loads(manifest_path.read_text())
    except Exception as e:
        logging.warning(f"Invalid pack manifest {manifest_path}: {e}")
        return None
    errors = validate_manifest(data)
    if errors:
        logging.warning(f"Pack {manifest_path} rejected: {'; '.join(errors)}")
        return None
    data["path"] = str(pack_dir)
    return data


def list_packs(icons_root):
    """Every valid pack under icons_root (a dir with a pack.json), sorted by name."""
    icons_root = Path(icons_root)
    packs = []
    if not icons_root.is_dir():
        return packs
    for manifest_path in icons_root.rglob(MANIFEST):
        pack = load_pack(manifest_path.parent)
        if pack:
            packs.append(pack)
    return sorted(packs, key=lambda p: p["name"])


def _nested_pack_dirs(pack_dir):
    """Subdirectories of pack_dir that are themselves packs (to prune)."""
    return {m.parent for m in pack_dir.rglob(MANIFEST) if m.parent != pack_dir}


def pack_icons(pack_dir):
    """All icon files in a pack, excluding icons owned by nested packs."""
    pack_dir = Path(pack_dir)
    nested = _nested_pack_dirs(pack_dir)
    found = []
    for path in pack_dir.rglob("*"):
        if path.suffix.lower() not in ICON_EXTS:
            continue
        if any(str(path).startswith(str(n) + "/") for n in nested):
            continue
        found.append(path)
    return sorted(found)


def resolve_icon(pack_dir, name):
    """Path to the icon named `name` (without extension) in this pack, or None.
    Matches the first icon whose stem equals `name`."""
    for path in pack_icons(pack_dir):
        if path.stem == name:
            return path
    return None
