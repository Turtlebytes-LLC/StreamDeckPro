# Beauty: Icon Packs, Animated Icons, Widgets

Phase 3 makes the deck look alive. Three pieces work headless today; the
configurator overhaul and on-device animation are the visual follow-ups.

## Icon packs

An icon pack is a directory with a `pack.json` manifest:

```json
{ "name": "builtin", "display_name": "Built-in Icons", "version": "1.0.0" }
```

Icons (png/svg/jpg/gif) live beneath it. The whole `icons/` tree is the
built-in pack. Drop another pack under `icons/<yourpack>/` with its own
pack.json and it is discovered automatically.

```python
from streamdeckpro import iconpacks
iconpacks.list_packs("icons")            # [{name, display_name, version, path}, ...]
iconpacks.resolve_icon("icons", "play")  # Path to the first matching icon
```

## Animated icons

Drop a `.gif` (or `.webp`) at `button-N.gif` and it renders its first frame
today - static behavior for everything else is unchanged. Frame extraction for
the upcoming animation loop is available now:

```python
from streamdeckpro import rendering
frames, durations = rendering.load_animation_frames("button-1.gif", (120, 120))
```

The daemon loop that cycles frames on the device (with a CPU-friendly frame cap)
is a follow-up - it needs the physical deck to tune.

## Widgets

Widgets are long-running plugins that repaint a key or touch zone. They write
into the active profile, so they follow profile switches, and hot-reload like
any other element. Two ship dependency-free:

```bash
python -m streamdeckpro.widgets clock --element touch-1 --interval 1
python -m streamdeckpro.widgets stats --element touch-2 --interval 2
```

- **clock** - time + date, stdlib only
- **stats** - CPU/MEM bars from /proc

Planned (need deps / review): **media** now-playing via MPRIS, **weather** via a
network API.
