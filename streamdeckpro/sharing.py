"""Profile sharing: export a profile to a portable .sdpack and import it back.

A .sdpack is a gzipped tar containing a top-level manifest.json plus the
profile's buttons/dials/touchscreen tree. Sharing is filesystem-as-config all
the way down: importing just drops a profile directory into profiles/.

    export_profile("work", config, "work.sdpack")
    import_pack("work.sdpack", config)          # -> profiles/work/
    import_pack("work.sdpack", config, as_name="work2")

Imports are hardened against path traversal: only manifest.json and files under
the profile subtree are extracted, and any absolute/`..` member is rejected.
"""

import io
import sys
import json
import tarfile
import argparse
from pathlib import Path

FORMAT = "sdpack/v1"
MANIFEST = "manifest.json"
SUBDIRS = ("buttons", "dials", "touchscreen")


def _profile_source(profile_name, config):
    """Directory holding a profile's element dirs (top-level for 'default')."""
    if profile_name == "default":
        return Path(config.SDP_HOME)
    return Path(config.PROFILES_DIR) / profile_name


def export_profile(profile_name, config, dest_path):
    """Write profiles/<name> (or the top-level default) to a .sdpack at dest_path."""
    source = _profile_source(profile_name, config)
    if not source.is_dir():
        raise FileNotFoundError(f"profile source not found: {source}")

    manifest = {
        "format": FORMAT,
        "name": profile_name,
        "subdirs": [s for s in SUBDIRS if (source / s).is_dir()],
    }

    dest_path = Path(dest_path)
    with tarfile.open(dest_path, "w:gz") as tar:
        data = json.dumps(manifest, indent=2).encode()
        info = tarfile.TarInfo(MANIFEST)
        info.size = len(data)
        tar.addfile(info, io.BytesIO(data))
        for sub in manifest["subdirs"]:
            tar.add(source / sub, arcname=sub)
    return dest_path


def read_manifest(pack_path):
    """Return the manifest dict from a .sdpack, or None if absent/invalid."""
    try:
        with tarfile.open(pack_path, "r:gz") as tar:
            member = tar.getmember(MANIFEST)
            f = tar.extractfile(member)
            return json.loads(f.read().decode())
    except Exception:
        return None


def _is_safe(name):
    """Reject absolute paths and parent-escapes; allow manifest + subdir trees."""
    p = Path(name)
    if p.is_absolute() or ".." in p.parts:
        return False
    return name == MANIFEST or p.parts[0] in SUBDIRS


def import_pack(pack_path, config, as_name=None):
    """Extract a .sdpack into profiles/<name>. Returns the destination dir."""
    manifest = read_manifest(pack_path)
    if not manifest or manifest.get("format") != FORMAT:
        raise ValueError("not a valid sdpack/v1 file")

    name = as_name or manifest.get("name")
    if not name or name == "default":
        raise ValueError("import requires a non-default target profile name")

    dest = Path(config.PROFILES_DIR) / name
    dest.mkdir(parents=True, exist_ok=True)

    with tarfile.open(pack_path, "r:gz") as tar:
        safe = [m for m in tar.getmembers() if _is_safe(m.name)]
        for m in safe:
            if m.name == MANIFEST:
                continue
            tar.extract(m, dest)
    return dest


def main(argv=None):
    from . import config
    parser = argparse.ArgumentParser(description="StreamDeckPro profile sharing")
    sub = parser.add_subparsers(dest="cmd", required=True)
    ex = sub.add_parser("export", help="export a profile to a .sdpack")
    ex.add_argument("name")
    ex.add_argument("dest")
    im = sub.add_parser("import", help="import a .sdpack into profiles/")
    im.add_argument("pack")
    im.add_argument("--as", dest="as_name", default=None)
    args = parser.parse_args(argv)

    if args.cmd == "export":
        out = export_profile(args.name, config, args.dest)
        print(f"exported {args.name} -> {out}")
    else:
        dest = import_pack(args.pack, config, as_name=args.as_name)
        print(f"imported -> {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
