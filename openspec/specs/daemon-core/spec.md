# Daemon Core

## Purpose
The daemon (streamdeck-daemon.py, single-file Python) connects to an Elgato Stream Deck, renders button and touchscreen displays from files on disk, and dispatches every hardware event to an executable shell script named by convention.

## Requirements

### Requirement: Device Connection and Profiles
The daemon SHALL enumerate Stream Deck devices via the StreamDeck DeviceManager, open the first device found, reset it, and select a device profile (button count/layout/size, dial count, touchscreen geometry) by matching the reported deck type against a built-in profile table covering Mini, Original, MK.2, XL, Plus, Pedal, and Neo. Unknown devices fall back to a 15-button default profile. On connect the daemon writes device type, serial, firmware, and profile to `.device-info.json` for the configurator to read.

#### Scenario: Stream Deck Plus connected
- **WHEN** the daemon starts with a Stream Deck Plus attached
- **THEN** it uses the Plus profile: 8 buttons (4x2, 120x120 px), 4 dials, and an 800x100 touchscreen split into 4 zones of 200 px each, and registers key, dial, and touchscreen callbacks

#### Scenario: Multiple devices attached
- **WHEN** more than one Stream Deck is enumerated
- **THEN** the daemon logs all devices but only opens and uses the first one (multi-device is not supported)

#### Scenario: Device open fails on reset
- **WHEN** the device is found but `reset()` raises (typically a USB permissions problem)
- **THEN** the daemon logs a multi-line USB permissions help message pointing at `setup-udev-rules.sh`, closes the deck, and `connect_device` returns failure

### Requirement: Automatic Reconnect on Unplug or KVM Switch
The daemon SHALL detect device removal and re-attachment and recover without a restart. Every 2 seconds the main loop re-enumerates USB devices; if the daemon believes it is connected but enumeration finds no device, it marks itself disconnected and closes the deck. If disconnected and a device appears, it reconnects (rate-limited to one attempt per 2 seconds) and re-renders all buttons and the touchscreen. Additionally, HID/USB/device errors raised while pushing images mark the connection as lost, triggering the same reconnect path.

#### Scenario: USB re-plug
- **WHEN** the Stream Deck is unplugged and plugged back in
- **THEN** the daemon logs the unplug, polls until enumeration sees the device again, reconnects, and reloads all displays

#### Scenario: Image write fails with HID error
- **WHEN** `set_key_image` or `set_touchscreen_image` raises an error whose message contains "hid", "device", or "usb"
- **THEN** the daemon marks the device disconnected so the main loop begins reconnect attempts

### Requirement: Event Dispatch to Scripts by Filename Convention
The daemon SHALL translate every hardware event into execution of a specific script path (1-indexed element numbers):
- Button N release: `buttons/button-N.sh`; hold >= 0.5 s: `buttons/button-N-longpress.sh` (fired by a timer while still held; the subsequent release then runs nothing)
- Dial N rotation: `dials/dial-N-cw.sh` (value > 0) or `dials/dial-N-ccw.sh`; short press release: `dials/dial-N-press.sh`; hold >= 0.5 s: `dials/dial-N-longpress.sh`
- Touch zone N tap (SHORT event): `touchscreen/touch-N.sh`; long press (LONG event or 0.5 s drag-hold timer): `touchscreen/touch-N-longpress.sh`
- Swipe within the zone where the gesture started: `touchscreen/touch-N-swipe-{up,down,left,right}.sh`, direction chosen by whether |dx| exceeds |dy|
- Edge-to-edge long swipes: `touchscreen/longswipe-right.sh` (start within the left 10% of the strip and dx > 50) and `touchscreen/longswipe-left.sh` (start within the right 10% and dx < -50)

#### Scenario: Short button press
- **WHEN** button 3 is pressed and released in under 0.5 seconds
- **THEN** the daemon cancels the long-press timer and executes `buttons/button-3.sh`

#### Scenario: Long dial press
- **WHEN** dial 2 is held for 0.5 seconds
- **THEN** `dials/dial-2-longpress.sh` runs while the dial is still held, and the release does not also fire `dial-2-press.sh`

