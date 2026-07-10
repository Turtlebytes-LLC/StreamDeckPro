# Script Authoring

## ADDED Requirements

### Requirement: Sourceable helper library

The system SHALL provide lib/sdp-helpers.sh, a bash library action scripts can
source with `source "$(dirname "$0")/../lib/sdp-helpers.sh"` (or via the
SDP_HOME env var the daemon exports), exposing at minimum:
- `sdp_notify <title> <body>` - desktop notification (notify-send with fallback to echo)
- `sdp_set_image <element> <path>` - set a button/zone image (copies to the element's .png path)
- `sdp_set_label <element> <text>` - set an element label (writes the .txt path)
- `sdp_state_get <key>` / `sdp_state_set <key> <value>` - persistent key-value state in ${XDG_STATE_HOME:-$HOME/.local/state}/streamdeckpro/
- `sdp_toggle <key>` - flip a boolean state key, echo the new value
- `sdp_log <msg>` - timestamped line to the daemon journal namespace

#### Scenario: helpers load cleanly
- **WHEN** `bash -c 'source lib/sdp-helpers.sh && type sdp_notify sdp_set_image sdp_set_label sdp_state_get sdp_state_set sdp_toggle sdp_log'` runs from the repo root
- **THEN** exit code is 0 and each name reports as a function

#### Scenario: state round-trip
- **WHEN** `sdp_state_set demo hello` then `sdp_state_get demo` run
- **THEN** stdout is `hello` and the value persists in a file under ${XDG_STATE_HOME:-$HOME/.local/state}/streamdeckpro/

#### Scenario: toggle flips
- **WHEN** `sdp_toggle demo_flag` runs twice from an unset state
- **THEN** first call echoes `on`, second echoes `off`

### Requirement: Action templates

The system SHALL ship templates/ containing exactly these executable
template scripts, each under 40 lines with a commented "EDIT HERE" block:
app-launch.sh, keystroke.sh, toggle.sh, command-notify.sh, status-monitor.sh.

#### Scenario: templates are valid bash
- **WHEN** `bash -n templates/*.sh` runs
- **THEN** exit code is 0 for every file

### Requirement: Interactive scaffolder

The `create-action` command SHALL scaffold a new action: it prompts for (or
accepts as flags) template, target element (e.g. button-3, dial-2-press,
touch-1-swipe-up), and label; copies the template to the correct directory
with the correct name; makes it executable; and writes the .txt label.

#### Scenario: non-interactive scaffold
- **WHEN** `./create-action --template app-launch --target button-3 --label "Files" --force` runs in a sandbox copy of the repo
- **THEN** buttons/button-3.sh exists, is executable, contains the app-launch template body, and buttons/button-3.txt contains `Files`

#### Scenario: refuses to clobber without --force
- **WHEN** the target script already exists and --force is not given
- **THEN** the command exits non-zero and leaves the existing file untouched

### Requirement: Authoring guide

The system SHALL provide docs/WRITING-ACTIONS.md documenting: the
filesystem-as-config contract (naming for every element and gesture), the
full sdp-helpers API with one example per function, one worked example per
template, and how to test an action without the device (run the script
directly; check journal output).

#### Scenario: guide covers the API
- **WHEN** `grep -c 'sdp_' docs/WRITING-ACTIONS.md` runs
- **THEN** every function name exported by lib/sdp-helpers.sh appears at least once
