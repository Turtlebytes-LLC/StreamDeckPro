#!/bin/bash
# Template: cycle to the next (or previous) layout profile.
source "${SDP_HOME:-$(cd "$(dirname "$0")/.." && pwd)}/lib/sdp-helpers.sh"

# ---- EDIT HERE -------------------------------------------------------------
DIRECTION="next"        # "next" or "prev"
# ----------------------------------------------------------------------------

sdp_cycle_profile "$DIRECTION"
sdp_notify "Profile" "Now on $(sdp_active_profile)"
