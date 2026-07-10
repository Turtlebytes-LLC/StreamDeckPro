# Proposal: Phase 2 - Devices, Profiles, Plugins

## Why

Phase 1 made the codebase modular; this phase makes the product powerful.
Today the daemon drives exactly one Stream Deck Plus with one static layout.
The go-to Linux tool needs to handle any Elgato model, multiple layouts that
follow what you are doing, and actions richer than fire-and-forget bash.

## What Changes

- **Multi-model support**: drive Mini, Original, MK.2, XL, and Neo, not just
  Plus. The device profile table already exists (streamdeckpro/config.py
  DEVICE_PROFILES); rendering and event dispatch learn to work without dials
  or touchscreen when the model lacks them. Multi-device (two decks at once)
  is stretch, single non-Plus device is the requirement.
- **Profiles and pages**: profiles/<name>/{buttons,dials,touchscreen}/ keeps
  the filesystem-as-config contract per profile. A `.profile` file in the
  repo root names the active profile; the daemon hot-reloads on change,
  exactly like `.brightness`. Built-in actions to switch/cycle profiles.
  The legacy top-level buttons/ etc. become the `default` profile via
  migration in install.sh.
- **App-aware auto-switching**: optional watcher maps the focused window
  class (X11 via xdotool, Wayland via compositor-specific fallbacks) to a
  profile.
- **Plugin/action API v1**: long-running action processes with a simple
  line-protocol on stdout to update their element's image/label/state, so
  actions get two-way feedback (e.g. a toggle that shows real state).
  Bash-only, no new runtime dependencies; sdp-helpers grows matching
  functions.

## Capabilities

### New Capabilities
- `profiles-pages`
- `multi-device`
- `plugin-api`

### Modified Capabilities
- `daemon-core`: profile-aware paths, model-conditional features
- `script-authoring`: helper additions for plugin protocol
- `system-integration`: profile migration in installer

## Non-goals

- UI for profile editing (phase 3).
- Non-Elgato hardware (Loupedeck etc.).
- A plugin marketplace or non-bash plugin runtimes.

## Migration Safety

The `default` profile migration is a directory move performed by install.sh
with the daemon stopped, reversible by moving directories back. If
`.profile` is absent the daemon behaves exactly as phase 1 (top-level dirs),
so nothing breaks for existing setups until the user opts in.

## Impact

Detailed design and tasks are written AFTER phase-1-foundation archives, per
the roadmap design Decision 1 - they must reference the real phase-1 module
layout, not a prediction of it.