#### Scenario: Swipe in a touch zone
- **WHEN** a drag starting in zone 1 moves more than 30 px (the minimum swipe distance) with |dx| > |dy| and dx > 0, and does not start at a strip edge
- **THEN** `touchscreen/touch-1-swipe-right.sh` executes and the zone's pending tap/long-press is cancelled

#### Scenario: Drag ends without a release event
- **WHEN** DRAG events stop arriving for 0.2 seconds (the swipe completion timer)
- **THEN** the daemon completes the swipe from accumulated coordinates rather than waiting for a SHORT event

### Requirement: Script Execution Model
The daemon SHALL execute action scripts detached: `subprocess.Popen` with `start_new_session=True`, never waiting for completion. If the target script does not exist, the daemon SHALL create it from a template (bash shebang plus a `notify-send` of the action description) and mark it 0755. If the script exists but is not executable, the daemon chmods it to 0755 before running.

#### Scenario: Unassigned control is used
- **WHEN** a button with no script is pressed
- **THEN** the daemon writes a template `button-N.sh` that sends a desktop notification, makes it executable, and runs it

### Requirement: Display Rendering from Files
The daemon SHALL render each button and touch zone from files in its directory, in priority order: `<element>.svg` (only if cairosvg is importable; currentColor recolored to white on black), then `<element>.png`/`.jpg`/`.jpeg` (aspect-ratio-preserving resize, centered on black), else a default tile (dark gray with the element number for buttons; for touch zones a green-tinted "assigned" tile if `<zone>.sh` exists, gray "Zone N" otherwise). A `<element>.txt` label, if present, is overlaid in white DejaVu Sans Bold on a translucent black band, wrapped to at most 2 lines. `<element>-position.txt` selects top/middle/bottom (default: bottom for buttons, middle for touch zones) and `<element>-fontsize.txt` selects a 10-60 px size (default: 24 for buttons, 28 for touch zones). Images are pushed to the device as JPEG quality 95; the touchscreen is composed as one 800x100 strip with 4 px black dividers between zones.

#### Scenario: Button with image and label
- **WHEN** `buttons/button-1.png` and `buttons/button-1.txt` both exist
- **THEN** the button shows the resized image with the label text drawn over it at the configured position

#### Scenario: SVG present without cairosvg
- **WHEN** a `.svg` file exists but cairosvg is not installed
- **THEN** the daemon silently falls back to raster images or the default tile

### Requirement: Hot Reload via File Polling
The daemon SHALL poll for configuration changes in its main loop (loop sleeps 0.5 s; reload check throttled to every 0.5 s). It stats a fixed candidate list of display-affecting files - for each button and touch zone: `.png/.jpg/.jpeg/.svg/.txt` plus `-position.txt` and `-fontsize.txt` - and on any new, modified, or deleted file it re-renders all buttons and the whole touchscreen. Script (`.sh`) changes are not watched; scripts are read fresh on each execution anyway. Dial files are not polled (dials have no display).

#### Scenario: Icon replaced on disk
- **WHEN** `touchscreen/touch-4.png` is overwritten (e.g. by a status listener)
- **THEN** within roughly one second the daemon detects the mtime change and redraws all displays

### Requirement: Brightness via .brightness File
The daemon SHALL read display brightness from a `.brightness` file in the project root containing a hex byte (00-FF), converted to a 0-100 percentage. It is read at connect time and re-checked by mtime every loop iteration; a changed value is applied with `set_brightness`. Missing or unparseable files fall back to 100%.

#### Scenario: Configurator changes brightness
- **WHEN** `.brightness` is rewritten with a new hex value
- **THEN** the daemon detects the mtime change within ~0.5 s and applies the new brightness without restart

### Requirement: Logging
The daemon SHALL log all activity at INFO level both to stdout and to `daemon.log` in the project root. The log file is appended forever with no rotation or size cap (it has grown past 200 MB in practice).

#### Scenario: Long-running daemon
- **WHEN** the daemon runs for weeks with frequent events and file polling
- **THEN** `daemon.log` grows unboundedly; nothing in the system truncates it
