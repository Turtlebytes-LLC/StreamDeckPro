# Script Authoring

## ADDED Requirements

### Requirement: Profile helper functions

lib/sdp-helpers.sh SHALL expose profile functions and resolve element writes
against the active profile:
- `sdp_active_profile` - echo the active profile name ("default" when unset)
- `sdp_profile_root` - echo the element-dir root for the active profile
- `sdp_list_profiles` - echo "default" plus each dir under profiles/
- `sdp_switch_profile <name>` - set the active profile
- `sdp_cycle_profile [next|prev]` - advance to the adjacent profile

#### Scenario: profile helpers are defined
- **WHEN** `bash -c 'source lib/sdp-helpers.sh && type sdp_active_profile sdp_profile_root sdp_list_profiles sdp_switch_profile sdp_cycle_profile'` runs from repo root
- **THEN** exit code is 0 and each name reports as a function

#### Scenario: element dir follows the active profile
- **WHEN** `.profile` names `work`, profiles/work exists, and `_sdp_element_dir button-1` runs
- **THEN** it echoes `$SDP_HOME/profiles/work/buttons`

### Requirement: Profile action templates

templates/ SHALL include switch-profile.sh and cycle-profile.sh, each valid
bash under 40 lines with an "EDIT HERE" block.

#### Scenario: templates parse
- **WHEN** `bash -n templates/switch-profile.sh templates/cycle-profile.sh` runs
- **THEN** exit code is 0
