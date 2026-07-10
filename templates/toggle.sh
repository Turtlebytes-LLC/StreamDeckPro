#!/bin/bash
# Template: flip a boolean and reflect it on the button label.
source "${SDP_HOME:-$(cd "$(dirname "$0")/.." && pwd)}/lib/sdp-helpers.sh"

# ---- EDIT HERE -------------------------------------------------------------
KEY="my_toggle"         # state key name
ELEMENT="button-1"      # element whose label shows the state
ON_CMD() { echo "turned on"; }    # runs when toggled on
OFF_CMD() { echo "turned off"; }  # runs when toggled off
# ----------------------------------------------------------------------------

STATE="$(sdp_toggle "$KEY")"
if [ "$STATE" = "on" ]; then ON_CMD; else OFF_CMD; fi
sdp_set_label "$ELEMENT" "$STATE"
sdp_notify "Toggle" "$KEY is $STATE"
