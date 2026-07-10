# System Integration

## Purpose
Shell scripts and unit files that make the daemon start at login, grant USB access without root, and run background status listeners that feed live data onto the touchscreen.
## Requirements
### Requirement: udev Rules for USB Access
`setup-udev-rules.sh` SHALL install `/etc/udev/rules.d/70-streamdeck.rules` granting MODE 0666, GROUP plugdev, and TAG uaccess for Elgato vendor ID 0fd9 - per-product rules for Mini/Original/MK.2/XL/Plus/Pedal/Neo plus a vendor-wide catch-all - on both the usb subsystem and hidraw kernel devices. The script self-elevates via sudo, creates the plugdev group if missing, adds the invoking user to it, reloads and triggers udev, and chmods any already-present `/dev/hidraw*` nodes.

#### Scenario: First-time setup
- **WHEN** `./setup-udev-rules.sh` is run and the device is re-plugged
- **THEN** the daemon can open the Stream Deck without root

### Requirement: Autostart via Two Redundant Mechanisms

Autostart SHALL use exactly one mechanism: a systemd user unit whose start
path guards against an already-running instance. `install.sh autostart`
SHALL remove any legacy desktop-entry autostart file so only one instance
ever launches at login.

#### Scenario: login starts exactly one daemon
- **WHEN** the user logs in with autostart installed
- **THEN** `pgrep -fc streamdeckpro` reports 1

### Requirement: start/stop Lifecycle Scripts
The `start` script SHALL: refuse to run if `streamdeck-daemon.py` is already running (pgrep), kill leftover monitor processes (`monitor*.sh`, `touch-N.sh`) and remove their `/tmp/streamdeck-*` PID/chart files, warn about hidraw permissions when an Elgato device (vendor 0fd9) is present, auto-run `touchscreen/touch-3.sh` (CPU monitor bootstrap) if it exists, then `exec` the daemon in the foreground. The `stop` script SHALL pkill the daemon, kill the same monitor processes, and clean the same temp files.

#### Scenario: Restarting cleanly
- **WHEN** `./stop` then `./start` is run
- **THEN** old monitor loops and stale temp files are removed before the daemon and monitors come back up

### Requirement: Unified Installer

The system SHALL provide a single `install.sh` with subcommands `deps`,
`udev`, `autostart`, `listeners`, `all`, `uninstall`, `doctor`, and `help`,
replacing all setup-*.sh scripts. `uninstall` SHALL also disable the
pre-phase-1 listener units if present.

#### Scenario: help output
- **WHEN** `./install.sh help` runs
- **THEN** it prints usage naming all eight subcommands

### Requirement: Guided Setup

Running `./install.sh` with no arguments SHALL start an interactive guided
setup: numbered steps (deps, udev, device check, optional autostart,
optional listeners) each printing PASS/FAIL, asking before any system-state
change, and skippable. `install.sh all --yes` SHALL perform the same flow
non-interactively.

#### Scenario: declining every prompt changes nothing
- **WHEN** `echo n | ./install.sh` runs (all prompts declined)
- **THEN** it walks the steps, exits 0, and no udev rules or systemd units were added

### Requirement: Setup Diagnostics

`install.sh doctor` SHALL check, without modifying anything: python deps
importable, udev rule installed, Elgato device visible on USB (vendor
0fd9), device openable, daemon running state, autostart configuration, and
stale legacy units or desktop entries. Every failed check SHALL print the
exact command that fixes it. The daemon's USB-permissions error message
SHALL reference `./install.sh doctor`.

#### Scenario: healthy system
- **WHEN** `./install.sh doctor` runs on a fully configured machine with the device attached
- **THEN** every check prints PASS and the exit code is 0

#### Scenario: missing udev rule
- **WHEN** `./install.sh doctor` runs with no udev rule installed
- **THEN** the udev check prints FAIL followed by `./install.sh udev` as the fix, and the exit code is non-zero

