# Configurator

## ADDED Requirements

### Requirement: Configurator overhaul (visual, HUMAN VERIFY)

The Electron configurator SHALL gain a live device mirror driven by the
daemon's rendered images, profile/page management UI (phase 2), a first-run
onboarding flow, an icon-pack browser (phase 3 icon-packs), and light/dark
themes. The filesystem contract remains the only daemon<->configurator
interface, so configurator changes SHALL NOT be able to break the daemon. This
requirement is implemented and verified in a session with a display; it is
tracked here so the phase is coherent.

#### Scenario: filesystem contract preserved
- **WHEN** the configurator writes a profile/element via the UI
- **THEN** it produces the same on-disk layout (profiles/<name>/... or top-level) the daemon reads, with no new IPC channel

#### Scenario: live mirror reflects the deck (HUMAN VERIFY)
- **WHEN** the daemon renders a button image and the configurator is open
- **THEN** the mirror shows the same image (verified visually by Zach)

#### Scenario: theme toggle (HUMAN VERIFY)
- **WHEN** the user toggles light/dark
- **THEN** the UI restyles without a restart (verified visually by Zach)
