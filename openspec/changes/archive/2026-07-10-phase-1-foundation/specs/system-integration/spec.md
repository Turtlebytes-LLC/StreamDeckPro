# System Integration (Phase 1 deltas)

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Autostart via Two Redundant Mechanisms

Autostart SHALL use exactly one mechanism: a systemd user unit whose start
path guards against an already-running instance. `install.sh autostart`
SHALL remove any legacy desktop-entry autostart file so only one instance
ever launches at login.

#### Scenario: login starts exactly one daemon
- **WHEN** the user logs in with autostart installed
- **THEN** `pgrep -fc streamdeckpro` reports 1

## REMOVED Requirements

### Requirement: Volume Status Listener (Touch Zone 1)

**Reason**: replaced by the unified status listener below (the standalone
volume listener wrote to a nonexistent hardcoded directory and never worked).

### Requirement: Mute Status Listener (Touch Zone 2)

**Reason**: replaced by the unified status listener below.

### Requirement: CPU Listener (Touch Zone 4)

**Reason**: replaced by the unified status listener below.

## ADDED Requirements (listeners)

### Requirement: Unified Status Listener

The system SHALL provide `listeners/status-listener.sh <kind> <zone>` with
kinds volume, mute, and cpu, generating the zone image via
`listeners/generate-status-image.py --kind <kind>`. All paths SHALL be
resolved relative to the script location (no $HOME hardcodes). A systemd
template unit `streamdeck-listener@.service` SHALL run any kind:zone pair.

#### Scenario: volume listener updates its zone
- **WHEN** `listeners/status-listener.sh volume 1` runs and system volume changes
- **THEN** `touchscreen/touch-1.png` is rewritten and the daemon hot-reload displays it within ~1 s

#### Scenario: no stale home paths
- **WHEN** `grep -rn 'streamdeck-actions' listeners/ install.sh` runs
- **THEN** there are no matches
