"""Characterization of script execution / auto-template creation."""

import os
import stat

from streamdeckpro import actions


def is_exec(path):
    return bool(os.stat(path).st_mode & stat.S_IXUSR)


def test_missing_script_gets_template_and_runs(tmp_path, popen_spy):
    script = tmp_path / "button-7.sh"
    assert not script.exists()

    actions.execute_script(script, "Button 7 Pressed")

    assert script.exists()
    assert is_exec(script)
    assert oct(os.stat(script).st_mode)[-3:] == "755"
    assert "notify-send" in script.read_text()
    assert popen_spy and popen_spy[-1].argv == [str(script)]


def test_non_executable_script_gets_chmod(tmp_path, popen_spy):
    script = tmp_path / "button-8.sh"
    script.write_text("#!/bin/bash\necho hi\n")
    os.chmod(script, 0o644)
    assert not is_exec(script)

    actions.execute_script(script, "Button 8")

    assert is_exec(script)
    assert oct(os.stat(script).st_mode)[-3:] == "755"
    assert popen_spy[-1].argv == [str(script)]


def test_existing_script_not_overwritten(tmp_path, popen_spy):
    script = tmp_path / "button-6.sh"
    script.write_text("#!/bin/bash\necho custom\n")
    os.chmod(script, 0o755)

    actions.execute_script(script, "Button 6")

    assert script.read_text() == "#!/bin/bash\necho custom\n"


def test_sdp_home_exported_to_child(tmp_path, monkeypatch):
    from streamdeckpro import config
    captured = {}

    class FakePopen:
        def __init__(self, argv, *args, **kwargs):
            captured["env"] = kwargs.get("env", {})

    monkeypatch.setattr("subprocess.Popen", FakePopen)

    script = tmp_path / "x.sh"
    script.write_text("#!/bin/bash\n")
    os.chmod(script, 0o755)
    actions.execute_script(script, "x")

    assert captured["env"].get("SDP_HOME") == str(config.SDP_HOME)
