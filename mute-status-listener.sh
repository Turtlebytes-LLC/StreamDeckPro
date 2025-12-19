#!/bin/bash
# Real-time mute status listener for Stream Deck
# This listens to PulseAudio/PipeWire events and updates the mute button instantly

ACTIONS_DIR="$(cd "$(dirname "$0")" && pwd)"
TOUCH_FILE="$ACTIONS_DIR/touchscreen/touch-2.txt"

# Function to update mute status
update_mute_status() {
    if command -v pactl &> /dev/null; then
        MUTE_STATUS=$(pactl get-sink-mute @DEFAULT_SINK@ 2>/dev/null | grep -o "yes\|no")

        if [ "$MUTE_STATUS" = "yes" ]; then
            echo "Unmute" > "$TOUCH_FILE"
        else
            echo "Mute" > "$TOUCH_FILE"
        fi
    elif command -v amixer &> /dev/null; then
        MUTE_STATUS=$(amixer get Master | grep -o "\[on\]\|\[off\]" | head -1)

        if [ "$MUTE_STATUS" = "[off]" ]; then
            echo "Unmute" > "$TOUCH_FILE"
        else
            echo "Mute" > "$TOUCH_FILE"
        fi
    fi
}

# Update status immediately on startup
update_mute_status

# Listen for audio events and update on changes
if command -v pactl &> /dev/null; then
    echo "Starting mute status listener (pactl)..."
    pactl subscribe | while read -r event; do
        # Listen for sink events (audio output changes)
        if echo "$event" | grep -q "sink"; then
            update_mute_status
        fi
    done
else
    echo "pactl not found, falling back to polling every 1 second..."
    # Fallback: poll every second if pactl subscribe isn't available
    while true; do
        update_mute_status
        sleep 1
    done
fi
