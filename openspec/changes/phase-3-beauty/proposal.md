# Proposal: Phase 3 - Beauty

## Why

The configurator works but looks like a dev tool. To be the go-to choice it
has to be the thing people screenshot: a live mirror of the physical deck,
smooth theming, animated keys, and touch-bar widgets that make the device
feel alive.

## What Changes

- **Configurator overhaul**: modernize the Electron UI (the current index-v2
  codebase): live device mirror driven by the daemon's rendered images,
  profile/page management UI (from phase 2), first-run onboarding flow,
  light/dark themes.
- **Widgets on the touch bar**: built on the phase-2 plugin API - clock,
  media now-playing with album art (MPRIS), system stats, weather. Shipped
  as example plugins with configurator toggles.
- **Animated icons**: GIF/APNG support on keys with frame-rate capping so
  CPU stays sane.
- **Icon pack format**: icons/<pack>/pack.json manifest; configurator
  browses packs; the existing icon set becomes the built-in pack.

## Capabilities

### New Capabilities
- `widgets`
- `icon-packs`

### Modified Capabilities
- `configurator`: full UI overhaul
- `daemon-core`: animated image rendering

## Non-goals

- Rewriting Electron away (stays Electron).
- Community pack hosting (phase 4 defines the sharing format).

## Migration Safety

Configurator changes cannot break the daemon: the filesystem contract stays
the only interface between them. Animated rendering ships behind a per-key
opt-in (presence of an animated file), static behavior unchanged.

## Impact

Detailed design and tasks are written AFTER phase-2 archives (widgets build
on the plugin API). UI design should lean on the existing Elgato-inspired
dark theme as the default.
