# Design: Phase 3 - Beauty

Targets the real phase-1/2 package. The headless, testable pieces (icon packs,
animated-frame extraction, dependency-free widgets) are implemented and tested;
the visual pieces (configurator overhaul, live mirror, on-device animation
timing, media/weather widgets) are specced and tasked for a session with a
display and the physical deck.

## Decision 1: An icon pack is a directory with a pack.json

`streamdeckpro/iconpacks.py` defines the format: a pack is any directory
containing `pack.json` (name/display_name/version required). Icons live beneath
it; the whole `icons/` tree is the built-in pack (icons/pack.json). Resolution
prunes nested packs so a pack never claims another's icons. Functions:
`validate_manifest`, `load_pack`, `list_packs`, `pack_icons`, `resolve_icon`.
No file moves - the existing category dirs stay where they are under builtin.

## Decision 2: Animated icons - static-first-frame now, timed loop later

`rendering.load_image_for_button` gained `.gif`/`.webp` so animated files show
frame 0 today (safe, static behavior unchanged for everything else).
`rendering.load_animation_frames(path, size, max_frames)` extracts frames +
durations (capped for CPU), and `is_animated(path)` gates it. The daemon loop
that actually cycles frames on the device is deferred: frame timing needs the
physical deck to verify the CPU cap and smoothness. The extraction is unit
tested with a generated GIF.

## Decision 3: Widgets are dependency-free plugins over the file-feedback path

`streamdeckpro/widgets.py` ships clock and system-stats widgets as long-running
plugins that repaint their element image (written into the active profile, so
they respect phase-2 profiles) and let the daemon hot-reload them. No new deps:
stats read /proc/stat and /proc/meminfo, the clock uses the stdlib. Render
functions take their data as arguments (`render_clock(size, time_text, ...)`,
`render_stats(size, cpu, mem)`) so they unit test without a clock or load.
Media (MPRIS/dbus) and weather (network) widgets are out of scope here - they
add dependencies and want visual review.

    python -m streamdeckpro.widgets clock --element touch-1 --interval 1
    python -m streamdeckpro.widgets stats --element touch-2 --interval 2

## Decision 4: Configurator overhaul is a separate visual pass

The Electron UI (live device mirror driven by the daemon's rendered images,
profile/page management UI, onboarding, light/dark themes) cannot be verified
headless. It is fully specced under the `configurator` capability and tasked,
but implementation happens with a display + Zach's review. The filesystem
contract remains the only daemon<->configurator interface, so this work can
never break the daemon.

## Gotchas

- `load_animation_frames` must `seek()` frames and stop on EOFError; a static
  PNG has no `n_frames` attr (default 1).
- Widget bars must clamp pct to 0..100 (a spiking load must not draw past the
  tile).
- Widgets write PNG into the ACTIVE profile dir, mirroring sdp-helpers, so a
  widget follows profile switches.
