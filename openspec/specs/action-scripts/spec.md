# Action Scripts

## Purpose
All configuration is plain files on disk: each control action is an executable bash script named by convention, with optional sibling image and label files. There is no database or config file format.

## Requirements

### Requirement: Filesystem-as-Config Naming Convention
The system SHALL locate all behavior via fixed paths relative to the project root, with 1-indexed element numbers:
- `buttons/button-N.sh` and `buttons/button-N-longpress.sh`
- `dials/dial-N-cw.sh`, `dial-N-ccw.sh`, `dial-N-press.sh`, `dial-N-longpress.sh`
- `touchscreen/touch-N.sh`, `touch-N-longpress.sh`, `touch-N-swipe-{up,down,left,right}.sh`
- `touchscreen/longswipe-left.sh` and `longswipe-right.sh`
The daemon creates the `buttons/`, `dials/`, and `touchscreen/` directories at startup if missing.

#### Scenario: Assigning an action
- **WHEN** an executable script is placed at `dials/dial-1-cw.sh`
- **THEN** rotating dial 1 clockwise runs that script with no daemon restart required

### Requirement: Scripts Are Plain Executable Bash
Action scripts SHALL be self-contained executables (typically bash one-liners calling tools like `pactl`, `xdotool`, `playerctl`, `notify-send`). The daemon runs them detached in a new session and ignores their exit status and output; a slow or hung script does not block event handling.

#### Scenario: Script hangs
- **WHEN** an action script blocks indefinitely
- **THEN** the daemon remains responsive because scripts are spawned with Popen in a new session and never awaited

### Requirement: Auto-Generated Script Templates
The daemon SHALL auto-create any missing script the first time its action fires, containing a shebang, a comment, a `notify-send "Stream Deck" "<Action Description>"` call, and commented usage examples, chmod 0755. Non-executable scripts are chmodded to 0755 before execution.

#### Scenario: Fresh install first touch
- **WHEN** touch zone 2 is tapped before any configuration exists
- **THEN** `touchscreen/touch-2.sh` appears on disk as an executable notification stub and runs immediately

### Requirement: Optional Appearance Sidecar Files
Each button and touch zone SHALL support optional sidecar files sharing the element's base name:
- `<element>.png` / `.jpg` / `.jpeg` / `.svg` - display image
- `<element>.txt` - text label overlaid on the image or default tile
- `<element>-position.txt` - label position: `top`, `middle`, or `bottom`
- `<element>-fontsize.txt` - label size, integer 10-60
Dials have no display and therefore no sidecar files.

#### Scenario: Label-only button
- **WHEN** only `buttons/button-8.txt` exists
- **THEN** the button renders the default dark tile with the label drawn at the bottom in the default 24 px font

### Requirement: Examples Library
The repository SHALL ship an `examples/` directory of ready-made action scripts (media keys, screenshots via flameshot, window tiling, clipboard, lock/suspend, app launchers, etc.) plus `power-user/`, `dev/`, and `dev-actions/` subsets. These are installed by copying a script to the conventional path, which the Electron configurator does on the user's behalf.

#### Scenario: Installing an example
- **WHEN** `examples/media-play-pause.sh` is copied to `buttons/button-2.sh` and marked executable
- **THEN** button 2 toggles media playback

### Requirement: Dynamic Displays via Script-Written Files
Long-running helper scripts SHALL be able to drive live displays by rewriting sidecar files (e.g. regenerating `touchscreen/touch-4.png` or `touch-2.txt`); the daemon's 0.5 s file polling picks the change up automatically. Python image generators (`generate-volume-image.py`, `generate-cpu-chart.py`, `touchscreen/generate-volume-image.py`, `buttons/generate-sysinfo-image.py`, etc.) render these images.

#### Scenario: CPU chart zone
- **WHEN** a background monitor rewrites `touchscreen/touch-4.png` with a fresh chart
- **THEN** the touchscreen zone updates within about a second without any IPC to the daemon
