# Profiles and Pages

## ADDED Requirements

### Requirement: Profile-aware element paths

The system SHALL resolve button/dial/touchscreen scripts and images against the
active profile. profiles/<name>/{buttons,dials,touchscreen}/ holds a named
profile's layout; the `default` profile maps to the legacy top-level
buttons/dials/touchscreen dirs. The active profile is named in the `.profile`
file at the repo root; absent, empty, or "default" selects the top-level dirs.
A named profile whose directory is missing SHALL fall back to the top-level
dirs and log a warning.

#### Scenario: no profile file selects top-level dirs
- **WHEN** `.profile` does not exist and `ProfileManager(config).BUTTONS_DIR` is read
- **THEN** it equals `config.SDP_HOME / "buttons"` and `active_profile_name()` is `"default"`

#### Scenario: named profile resolves under profiles/
- **WHEN** `.profile` contains `work` and profiles/work/ exists
- **THEN** `BUTTONS_DIR` equals `SDP_HOME/profiles/work/buttons` and `TOUCH_DIR` equals `SDP_HOME/profiles/work/touchscreen`

#### Scenario: missing profile dir falls back safely
- **WHEN** `.profile` contains `ghost` and profiles/ghost/ does not exist
- **THEN** `BUTTONS_DIR` equals `SDP_HOME/buttons` (no crash)

#### Scenario: characterization suite still green
- **WHEN** `python -m pytest -q` runs
- **THEN** all pre-existing event/watcher/rendering/action tests still pass

### Requirement: Profile hot-reload

The daemon SHALL detect a change to the active profile within one poll cycle
and redraw all buttons and the touchscreen for the new profile, without
restarting. Detection watches both the resolved active name and the `.profile`
file mtime.

#### Scenario: switching profile triggers a redraw
- **WHEN** the active profile changes and `FileWatcher.check_profile_change()` runs
- **THEN** it returns True and invokes the redraw callback exactly once

#### Scenario: no change does not redraw
- **WHEN** the profile is unchanged since the last check
- **THEN** `check_profile_change()` returns False and does not redraw

### Requirement: Built-in profile switch actions

The system SHALL let action scripts switch and cycle profiles via sdp-helpers
functions, and SHALL ship templates for both. Switching writes the profile name
to `.profile`.

#### Scenario: switch helper sets the active profile
- **WHEN** `sdp_switch_profile work` runs with SDP_HOME set
- **THEN** `.profile` contains `work` and `sdp_active_profile` echoes `work`

#### Scenario: cycle advances and wraps
- **WHEN** profiles are default, gaming, work and `sdp_cycle_profile` runs repeatedly from default
- **THEN** the active profile goes default -> gaming -> work -> default

#### Scenario: switch templates are valid bash
- **WHEN** `bash -n templates/switch-profile.sh templates/cycle-profile.sh` runs
- **THEN** exit code is 0

### Requirement: App-aware auto-switching (opt-in sidecar)

The system SHALL provide an optional poller that maps the focused window class
to a profile and switches to it, running as a standalone process outside the
daemon loop. Mappings live in app-profiles.conf as `window_class = profile`
lines with `#` comments. It SHALL NOT switch when no mapping matches or when the
target already matches the active profile.

#### Scenario: mapping file parses
- **WHEN** app-profiles.conf contains `firefox = web` and `# comment` and a blank line
- **THEN** `appswitch.load_mapping(path)` returns `{"firefox": "web"}`

#### Scenario: unmapped window does not switch
- **WHEN** the focused window class has no mapping entry
- **THEN** `decide_switch(window_class, mapping, current)` returns None

#### Scenario: mapped window switches only on change
- **WHEN** the focused window maps to `web` and the current profile is `default`
- **THEN** `decide_switch` returns `web`; when current is already `web` it returns None
