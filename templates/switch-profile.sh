#!/bin/bash
# Template: switch to a named layout profile. The daemon hot-reloads on change.
source "${SDP_HOME:-$(cd "$(dirname "$0")/.." && pwd)}/lib/sdp-helpers.sh"

# ---- EDIT HERE -------------------------------------------------------------
PROFILE="work"          # profile name, or "default" for the top-level layout
# ----------------------------------------------------------------------------

sdp_switch_profile "$PROFILE"
sdp_notify "Profile" "Switched to $PROFILE"
