#!/bin/bash
# Template: periodically regenerate an image for an element.
# Run detached; it loops until killed (e.g. by ./stop).
source "${SDP_HOME:-$(cd "$(dirname "$0")/.." && pwd)}/lib/sdp-helpers.sh"

# ---- EDIT HERE -------------------------------------------------------------
ELEMENT="touch-1"        # element to update
INTERVAL=5               # seconds between updates
render() {               # produce a PNG at $1
    # Example: reuse the bundled status image generator.
    python3 "$SDP_HOME/listeners/generate-status-image.py" \
        --kind cpu --value "$(nproc)" --out "$1"
}
# ----------------------------------------------------------------------------

TMP="$(mktemp --suffix=.png)"
trap 'rm -f "$TMP"' EXIT
while true; do
    render "$TMP" && sdp_set_image "$ELEMENT" "$TMP"
    sleep "$INTERVAL"
done
