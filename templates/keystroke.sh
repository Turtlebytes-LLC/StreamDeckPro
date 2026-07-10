#!/bin/bash
# Template: send a keyboard shortcut (requires xdotool on X11).
source "${SDP_HOME:-$(cd "$(dirname "$0")/.." && pwd)}/lib/sdp-helpers.sh"

# ---- EDIT HERE -------------------------------------------------------------
KEYS="ctrl+shift+t"     # xdotool key spec (e.g. super+d, ctrl+c)
# ----------------------------------------------------------------------------

if command -v xdotool >/dev/null 2>&1; then
    xdotool key --clearmodifiers "$KEYS"
else
    sdp_notify "Stream Deck" "xdotool not installed"
fi
