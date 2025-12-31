#!/bin/bash
ACTIONS_DIR="$HOME/streamdeck-actions"
TOUCH_IMAGE="$ACTIONS_DIR/touchscreen/touch-3.png"
GENERATOR="$ACTIONS_DIR/generate-volume-image.py"

volume=$(wpctl get-volume @DEFAULT_AUDIO_SINK@ 2>/dev/null | awk '{printf "%.0f", $2 * 100}')
muted=""
wpctl get-volume @DEFAULT_AUDIO_SINK@ 2>/dev/null | grep -qi "muted" && muted="muted"

if [ -n "$muted" ]; then
    python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE" muted
else
    python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE"
fi
