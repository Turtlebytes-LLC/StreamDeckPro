#!/bin/bash
# Template: run a command and show its result as a notification.
source "${SDP_HOME:-$(cd "$(dirname "$0")/.." && pwd)}/lib/sdp-helpers.sh"

# ---- EDIT HERE -------------------------------------------------------------
TITLE="Disk free"
COMMAND() { df -h / | awk 'NR==2 {print $4 " free"}'; }
# ----------------------------------------------------------------------------

OUTPUT="$(COMMAND 2>&1)"
sdp_notify "$TITLE" "$OUTPUT"
sdp_log "$TITLE -> $OUTPUT"
