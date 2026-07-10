# Proposal: v2 Platform Upgrade

## Why

StreamDeckPro works great on one desk (Zach's), but it is a collection of scripts around a 56K single-file daemon. The vision is bigger: become THE go-to open-source Stream Deck management tool for Linux - beautiful, super functional, and trivially easy for anyone to install and adopt. Elgato has no Linux software; the existing alternatives (streamdeck-ui, Boatswain) are basic. There is a real gap to own.

## What Changes

This is a roadmap change: it defines the v2 program and breaks it into phased sub-changes. Each phase ships as its own OpenSpec change with its own specs/design/tasks.

### Phase 1: Foundation (make it maintainable)
- Split streamdeck-daemon.py into a proper Python package (device layer, event dispatch, rendering, hot-reload, plugin hooks) with tests.
- Log rotation and structured logging (the current daemon.log hit 238M).
- Cleanup and unification: remove StreamDeckPro.old/, custom-scripts-backup/, and .cleanup-archive/; unify the three near-identical status listeners (volume/mute/CPU) and three image generators into shared code; consolidate the ~15 overlapping root-level setup scripts and markdown docs. Duplicated logic gets one home, not another copy.
- One-command installer (curl | bash or pipx) replacing the pile of setup-*.sh scripts.
- Script-authoring toolkit: a shared bash helper library (lib/sdp-helpers.sh) actions can source for notifications, key image updates, and state; action templates + an upgraded `create-action` scaffolder; a WRITING-ACTIONS.md authoring guide. Writing a new action should take 60 seconds and zero reverse-engineering.

### Phase 2: Device + Profile Power (make it functional)
- Multi-device and multi-model support (Stream Deck MK.2, Mini, XL, Neo - not just Plus).
- Profiles and pages: switch entire layouts per app/context (folder-based, keeping the filesystem-as-config philosophy).
- Plugin/action API so actions can be more than bash scripts (long-running widgets, state, two-way feedback).
- App-aware auto-switching (active window changes profile).

### Phase 3: Beauty (make it gorgeous)
- Configurator overhaul: modern UI polish, live device mirror, theme support, animated icons/GIF support on keys.
- Widget system for touch bar: clock, media now-playing with album art, system stats, weather.
- Icon pack management and community icon pack format.

### Phase 4: Community (make it the go-to)
- Packaging: AUR, .deb, Flatpak.
- Docs site with quick start, action gallery, plugin authoring guide.
- Action/profile sharing format so users can import each other's setups.

## Capabilities

### New Capabilities
- `script-authoring`: helper library, templates, scaffolder, and authoring docs for writing actions
- `packaging-install`: one-command install and distro packages
- `profiles-pages`: multi-profile, multi-page layouts with auto-switching
- `plugin-api`: action plugin interface beyond fire-and-forget bash
- `widgets`: live touch-bar widgets
- `multi-device`: support for non-Plus Stream Deck models

### Modified Capabilities
- `daemon-core`: refactor to package, logging, config
- `configurator`: UI overhaul, live mirror, themes
- `action-scripts`: remains the compatibility layer - existing bash scripts keep working unchanged
- `system-integration`: consolidated installer replaces setup script pile

## Non-goals

- Windows/macOS support (Elgato covers those; Linux is the gap).
- Rewriting in another language (Python + Electron stay; the python-elgato-streamdeck library is solid).
- A cloud service or accounts. Everything stays local-first.
- Feature parity with Elgato's plugin store on day one.

## Migration Safety

The daemon on Zach's desk is in daily use. Every phase must keep the current filesystem-as-config contract working: buttons/*.sh, dials/*.sh, touchscreen/*.sh keep firing exactly as they do today. The refactored daemon ships behind the same `start`/`stop` entry points, and each phase ends with a verify step on the physical device before the old path is removed. Full backup taken 2026-07-10 (tarball + git bundle in ~/backups/).

## Impact

- `streamdeck-daemon.py` -> `streamdeckpro/` package (phase 1)
- `configurator-electron/` (phase 3)
- Root-level setup-*.sh scripts -> single installer (phase 1)
- New: profiles/, plugins/ directories (phase 2)
