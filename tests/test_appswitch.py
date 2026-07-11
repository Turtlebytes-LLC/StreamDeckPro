"""App-aware profile switching: mapping parse and switch decisions."""

from streamdeckpro import appswitch


def test_load_mapping_parses_and_ignores_noise(tmp_path):
    conf = tmp_path / "app-profiles.conf"
    conf.write_text(
        "# comment\n"
        "\n"
        "firefox = web\n"
        "code=dev\n"
        "  Slack  =  chat  \n"
        "garbage-no-equals\n"
    )
    assert appswitch.load_mapping(str(conf)) == {
        "firefox": "web",
        "code": "dev",
        "Slack": "chat",
    }


def test_load_mapping_missing_file(tmp_path):
    assert appswitch.load_mapping(str(tmp_path / "nope.conf")) == {}


def test_resolve_profile_exact_and_case_insensitive():
    mapping = {"firefox": "web", "Code": "dev"}
    assert appswitch.resolve_profile("firefox", mapping) == "web"
    assert appswitch.resolve_profile("code", mapping) == "dev"   # case-insensitive
    assert appswitch.resolve_profile("unknown", mapping) is None
    assert appswitch.resolve_profile(None, mapping) is None


def test_decide_switch_only_on_change():
    mapping = {"firefox": "web"}
    assert appswitch.decide_switch("firefox", mapping, "default") == "web"
    assert appswitch.decide_switch("firefox", mapping, "web") is None   # already there
    assert appswitch.decide_switch("terminal", mapping, "default") is None  # unmapped


def test_detect_window_class_hyprland(monkeypatch):
    def fake_run(argv):
        if argv[0] == "hyprctl":
            return "Window abc -> title\n\tclass: firefox\n\tat: 0,0"
        return None
    monkeypatch.setattr(appswitch, "_run", fake_run)
    assert appswitch.detect_window_class() == "firefox"


def test_detect_window_class_x11_fallback(monkeypatch):
    def fake_run(argv):
        if argv[0] == "xdotool":
            return "Code"
        return None  # hyprctl unavailable
    monkeypatch.setattr(appswitch, "_run", fake_run)
    assert appswitch.detect_window_class() == "Code"


def test_detect_window_class_none(monkeypatch):
    monkeypatch.setattr(appswitch, "_run", lambda argv: None)
    assert appswitch.detect_window_class() is None
