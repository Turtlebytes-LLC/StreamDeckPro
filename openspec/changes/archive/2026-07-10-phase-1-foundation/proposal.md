# Proposal: Phase 1 - Foundation

## Why

Everything in the v2 vision (multi-device, profiles, plugins, a beautiful
configurator) needs module boundaries to plug into, and the project currently
has none: one 56K Python file, ~15 root-level setup scripts with overlapping
jobs, three copy-pasted status listeners, a 238M log file, and two directories
of legacy snapshots. Before any feature work, the codebase gets clean,
unified, tested, and installable - without the daemon on Zach's desk ever
going down.

## What Changes

1. **Test harness first.** pytest + a fake StreamDeck device layer so the
   refactor is verifiable. No refactor task lands before its safety net.
2. **Package split.** streamdeck-daemon.py becomes the `streamdeckpro/`
   package: device connection/reconnect, event dispatch, rendering,
   hot-reload watcher, and config paths as separate modules. `start`/`stop`
   entry points keep working identically.
3. **Structured logging + rotation.** Rotating file handler (10M x 3) plus
   journal-friendly output; delete the 238M daemon.log.
4. **Cleanup and unification.**
   - Delete StreamDeckPro.old/, custom-scripts-backup/, .cleanup-archive/
     (all captured in the 2026-07-10 backup).
   - Unify volume/mute/CPU listeners into one parameterized listener script
     and one Python image generator (they are near-copies today).
   - Collapse the setup-*.sh pile into a single `install.sh` with subcommands
     (udev, autostart, listeners) and delete the superseded scripts.
   - Consolidate overlapping root-level markdown docs into docs/.
5. **Script-authoring toolkit.**
   - lib/sdp-helpers.sh: sourceable helpers (sdp_notify, sdp_set_image,
     sdp_set_label, sdp_state_get/set, sdp_log, sdp_toggle).
   - templates/ with 5 starter action templates (app-launch, keystroke,
     toggle, command+notify, status-monitor).
   - `create-action` upgraded to an interactive scaffolder using templates.
   - docs/WRITING-ACTIONS.md: complete authoring guide with the helper API
     reference and a worked example per template.

## Capabilities

### New Capabilities
- `script-authoring`: helpers, templates, scaffolder, docs

### Modified Capabilities
- `daemon-core`: package split, logging, rotation (behavior unchanged)
- `system-integration`: unified installer and listeners (behavior unchanged)

## Non-goals

- No new daemon features (no profiles, plugins, or new devices - phase 2).
- No configurator changes beyond path fixes the package split forces (phase 3).
- No packaging for distros (phase 4).
- action-scripts contract untouched: existing buttons/dials/touchscreen
  scripts run unmodified.

## Migration Safety

The daemon is in daily use. Task order guarantees: tests exist before the
refactor; the package split ships behind the same `start`/`stop` commands;
old setup scripts are deleted only after `install.sh` reproduces their
behavior; every task ends with the daemon running. Deletions are covered by
the 2026-07-10 tarball and git bundle in ~/backups/.

## Impact

- streamdeck-daemon.py -> streamdeckpro/ package + thin launcher
- New: tests/, lib/sdp-helpers.sh, templates/, install.sh, docs/WRITING-ACTIONS.md
- Deleted: StreamDeckPro.old/, custom-scripts-backup/, .cleanup-archive/,
  superseded setup-*.sh and listener duplicates, daemon.log
