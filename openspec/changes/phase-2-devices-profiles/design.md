# Design: Phase 2 - Devices, Profiles, Plugins

This design targets the real phase-1 package layout (streamdeckpro/ with
config, device, events, watcher, daemon, rendering, actions, logging_setup),
per roadmap Decision 1.

## Decision 1: "default" profile IS the legacy top-level dirs (no migration)

The proposal floated moving buttons/dials/touchscreen into profiles/default/
during install. Rejected: a directory move on a daemon in daily use is the
riskiest possible migration. Instead the `default` profile *maps to* the
existing top-level dirs. profiles/<name>/ holds only additional profiles.

Consequences:
- Zero-move migration. A phase-1 setup with no `.profile` behaves identically.
- `.profile` absent/empty/"default" -> top-level dirs. Any other name ->
  profiles/<name>/. A named profile whose dir is missing safely falls back to
  top-level and logs a warning (never crashes, never a blank deck).

## Decision 2: ProfileManager duck-types as the config module

Events, watcher, and daemon rendering all resolve element scripts/images from
`config.BUTTONS_DIR` / `DIALS_DIR` / `TOUCH_DIR`. Rather than thread a new
resolver argument through every call site (and break the 32 characterization
tests), introduce `streamdeckpro/profiles.py::ProfileManager(config)` that:
- exposes `BUTTONS_DIR`/`DIALS_DIR`/`TOUCH_DIR` as **live properties** reading
  the active profile on every access, and
- delegates every other attribute to the wrapped config via `__getattr__`.

The daemon builds `self.paths = ProfileManager(config)` once and hands it to
EventDispatcher and FileWatcher in place of `config`; rendering reads
`self.paths.BUTTONS_DIR`. DeviceConnection keeps the raw config (it deals with
hardware, not layout). Because properties resolve per-access, a profile switch
takes effect on the very next gesture with no re-wiring.

Signatures (implemented):
- `ProfileManager.active_profile_name() -> str`
- `ProfileManager.list_profiles() -> list[str]`  ("default" first)
- properties `BUTTONS_DIR`, `DIALS_DIR`, `TOUCH_DIR`
- `__getattr__` delegation to config

New config constants: `PROFILES_DIR = SDP_HOME/"profiles"`,
`PROFILE_FILE = SDP_HOME/".profile"`.

## Decision 3: profile switch is a file write + hot-reload, like brightness

`.profile` is watched exactly like `.brightness`. `FileWatcher.check_profile_change()`
compares both the resolved active name and the file mtime; on change it clears
`file_mtimes` (so the new layout's images register as fresh) and calls the
redraw callback. The daemon calls it once per 0.5s loop after brightness.

Built-in switch actions are plain bash using new sdp-helpers functions -
nothing in the daemon special-cases them:
- `sdp_active_profile`, `sdp_profile_root`, `sdp_list_profiles`
- `sdp_switch_profile <name>`, `sdp_cycle_profile [next|prev]`
`_sdp_element_dir` becomes profile-aware so `sdp_set_label`/`sdp_set_image`
from a long-running action write into the active profile's dir.

Installer: `./install.sh profile [list|create <name>|use <name>]` scaffolds
profiles/<name>/{buttons,dials,touchscreen} and sets `.profile`.

## Decision 4: multi-model is device-layer only (mostly already done)

`config.DEVICE_PROFILES` already tables Mini/Original/MK.2/XL/Plus/Neo/Pedal.
`DeviceConnection.get_device_profile` matches by name; daemon rendering and
event setup already gate on `profile['buttons']`, `profile['dials']`,
`profile.get('touchscreen')`. The remaining work is verification on a real
non-Plus device and confirming the no-dial / no-touchscreen paths. No new
abstractions - a Mini simply has dials=0 and touchscreen=None and the existing
guards skip those code paths.

## Decision 5: app-switching is an opt-in sidecar, NOT in the daemon hot path

Mapping focused-window -> profile runs as a standalone poller
(`streamdeckpro/appswitch.py`, runnable as `python -m streamdeckpro.appswitch`),
mirroring the existing status-listener pattern. It writes `.profile`; the daemon
reacts via Decision 3. Keeping it out of the daemon loop means a flaky
xdotool/hyprctl call can never stall or crash the deck.

Detection is pluggable: try Hyprland (`hyprctl activewindow`), then X11
(`xdotool getactivewindow getwindowclassname`). Mapping lives in
`app-profiles.conf` (`window_class = profile`, one per line, `#` comments).
Pure functions (`load_mapping`, `resolve_profile`, `decide_switch`) are unit
tested; the subprocess detection is monkeypatched in tests.

## Decision 6: Plugin API v1 - deferred to its own implementation pass

Long-running action processes with daemon-managed lifecycle (spawn, restart on
death, kill on profile switch) change the daemon's execution model and want a
hardware verify plus Zach's review. Phase-1 already gives long-running actions
a two-way channel for free: they call `sdp_set_label`/`sdp_set_image`, which
write element files the watcher hot-reloads. This design specs the v1 protocol
and tasks it; implementation is a follow-up so it is not rushed alongside the
profile reshaping.

## Gotchas

- ProfileManager must set `_config` via `object.__setattr__` so `__getattr__`
  never recurses before `_config` exists.
- `check_profile_change` must tolerate a plain config (the watcher tests pass a
  bare SimpleNamespace with no `active_profile_name`) - it catches AttributeError
  and returns False.
- `.profile` writes from bash must strip trailing newline handling on read
  (both Python and bash strip whitespace).
- Cycle uses bash `mapfile` - it is bash-only; templates are `#!/bin/bash`.
