# Design: Phase 1 - Foundation

Read this with the baseline specs (openspec/specs/*/spec.md). Together they
are sufficient to implement every task without exploring the repo. Where this
document says "current behavior", the baseline specs define it.

## Context

streamdeck-daemon.py is 1402 lines: two module-level helpers
(`load_svg_image` line 109, `resize_with_aspect_ratio` line 138), one
`StreamDeckDaemon` class (line 194) with ~40 methods, and `main()` (line
1391). It works. This phase splits it into a package, adds tests FIRST,
fixes logging, unifies duplicated shell code, consolidates setup scripts
into one installer, and ships the script-authoring toolkit.

## Goals / Non-Goals

**Goals:** identical runtime behavior after refactor (characterization tests
prove it); every task leaves the daemon startable via `./start`.

**Non-Goals:** new features, new dependencies beyond pytest (dev-only),
touching the action-scripts contract, configurator changes beyond the two
path constants noted in Decision 8.

## Decisions

### Decision 1: Package layout and method mapping

New package `streamdeckpro/` at repo root. The `StreamDeckDaemon` class
survives as the orchestrator in `daemon.py`; behavior-heavy method groups
move to modules as free functions or small classes that the orchestrator
composes. Exact mapping (source line numbers refer to current
streamdeck-daemon.py):

```
streamdeckpro/
  __init__.py        __version__ = "2.0.0-dev"
  __main__.py        from .daemon import main; main()
  config.py          All path constants (SCRIPT_DIR, BUTTONS_DIR, DIALS_DIR,
                     TOUCH_DIR, BRIGHTNESS_FILE, DEVICE_INFO_FILE) currently
                     module-level in the daemon; plus DEVICE_PROFILES dict
                     from get_device_profile (line 244). Exports SDP_HOME
                     (the repo root) so shell helpers can find it.
  logging_setup.py   setup_logging() -> logging.Logger (Decision 3)
  rendering.py       load_svg_image (109), resize_with_aspect_ratio (138),
                     wrap_text (584), render_button (612),
                     load_image_for_button (513), load_label_for_button (547),
                     load_text_position_for_button (558),
                     load_font_size_for_button (571),
                     load_image_for_touch_zone (1058) and its 3 sibling
                     loaders (1080, 1091, 1104), update_touchscreen
                     composition (1173). Functions take explicit args
                     (dirs, sizes, deck) instead of self.
  events.py          class EventDispatcher: button_callback (701),
                     dial_callback (763), touchscreen_callback (818),
                     trigger_*_longpress (734, 743, 753), _complete_swipe
                     (946), _execute_swipe (961), setup_touch_zones (263).
                     Constructor takes (config, action_runner) where
                     action_runner is actions.execute_script.
  actions.py         execute_script (1005), create_script_template (1030).
  device.py          class DeviceConnection: connect_device (279),
                     is_device_connected (378), check_device_presence (395),
                     disconnect_device (404), attempt_reconnect (417),
                     save_device_info (478), get_device_profile (244),
                     get_button_size (507), get_touch_zone_size (1049).
  watcher.py         check_for_file_changes (1117), check_brightness_change
                     (447), reload_displays (1166) as class FileWatcher.
  daemon.py          class StreamDeckDaemon: __init__ (197) wires the above;
                     run (1270) main loop unchanged in logic; main (1391).
```

streamdeck-daemon.py is REPLACED at the end by a 3-line shim:
`#!/usr/bin/env python3` + `from streamdeckpro.daemon import main` +
`main()`. The `start`/`stop` scripts and systemd units keep working
untouched because they exec streamdeck-daemon.py.

### Decision 2: Tests before refactor (characterization first)

pytest, dev-only, no daemon runtime dependency added. `tests/conftest.py`
provides `FakeDeck`, a stub implementing the python-elgato-streamdeck
surface the daemon uses: `key_count()`, `deck_type()`, `set_key_image()`,
`set_touchscreen_image()`, `set_brightness()`, `set_key_callback()`,
`set_dial_callback()`, `set_touchscreen_callback()`, `reset()`, `close()`,
`is_open()`, `get_serial_number()`, `get_firmware_version()`. It records
every call in `self.calls` for assertions.

Characterization tests are written against the CURRENT single file (import
via `importlib` from streamdeck-daemon.py) and must pass before any move;
after each move task they are re-pointed at the package and must still pass.
Minimum coverage:
- test_events.py: short press runs button-N.sh; 0.5 s hold runs longpress
  and suppresses release; dial cw/ccw/press/longpress; zone tap vs swipe
  (30 px threshold, |dx| vs |dy|); long swipe edge rules (10% edge, +/-50 dx)
- test_rendering.py: priority svg > png/jpg > default tile; label wrap to 2
  lines; position/fontsize sidecar files; touchscreen strip is 800x100 with
  4 px dividers
- test_actions.py: missing script gets template + 0755 + runs; non-executable
  script gets chmod 0755
- test_watcher.py: mtime change triggers reload; .brightness hex parse with
  fallback to 100

Scripts under test must not actually execute user commands: monkeypatch
subprocess.Popen and capture argv.

### Decision 3: Logging

`logging_setup.setup_logging()`: root logger INFO; StreamHandler (stdout,
journal picks this up); RotatingFileHandler on `logs/daemon.log`,
maxBytes=10_000_000, backupCount=3. Create `logs/` if missing; add to
.gitignore. Delete the legacy 238M `daemon.log` in the cleanup task. Format:
`%(asctime)s %(levelname)s %(name)s: %(message)s`. Downgrade the per-poll
loop chatter (anything logged every 0.5 s iteration) to DEBUG.

### Decision 4: Unify the status listeners

Today three near-copies exist: volume-status-listener.sh,
mute-status-listener.sh, cpu-listener-zone4.sh plus generate-volume-image.py,
generate-cpu-image.py, generate-cpu-chart.py. Replace with:
- `listeners/status-listener.sh <volume|mute|cpu> <zone>`: one script; a
  case block selects the poll command and the generator args; writes
  `touchscreen/touch-<zone>.png` using paths relative to its own location
  (`$(dirname "$(readlink -f "$0")")/..`), never $HOME hardcodes.
- `listeners/generate-status-image.py --kind <volume|mute|cpu> ...` merging
  the three generators (they share PIL boilerplate; keep the CPU sparkline
  branch).
- Two systemd user units replaced by one templated unit
  `streamdeck-listener@.service` (instance = kind:zone, e.g. `volume:1`),
  installed by install.sh.

This FIXES two live bugs found in review: volume-status-listener.sh writes
to `$HOME/streamdeck-actions/` (a directory that does not exist - zone 1
volume display has been silently dead), and mute-status-listener.service
hardcodes `/home/zach2825/streamdeck-actions/` in ExecStart. Delete the six
superseded files after the replacement is verified.

### Decision 5: One installer

New `install.sh` at repo root with subcommands: `install.sh deps` (pip
install --user streamdeck pillow), `udev` (current setup-udev-rules.sh
logic), `autostart` (Decision 6), `listeners`, `all`, `uninstall`. Absorb
and then DELETE: setup-udev-rules.sh, setup-autostart.sh,
remove-autostart.sh, setup-mute-listener.sh, setup-volume-listener.sh,
setup-status-updater.sh, setup-volume-test.sh, run-volume-test.sh,
fix-permissions-now.sh, deploy-power-user.sh, setup-power-user,
reload-and-start.sh, cleanup-all.sh, cleanup-docs.sh. `start`, `stop`,
`configure`, `create-action` stay (user-facing daily commands).

Beyond consolidation, the install EXPERIENCE must stop being confusing:
- `./install.sh` with no args runs a guided setup, not a usage dump: it
  walks deps -> udev -> device check -> optional autostart -> optional
  listeners as numbered steps, printing what it is doing and a clear
  PASS/FAIL per step. Steps that change system state (udev rules, systemd
  units) ask first and can be skipped. `install.sh all --yes` is the
  non-interactive equivalent; `install.sh help` prints subcommand usage.
- `install.sh doctor` diagnoses without changing anything: python deps
  importable, udev rule present, Elgato device visible (lsusb vendor
  0fd9), device openable, daemon running or not, autostart state, stale
  legacy units or desktop entries. Every FAIL prints the exact fix
  command. The daemon's USB-permissions help message (device.py) points
  at `./install.sh doctor` instead of the deleted setup-udev-rules.sh.
- README Quick Start becomes exactly three steps: clone, `./install.sh`,
  `./configure`.

### Decision 6: Fix the double-autostart footgun

Current setup enables BOTH a desktop entry and a systemd unit that exec the
daemon with no running-instance guard. install.sh installs ONLY the systemd
user unit; the unit gains `ExecStartPre` guard via `start`'s existing
already-running check, and imports the session environment
(`systemctl --user import-environment DISPLAY DBUS_SESSION_BUS_ADDRESS` at
login via the unit's documentation, not frozen values). `install.sh
autostart` removes any existing desktop-entry autostart file it finds.

### Decision 7: Script-authoring toolkit

Implements the script-authoring delta spec
(openspec/changes/phase-1-foundation/specs/script-authoring/spec.md) - the
spec is the contract; key implementation notes:
- lib/sdp-helpers.sh: pure bash, no dependencies beyond coreutils +
  notify-send fallback. Resolve SDP_HOME as
  `${SDP_HOME:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}`.
- The daemon exports SDP_HOME into action script environments in
  actions.execute_script (add to env in the Popen call).
- templates/: app-launch.sh, keystroke.sh (xdotool), toggle.sh (uses
  sdp_toggle + sdp_set_label), command-notify.sh, status-monitor.sh
  (loop + sdp_set_image).
- create-action rewrite (bash): flags --template --target --label --force
  plus interactive prompts when flags absent. Target validation regex:
  `^(button-[1-8](-longpress)?|dial-[1-4]-(cw|ccw|press|longpress)|touch-[1-4](-longpress|-swipe-(up|down|left|right))?|longswipe-(left|right))$`.
  Maps target prefix to directory (button->buttons/, dial->dials/,
  touch|longswipe->touchscreen/).
- docs/WRITING-ACTIONS.md structure: 1) contract table (every element ->
  filename), 2) 60-second quickstart via create-action, 3) helper API
  reference with one example each, 4) one worked example per template,
  5) testing without the device, 6) troubleshooting (journalctl command,
  permissions).

### Decision 8: Root simplification and repo layout

The repo root is the product's front door. After phase 1 it SHALL contain
ONLY these entries (this whitelist is the contract; the repo-layout delta
spec makes it checkable):

```
Files:   README.md  LICENSE  install.sh  start  stop  configure
         create-action  mise.toml
Dirs:    streamdeckpro/  buttons/  dials/  touchscreen/  examples/
         templates/  lib/  listeners/  utils/  icons/  images/  macros/
         docs/  tests/  configurator-electron/  openspec/  logs/
Hidden:  .brightness  .device-info.json  .gitignore  .github/  .claude/
         .opencode/  (plus tool caches like .git, .venv)
```

Rule of thumb: root files are things a user runs (install.sh, start, stop,
configure, create-action) or reads first (README, LICENSE). Everything
else lives in a directory named for what it is.

How existing root clutter gets there:
- Deleted outright: StreamDeckPro.old/, custom-scripts-backup/,
  .cleanup-archive/, daemon.log, `touchscreen/touch-4 (conflicted copy).png`
  (Nextcloud sync artifact), and the setup/listener scripts absorbed by
  Decisions 4-5.
- Moved to utils/: convert-icon.py, download-icons.sh, record-macro.sh,
  update-status.sh. KNOWN REFERENCES that must be updated in the same task:
  configurator-electron/main.js and preload.js (reference root scripts by
  path), examples/dev-actions/play-macro.sh (record-macro.sh),
  touchscreen/touch-4.sh (cpu listener path - fixed anyway by Decision 4).
  After any move, re-grep the moved filename repo-wide (excluding
  node_modules, .git) and fix every hit.
- Moved to docs/archive/: SESSION-SUMMARY.md, SINGLE-INSTANCE.md,
  TESTING.md, CONFIGURATOR-CONSOLIDATED.md.
- Dead configurator v1 UI (configurator-electron/index.html + renderer.js,
  superseded by index-v2): delete after grep confirms nothing references
  them.
- README.md paths updated (install.sh, logs/, utils/); full rewrite is
  phase 4. docs/ gets a README.md index listing what each doc covers.

Timing: the SAFE moves (markdown files, utils/ scripts + their reference
updates) happen FIRST, before the refactor - they shrink the root
immediately and touch nothing the daemon executes. Deletions that need a
replacement (setup scripts, listeners) stay in their Decision 4/5 tasks.
The whitelist check runs in close-out.

## Gotchas for the implementer

- The daemon is RUNNING on a real device during this work. Never edit
  streamdeck-daemon.py in place mid-task; land the package, run tests, then
  swap the shim, then `./stop && ./start`.
- Long-press timers fire while the control is held; release must NOT double
  fire. The characterization tests must pin this before events.py moves.
- update_touchscreen composes ONE 800x100 image for all zones - zone updates
  are not independent writes.
- `.brightness` holds a HEX byte string (e.g. "FF"), not a percentage.
- execute_script uses start_new_session=True; keep it, or child scripts die
  with the daemon.
- Popen must keep running from any CWD: all paths absolute via config.py.
- Nextcloud syncs this directory; avoid creating files with spaces or
  colons, and never write temp files into watched dirs (touchscreen/ etc.)
  or the watcher re-renders in a loop.

## Risks / Trade-offs

- Characterization tests of callbacks require invoking them directly with
  FakeDeck; true HID behavior stays covered only by the HUMAN VERIFY task.
- Merging listeners changes systemd unit names; install.sh uninstall must
  disable the old units (`volume-status-listener`, `mute-status-listener`)
  if present.
