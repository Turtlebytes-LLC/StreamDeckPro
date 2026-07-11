# Plugin API

## ADDED Requirements

### Requirement: Long-running action feedback via element files

The system SHALL let a long-running action script update its own element's image
and label while running, by writing the element's files through sdp-helpers; the
daemon SHALL reflect the change on the next hot-reload cycle. Writes SHALL land
in the active profile's directory.

#### Scenario: label write reaches the active profile
- **WHEN** an action calls `sdp_set_label button-1 hi` while profile `work` is active and profiles/work exists
- **THEN** the file `profiles/work/buttons/button-1.txt` contains `hi`

#### Scenario: hot-reload picks up an action's write
- **WHEN** a running action writes button-1.txt in the active profile's buttons dir
- **THEN** `FileWatcher.check_for_file_changes()` returns True on its next check

### Requirement: Plugin protocol v1 (design-only in this change)

The system SHALL define, but this change does NOT implement, a v1 line protocol
for daemon-managed long-running plugins: stdout lines `LABEL <element> <text>`,
`IMAGE <element> <path>`, `STATE <key> <value>`, parsed by the daemon which owns
the process lifecycle (spawn on start, restart on unexpected exit, terminate on
profile switch). Implementation is a dedicated follow-up with a hardware verify.

#### Scenario: protocol is documented
- **WHEN** docs/PLUGINS.md is present
- **THEN** it documents the LABEL/IMAGE/STATE lines and the lifecycle rules
