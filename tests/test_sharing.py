"""Profile export/import (.sdpack) round-trip and traversal safety."""

import io
import json
import tarfile
from types import SimpleNamespace

import pytest

from streamdeckpro import sharing


def make_config(tmp_path):
    return SimpleNamespace(
        SDP_HOME=tmp_path,
        PROFILES_DIR=tmp_path / "profiles",
        PROFILE_FILE=tmp_path / ".profile",
    )


def seed_profile(tmp_path, name):
    root = tmp_path / "profiles" / name
    (root / "buttons").mkdir(parents=True)
    (root / "touchscreen").mkdir(parents=True)
    (root / "buttons" / "button-1.sh").write_text("#!/bin/bash\necho hi\n")
    (root / "buttons" / "button-1.txt").write_text("Hi")
    return root


def test_export_then_read_manifest(tmp_path):
    cfg = make_config(tmp_path)
    seed_profile(tmp_path, "work")
    pack = sharing.export_profile("work", cfg, tmp_path / "work.sdpack")
    assert pack.exists()
    manifest = sharing.read_manifest(pack)
    assert manifest["format"] == sharing.FORMAT
    assert manifest["name"] == "work"
    assert "buttons" in manifest["subdirs"]


def test_round_trip_import(tmp_path):
    cfg = make_config(tmp_path)
    seed_profile(tmp_path, "work")
    pack = sharing.export_profile("work", cfg, tmp_path / "work.sdpack")

    dest = sharing.import_pack(pack, cfg, as_name="work_copy")
    assert (dest / "buttons" / "button-1.sh").read_text().startswith("#!/bin/bash")
    assert (dest / "buttons" / "button-1.txt").read_text() == "Hi"


def test_export_missing_profile(tmp_path):
    cfg = make_config(tmp_path)
    with pytest.raises(FileNotFoundError):
        sharing.export_profile("ghost", cfg, tmp_path / "x.sdpack")


def test_import_rejects_non_sdpack(tmp_path):
    cfg = make_config(tmp_path)
    bogus = tmp_path / "bogus.sdpack"
    with tarfile.open(bogus, "w:gz") as tar:
        data = b"nope"
        info = tarfile.TarInfo("random.txt")
        info.size = len(data)
        tar.addfile(info, io.BytesIO(data))
    with pytest.raises(ValueError):
        sharing.import_pack(bogus, cfg, as_name="x")


def test_import_refuses_default(tmp_path):
    cfg = make_config(tmp_path)
    seed_profile(tmp_path, "work")
    pack = sharing.export_profile("work", cfg, tmp_path / "work.sdpack")
    with pytest.raises(ValueError):
        sharing.import_pack(pack, cfg, as_name="default")


def test_import_ignores_traversal_members(tmp_path):
    cfg = make_config(tmp_path)
    # hand-craft a malicious pack: valid manifest + an escaping member
    evil = tmp_path / "evil.sdpack"
    with tarfile.open(evil, "w:gz") as tar:
        man = json.dumps({"format": sharing.FORMAT, "name": "evil",
                          "subdirs": ["buttons"]}).encode()
        info = tarfile.TarInfo(sharing.MANIFEST)
        info.size = len(man)
        tar.addfile(info, io.BytesIO(man))
        payload = b"pwned"
        bad = tarfile.TarInfo("../../escape.txt")
        bad.size = len(payload)
        tar.addfile(bad, io.BytesIO(payload))

    sharing.import_pack(evil, cfg, as_name="evil")
    assert not (tmp_path.parent / "escape.txt").exists()
    assert not (tmp_path / "escape.txt").exists()


def test_safe_name_rules():
    assert sharing._is_safe("manifest.json")
    assert sharing._is_safe("buttons/button-1.sh")
    assert not sharing._is_safe("/etc/passwd")
    assert not sharing._is_safe("../escape.txt")
    assert not sharing._is_safe("secrets/key")
