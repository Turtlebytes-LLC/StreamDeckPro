#!/bin/bash
ACTIONS_DIR="$HOME/streamdeck-actions"
TOUCH_IMAGE="$ACTIONS_DIR/touchscreen/touch-3.png"
GENERATOR="$ACTIONS_DIR/generate-volume-image.py"

get_volume() {
    wpctl get-volume @DEFAULT_AUDIO_SINK@ 2>/dev/null | awk '{printf "%.0f", $2 * 100}'
}

is_muted() {
    wpctl get-volume @DEFAULT_AUDIO_SINK@ 2>/dev/null | grep -qi "muted"
}

LAST_STATE=""

update_if_changed() {
    local volume=$(get_volume)
    local muted=""
    is_muted && muted="muted"
    
    local current_state="${volume}-${muted}"
    
    if [ "$current_state" != "$LAST_STATE" ]; then
        LAST_STATE="$current_state"
        if [ -n "$muted" ]; then
            python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE" muted
            echo "Updated: MUTED ($volume%)"
        else
            python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE"
            echo "Updated: $volume%"
        fi
    fi
}

echo "Volume listener (polling mode)"
echo "Current: $(get_volume)%"
echo ""

# Initial update
LAST_STATE=""
update_if_changed

# Poll every 0.2 seconds
while true; do
    update_if_changed
    sleep 0.2
done
