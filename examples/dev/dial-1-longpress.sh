#!/bin/bash
# Dial 1 long press - Clear macro

STATE_FILE="/tmp/streamdeck-dial1-state"
MACRO_FILE="/tmp/streamdeck-dial1-macro"
POSITION_FILE="/tmp/streamdeck-dial1-position"
RECORDING_PID_FILE="/tmp/streamdeck-dial1-recording-pid"

# Kill any recording process
if [ -f "$RECORDING_PID_FILE" ]; then
    kill $(cat "$RECORDING_PID_FILE") 2>/dev/null
    rm "$RECORDING_PID_FILE"
fi

# Clear all macro files
rm -f "$MACRO_FILE" "$MACRO_FILE.txt" "$POSITION_FILE"
echo "idle" > "$STATE_FILE"

notify-send "Macro Cleared" "🗑️ Macro deleted - ready to record new" -t 2000
