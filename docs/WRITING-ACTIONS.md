# Writing Actions

StreamDeckPro is filesystem-as-config: every control maps to a script file by
name. Drop an executable script at the right path and the daemon runs it when
that control is used. No restart needed - the daemon hot-reloads.

## 1. The contract: element -> filename

All paths are relative to the repo root.

| Control / gesture            | Script file                                 |
|------------------------------|---------------------------------------------|
| Button N press               | `buttons/button-N.sh`                       |
| Button N long press          | `buttons/button-N-longpress.sh`             |
| Dial N rotate clockwise      | `dials/dial-N-cw.sh`                         |
| Dial N rotate counter-cw     | `dials/dial-N-ccw.sh`                        |
| Dial N press                 | `dials/dial-N-press.sh`                      |
| Dial N long press            | `dials/dial-N-longpress.sh`                  |
| Touch zone N tap             | `touchscreen/touch-N.sh`                     |
| Touch zone N long press      | `touchscreen/touch-N-longpress.sh`          |
| Touch zone N swipe up/down   | `touchscreen/touch-N-swipe-up.sh` / `-down` |
| Touch zone N swipe left/right| `touchscreen/touch-N-swipe-left.sh` / `-right` |
| Screen-wide long swipe       | `touchscreen/longswipe-left.sh` / `-right`  |

Appearance is configured by sibling files:

| File                              | Purpose                              |
|-----------------------------------|--------------------------------------|
| `button-N.png` / `.jpg` / `.svg`  | button image (svg wins, then png/jpg)|
| `button-N.txt`                    | button label text                    |
| `button-N-position.txt`           | `top` / `middle` / `bottom`          |
| `button-N-fontsize.txt`           | label font size (10-60)              |
| `touch-N.png` / `.txt` / sidecars | same, for touchscreen zones          |

## 2. 60-second quickstart

```bash
./create-action --template app-launch --target button-3 --label "Files"
```

That copies a template to `buttons/button-3.sh`, marks it executable, and
writes the label. Edit the `EDIT HERE` block and you're done. Run
`./create-action` with no flags for an interactive walkthrough.

## 3. Helper API

Source the helper library at the top of any action script:

```bash
source "$SDP_HOME/lib/sdp-helpers.sh"
```

The daemon exports `SDP_HOME` (the repo root) into every action script's
environment, so this works from any control. Functions:

- `sdp_notify <title> <body>` - desktop notification (falls back to echo).
  ```bash
  sdp_notify "Build" "Deploy finished"
  ```
- `sdp_set_image <element> <path>` - set a button/zone image.
  ```bash
  sdp_set_image button-1 ~/icons/on.png
  ```
- `sdp_set_label <element> <text>` - set an element's text label.
  ```bash
  sdp_set_label touch-2 "Muted"
  ```
- `sdp_state_get <key>` - print a stored value (empty if unset).
  ```bash
  current=$(sdp_state_get mic_muted)
  ```
- `sdp_state_set <key> <value>` - persist a value under
  `${XDG_STATE_HOME:-$HOME/.local/state}/streamdeckpro/`.
  ```bash
  sdp_state_set mic_muted on
  ```
- `sdp_toggle <key>` - flip a boolean key; echoes the new value (`on`/`off`).
  ```bash
  state=$(sdp_toggle desk_lamp)
  ```
- `sdp_log <msg>` - timestamped line to the daemon journal namespace.
  ```bash
  sdp_log "lamp is now $state"
  ```

Internally the library resolves an element name to its directory with
`_sdp_element_dir` (buttons/, dials/, touchscreen/); you rarely call it directly.

## 4. Worked examples (one per template)

- **app-launch.sh** - set `APP="firefox"`; tapping the control launches it and
  notifies. Best for buttons that open apps.
- **keystroke.sh** - set `KEYS="ctrl+shift+t"`; sends a shortcut via `xdotool`
  (X11). Great for reopen-tab, screenshot, etc.
- **toggle.sh** - flips a state key with `sdp_toggle`, runs on/off commands, and
  reflects the state on the button label via `sdp_set_label`.
- **command-notify.sh** - runs a command and shows its output with
  `sdp_notify` (e.g. free disk space). Also logs via `sdp_log`.
- **status-monitor.sh** - a loop that regenerates an image every few seconds and
  pushes it with `sdp_set_image`. Run detached for live zone displays.

## 5. Testing without the device

Action scripts are just executables - run them directly:

```bash
SDP_HOME="$(pwd)" ./buttons/button-3.sh
```

Setting `SDP_HOME` mimics what the daemon does, so `source` and the helpers
resolve correctly. Check that images/labels changed under `buttons/` or
`touchscreen/`, and that notifications appear.

## 6. Troubleshooting

- **See what the daemon did:** it logs to `logs/daemon.log`, and to the journal
  when run as a service:
  ```bash
  journalctl --user -u streamdeck.service -f
  ```
- **Script didn't run:** make sure it's executable (`chmod +x`). The daemon also
  chmods `0755` automatically, but a fresh file must at least exist at the right
  path.
- **`sdp_*: command not found`:** the `source` line is missing or `SDP_HOME`
  isn't set - run via the daemon, or export `SDP_HOME` when testing.
- **Health check:** `./install.sh doctor` diagnoses permissions and device access.
