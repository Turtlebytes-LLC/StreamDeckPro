# Configurator

## Purpose
An Electron desktop app (configurator-electron/, Electron 28, no framework, vanilla JS renderer loading index-v2.html) that edits the filesystem-as-config layout visually: it reads and writes the same script, image, and label files the daemon polls.

## Requirements

### Requirement: Single Instance
The configurator SHALL enforce a single running instance at two layers: the `configure` wrapper script uses a `.configurator.lock` PID file (raising the existing window via `wmctrl` when possible), and Electron's `requestSingleInstanceLock` quits duplicates and restores/focuses the existing window on a second launch attempt.

#### Scenario: Second launch
- **WHEN** `./configure` is run while the configurator is already open
- **THEN** no second window opens and the existing window is focused

### Requirement: Sandboxed IPC Bridge
All privileged operations SHALL go through `preload.js` (contextIsolation on, nodeIntegration off), exposing a `window.api` of IPC handlers in `main.js`: file read/write/delete/exists, directory listing (flat and recursive), copy, chmod 0755, image-as-base64, file dialogs, arbitrary `exec-command`, daemon restart, autostart check/toggle, Chrome profile listing, CPU usage, and macro recording. Directory paths are resolved relative to the app's parent directory (the project root).

#### Scenario: Renderer needs a script written
- **WHEN** the renderer assigns an action
- **THEN** it calls `window.api.writeFile` then `window.api.makeExecutable`, and the daemon picks the result up via file polling

### Requirement: Element Selection with Multi-Action Panels
The UI SHALL present the Stream Deck Plus layout (8 buttons, 4 dials, 4 touch zones) and expose every action of the selected element: buttons get Press + Long, dials get CW + CCW + Press + Long, touch zones get Tap + Long + Swipe Up/Down/Left/Right. Assigning an action writes the corresponding `<element>-<n>[-<action>].sh` file.

#### Scenario: Editing a dial
- **WHEN** a dial is selected
- **THEN** four independently configurable action slots (CW, CCW, Press, Long) are shown

### Requirement: Drag and Drop Assignment
Each element SHALL expose per-action drop zones on hover. Dropping a file dispatches by type: `.desktop` files are parsed for Name, Exec, and Icon and auto-configure script, label, and icon together; `.exe` files generate a `wine "<path>"` launcher; other executables generate a direct `"<path>"` launcher. Unsupported types show an error toast.

#### Scenario: Dropping a .desktop file
- **WHEN** a `.desktop` file is dropped on button 5's Press zone
- **THEN** `buttons/button-5.sh` launches the app's Exec command, `button-5.txt` gets the app name, and the app icon is converted and saved as the button image

### Requirement: Icon Library
The configurator SHALL provide an icon library modal backed by the project `icons/` directory, with category and color filtering and preview; choosing an icon copies/renders it to the selected element's image sidecar file. (README advertises "4000+ icons"; the actual count is whatever is present in `icons/`.)

#### Scenario: Assigning an icon
- **WHEN** an icon is picked from the library for touch zone 2
- **THEN** the image file is written as `touchscreen/touch-2.png` and the live device updates via daemon polling

### Requirement: Settings Panel
The settings modal SHALL provide:
- Brightness slider: reads the current value from `.brightness` (hex byte to percent) and on change writes the percent back as a two-digit hex byte; the daemon applies it via its mtime watch - no IPC to the daemon
- Autostart toggle: `systemctl --user enable|disable streamdeck`, with state read from `systemctl --user is-enabled streamdeck`
- Daemon restart: `systemctl --user restart streamdeck`

#### Scenario: Brightness change
- **WHEN** the slider is moved to 50%
- **THEN** `.brightness` is written with hex `80` and a success toast confirms; the device dims within ~0.5 s

### Requirement: Auxiliary Assignment Helpers
The configurator SHALL also support: listing installed Google Chrome profiles (parsed from `~/.config/google-chrome/*/Preferences`) so URL-launcher actions can target a profile, and macro recording, which spawns `utils/macro-recorder.py` in an auto-detected terminal emulator (konsole, gnome-terminal, xfce4-terminal, xterm, alacritty, kitty, or terminator) and saves the result to `macros/<element>-<n>.json`.

#### Scenario: No terminal emulator found
- **WHEN** macro recording is requested and none of the known terminals is installed
- **THEN** the operation fails with an error asking the user to install one
