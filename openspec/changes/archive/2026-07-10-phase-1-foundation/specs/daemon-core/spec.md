# Daemon Core (Phase 1 deltas)

## ADDED Requirements

### Requirement: Python Package Structure

The daemon SHALL be organized as the `streamdeckpro` package (config,
logging_setup, rendering, events, actions, device, watcher, daemon modules)
runnable via `python -m streamdeckpro`. The legacy entry point
streamdeck-daemon.py SHALL remain as a shim delegating to the package so
`start`, `stop`, and existing systemd units work unchanged.

#### Scenario: legacy entry point still works
- **WHEN** `./start` runs after the split
- **THEN** the daemon starts exactly as before and `./stop` stops it

#### Scenario: package is importable and tested
- **WHEN** `python -m pytest tests/ -q` runs
- **THEN** all tests pass with no device attached

## MODIFIED Requirements

### Requirement: Logging

The daemon SHALL log at INFO level to stdout (journal-friendly) and to
`logs/daemon.log` via a rotating handler (10 MB per file, 3 backups).
Per-poll-iteration messages SHALL be DEBUG level. Nothing writes an
unbounded log file.

#### Scenario: Long-running daemon
- **WHEN** the daemon runs for weeks with frequent events
- **THEN** logs/ never exceeds ~40 MB across daemon.log and its 3 backups

### Requirement: Script Execution Model

The daemon SHALL execute action scripts detached: `subprocess.Popen` with
`start_new_session=True`, never waiting for completion, with `SDP_HOME` set
to the repo root in the child environment. If the target script does not
exist, the daemon SHALL create it from a template (bash shebang plus a
`notify-send` of the action description) and mark it 0755. If the script
exists but is not executable, the daemon chmods it to 0755 before running.

#### Scenario: Action script reads SDP_HOME
- **WHEN** any action script runs `echo "$SDP_HOME"`
- **THEN** it prints the repo root, letting it source lib/sdp-helpers.sh

#### Scenario: Unassigned control is used
- **WHEN** a button with no script is pressed
- **THEN** the daemon writes a template `button-N.sh` that sends a desktop notification, makes it executable, and runs it
