#!/bin/bash
# Dial 1 clockwise - Step forward through macro

STATE_FILE="/tmp/streamdeck-dial1-state"
MACRO_FILE="/tmp/streamdeck-dial1-macro.sh"
MACRO_EVENTS="/tmp/streamdeck-dial1-events.txt"
POSITION_FILE="/tmp/streamdeck-dial1-position"
POSITION_TIMEOUT=3  # Reset position after 3 seconds of inactivity

# Only work if macro is recorded
if [ ! -f "$STATE_FILE" ] || [ "$(cat "$STATE_FILE")" != "recorded" ]; then
    notify-send "Macro" "No macro recorded" -t 1000
    exit 0
fi

if [ ! -f "$MACRO_FILE" ] || [ ! -s "$MACRO_FILE" ]; then
    notify-send "Macro" "Empty macro" -t 1000
    exit 0
fi

# Initialize position if needed
if [ ! -f "$POSITION_FILE" ]; then
    echo "0" > "$POSITION_FILE"
fi

# Check if position file is older than 3 seconds - if so, reset to 0 and exit
CURRENT_TIME=$(date +%s)
POSITION_MTIME=$(stat -c %Y "$POSITION_FILE" 2>/dev/null || echo 0)
TIME_DIFF=$((CURRENT_TIME - POSITION_MTIME))

if [ $TIME_DIFF -gt $POSITION_TIMEOUT ]; then
    echo "0" > "$POSITION_FILE"
    notify-send "Macro" "Position reset" -t 500 --hint=string:synchronous:macro-step
    exit 0
fi

POSITION=$(cat "$POSITION_FILE")

# Count non-header, non-sleep lines (actual xdotool commands)
TOTAL_COMMANDS=$(grep -c "^xdotool" "$MACRO_FILE")

# Check if already at end - do nothing
if [ $POSITION -ge $TOTAL_COMMANDS ]; then
    notify-send "Macro" "Already at end" -t 500 --hint=string:synchronous:macro-step
    exit 0
fi

# Step forward
POSITION=$((POSITION + 1))

# Get the Nth xdotool command
COMMAND=$(grep "^xdotool" "$MACRO_FILE" | sed -n "${POSITION}p")

# Execute the command
eval "$COMMAND"

echo "$POSITION" > "$POSITION_FILE"

# Get corresponding event from events file for display
if [ -f "$MACRO_EVENTS" ]; then
    EVENT=$(sed -n "${POSITION}p" "$MACRO_EVENTS")
    notify-send "Macro Step ▶" "$EVENT ($POSITION/$TOTAL_COMMANDS)" -t 500 --hint=string:synchronous:macro-step
else
    notify-send "Macro Step ▶" "Command $POSITION/$TOTAL_COMMANDS" -t 500 --hint=string:synchronous:macro-step
fi
