#!/bin/bash
# Status updater for Stream Deck dynamic labels
# This script checks system status and updates button/touch labels

ACTIONS_DIR="$(dirname "$0")"

# Function to check mute status
update_mute_status() {
    # Check if muted using pactl (PulseAudio/PipeWire)
    if command -v pactl &> /dev/null; then
        MUTE_STATUS=$(pactl get-sink-mute @DEFAULT_SINK@ 2>/dev/null | grep -o "yes\|no")

        if [ "$MUTE_STATUS" = "yes" ]; then
            echo "Unmute" > "$ACTIONS_DIR/touchscreen/touch-2.txt"
        else
            echo "Mute" > "$ACTIONS_DIR/touchscreen/touch-2.txt"
        fi
    # Fallback to amixer (ALSA)
    elif command -v amixer &> /dev/null; then
        MUTE_STATUS=$(amixer get Master | grep -o "\[on\]\|\[off\]" | head -1)

        if [ "$MUTE_STATUS" = "[off]" ]; then
            echo "Unmute" > "$ACTIONS_DIR/touchscreen/touch-2.txt"
        else
            echo "Mute" > "$ACTIONS_DIR/touchscreen/touch-2.txt"
        fi
    fi
}

# Update all dynamic statuses
update_mute_status

# Add more status updates here as needed
# update_other_status() { ... }
