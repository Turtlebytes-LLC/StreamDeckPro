#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ACTIONS_DIR="$HOME/streamdeck-actions"
TOUCH_IMAGE="$ACTIONS_DIR/touchscreen/touch-1.png"
GENERATOR="$SCRIPT_DIR/generate-volume-image.py"

TOUCH_DIR="$ACTIONS_DIR/touchscreen"
mkdir -p "$TOUCH_DIR"

get_volume() {
    pactl get-sink-volume @DEFAULT_SINK@ 2>/dev/null | grep -oP '\d+%' | head -1 | tr -d '%'
}

is_muted() {
    pactl get-sink-mute @DEFAULT_SINK@ 2>/dev/null | grep -q "yes"
}

update_volume_display() {
    local volume=$(get_volume)
    
    if [ -z "$volume" ]; then
        volume=0
    fi
    
    if is_muted; then
        python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE" muted
    else
        python3 "$GENERATOR" "$volume" "$TOUCH_IMAGE"
    fi
}

update_volume_display

echo "Starting volume status listener..."
echo "Volume display on touchscreen zone 1"
echo "Press Ctrl+C to stop"

if command -v pactl &> /dev/null; then
    pactl subscribe 2>/dev/null | while read -r event; do
        if echo "$event" | grep -qE "sink|server"; then
            update_volume_display
        fi
    done
else
    echo "pactl not found, falling back to polling every 2 seconds..."
    while true; do
        update_volume_display
        sleep 2
    done
fi
