# Widgets

## ADDED Requirements

### Requirement: Dependency-free touch-bar widgets

The system SHALL ship clock and system-stats widgets as long-running plugins
that repaint their element image in the active profile, with no new runtime
dependencies (stats from /proc, clock from the stdlib). Render functions SHALL
take their data as arguments so they are testable, and SHALL clamp gauge values
to 0..100. Widgets run standalone: `python -m streamdeckpro.widgets <kind>
--element <e> --interval <s>`.

#### Scenario: clock renders at the requested size
- **WHEN** `render_clock((200,100), "13:37", "Fri 11")` runs
- **THEN** it returns a 200x100 RGB image

#### Scenario: stats clamps out-of-range values
- **WHEN** `render_stats((200,100), 150, -10)` runs
- **THEN** it returns a 200x100 image without raising

#### Scenario: data sources return percentages
- **WHEN** `read_mem_percent()` and `read_cpu_percent(sample=0.05)` run
- **THEN** each returns a float in 0..100

#### Scenario: widget writes into the active profile
- **WHEN** the active profile is `work` (profiles/work exists) and a widget writes touch-2
- **THEN** the image lands at `profiles/work/touchscreen/touch-2.png`

### Requirement: Media and weather widgets (design-only)

The system SHALL, in a follow-up change, add media (MPRIS/dbus) and weather
(network) widgets; they are NOT implemented here because they add runtime
dependencies and need visual review.

#### Scenario: documented as follow-ups
- **WHEN** docs describe the widget set
- **THEN** media and weather are listed as planned, not shipped
