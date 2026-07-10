# System Integration

## Purpose
Shell scripts and unit files that make the daemon start at login, grant USB access without root, and run background status listeners that feed live data onto the touchscreen.

## Requirements

### Requirement: udev Rules for USB Access
`setup-udev-rules.sh` SHALL install `/etc/udev/rules.d/70-streamdeck.rules` granting MODE 0666, GROUP plugdev, and TAG uaccess for Elgato vendor ID 0fd9 - per-product rules for Mini/Original/MK.2/XL/Plus/Pedal/Neo plus a vendor-wide catch-all - on both the usb subsystem and hidraw kernel devices. The script self-elevates via sudo, creates the plugdev group if missing, adds the invoking user to it, reloads and triggers udev, and chmods any already-present `/dev/hidraw*` nodes.

#### Scenario: First-time setup
- **WHEN** `./setup-udev-rules.sh` is run and the device is re-plugged
- **THEN** the daemon can open the Stream Deck without root

### Requirement: Autostart via Two Redundant Mechanisms
`setup-autostart.sh` SHALL configure both a desktop autostart entry (`~/.config/autostart/streamdeck.desktop`, Exec pointing at the `start` script) and a systemd user unit (`~/.config/systemd/user/streamdeck.service`, ExecStart pointing directly at `streamdeck-daemon.py`, Restart=on-failure, RestartSec=5), then enables the systemd unit. DISPLAY, XAUTHORITY, XDG_RUNTIME_DIR, and (when present) WAYLAND_DISPLAY and DBUS_SESSION_BUS_ADDRESS are captured at setup time and baked into the unit as static Environment lines. Quirk: both mechanisms are active at once; the desktop entry's `start` script refuses to launch a second daemon via pgrep, but the systemd unit runs the daemon directly with no such guard, so ordering at login determines which one wins. `remove-autostart.sh` undoes both.

#### Scenario: Login
- **WHEN** the user logs in with autostart configured
- **THEN** the daemon starts via systemd (or the desktop entry, whichever fires first) and auto-restarts on failure after 5 seconds

#### Scenario: Session environment changes
- **WHEN** the display or DBus address differs from what existed when setup ran (e.g. switching X11/Wayland)
- **THEN** the baked-in Environment values may be stale, breaking notifications and desktop integration until setup is re-run

### Requirement: start/stop Lifecycle Scripts
The `start` script SHALL: refuse to run if `streamdeck-daemon.py` is already running (pgrep), kill leftover monitor processes (`monitor*.sh`, `touch-N.sh`) and remove their `/tmp/streamdeck-*` PID/chart files, warn about hidraw permissions when an Elgato device (vendor 0fd9) is present, auto-run `touchscreen/touch-3.sh` (CPU monitor bootstrap) if it exists, then `exec` the daemon in the foreground. The `stop` script SHALL pkill the daemon, kill the same monitor processes, and clean the same temp files.

#### Scenario: Restarting cleanly
- **WHEN** `./stop` then `./start` is run
- **THEN** old monitor loops and stale temp files are removed before the daemon and monitors come back up

### Requirement: Volume Status Listener (Touch Zone 1)
`volume-status-listener.sh` SHALL subscribe to PulseAudio/PipeWire events (`pactl subscribe`, falling back to 2 s polling without pactl) and on every sink/server event render the current volume and mute state to a touch zone 1 image via `generate-volume-image.py`. Quirk: it hardcodes `ACTIONS_DIR="$HOME/streamdeck-actions"` and writes `$HOME/streamdeck-actions/touchscreen/touch-1.png` (creating that directory), so if the project lives elsewhere - as it does at `~/Nextcloud/StreamDeckPro` - the image lands outside the daemon's watched directory and the display never updates. A companion unit `volume-status-listener.service` (ExecStart `%h/StreamDeckPro/volume-status-listener.sh`, PartOf streamdeck.service, Restart=on-failure) is installed by `setup-volume-listener.sh`.

#### Scenario: Volume key pressed
- **WHEN** the system volume changes
- **THEN** the listener regenerates the volume image immediately from the pactl event (no polling delay), and the daemon redraws the zone if the image is inside its `touchscreen/` directory

### Requirement: Mute Status Listener (Touch Zone 2)
`mute-status-listener.sh` SHALL subscribe to sink events via `pactl subscribe` (falling back to `amixer` state plus 1 s polling) and write the label `Mute` or `Unmute` to `touchscreen/touch-2.txt` relative to its own directory, so the daemon's label polling flips the zone text. Quirk: the shipped `mute-status-listener.service` hardcodes `ExecStart=/home/zach2825/streamdeck-actions/mute-status-listener.sh`, a path that does not match the current project location.

#### Scenario: Toggling mute
- **WHEN** the default sink is muted
- **THEN** `touch-2.txt` becomes `Unmute` and the touchscreen zone re-renders with the new label within ~1 second

### Requirement: CPU Listener (Touch Zone 4)
`cpu-listener-zone4.sh` SHALL loop every `CPU_UPDATE_INTERVAL` seconds (default 5), sample CPU usage from two `/proc/stat` readings 0.2 s apart, and regenerate a rolling CPU chart image at `touchscreen/touch-4.png` via `generate-cpu-chart.py` - but only when usage changed by more than 2 percentage points, to avoid needless redraws.

#### Scenario: Idle system
- **WHEN** CPU usage stays within 2% of the last rendered value
- **THEN** no new image is written and the daemon performs no reload for zone 4
