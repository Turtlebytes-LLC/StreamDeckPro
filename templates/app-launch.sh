#!/bin/bash
# Template: launch an application.
source "${SDP_HOME:-$(cd "$(dirname "$0")/.." && pwd)}/lib/sdp-helpers.sh"

# ---- EDIT HERE -------------------------------------------------------------
APP="firefox"          # command to launch
# ----------------------------------------------------------------------------

"$APP" &
sdp_notify "Launched" "$APP"
