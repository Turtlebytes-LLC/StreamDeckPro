# Profiles

A profile is a full layout - its own buttons, dials, and touchscreen zones.
Switch profiles to reshape the whole deck for what you are doing (work, gaming,
a specific app) without touching the daemon.

## How it works

- The **default** profile is the top-level `buttons/`, `dials/`, `touchscreen/`
  dirs. If you never make another profile, nothing changes from phase 1.
- **Named** profiles live under `profiles/<name>/{buttons,dials,touchscreen}/`.
- The active profile is the name in the `.profile` file at the repo root.
  Absent, empty, or `default` -> the top-level layout.
- Changing `.profile` hot-reloads the deck within ~0.5s. A named profile whose
  directory is missing safely falls back to the default layout.

## Managing profiles

```bash
./install.sh profile list            # show profiles, * marks the active one
./install.sh profile create work     # scaffold profiles/work/{buttons,dials,touchscreen}
./install.sh profile use work        # make 'work' active (daemon reloads)
./install.sh profile use default     # back to the top-level layout
```

## Switching from an action (button/dial/touch)

Source the helpers and call a switch function:

```bash
source "$SDP_HOME/lib/sdp-helpers.sh"
sdp_switch_profile work      # jump to a named profile
sdp_cycle_profile next       # cycle default -> gaming -> work -> default
sdp_cycle_profile prev       # cycle the other way
sdp_active_profile           # echo the current profile name
```

Ready-made templates: `templates/switch-profile.sh`, `templates/cycle-profile.sh`.

## App-aware auto-switching (optional)

Map focused windows to profiles and let the deck follow you:

```bash
cp app-profiles.conf.example app-profiles.conf   # edit: window_class = profile
python -m streamdeckpro.appswitch                # run the poller (or add a systemd unit)
```

It runs as a standalone sidecar - if the window-manager query hiccups, the deck
is never affected. Find a window's class with `hyprctl activewindow` (Hyprland)
or `xdotool getactivewindow getwindowclassname` (X11).
