#!/bin/bash
# Dial 1 counter-clockwise - Step backward/undo macro

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

# Check if already at start - do nothing
if [ $POSITION -le 0 ]; then
    notify-send "Macro" "Already at start" -t 500 --hint=string:synchronous:macro-step
    exit 0
fi

# Get the command at current position (before decrementing)
COMMAND=$(grep "^xdotool" "$MACRO_FILE" | sed -n "${POSITION}p")

# Intelligently undo the command
if echo "$COMMAND" | grep -q "xdotool key "; then
    # It's a regular key press - extract the key
    KEY=$(echo "$COMMAND" | sed 's/xdotool key //')

    # Determine reverse action based on key type
    case "$KEY" in
        Left)
            # Undo left arrow with right arrow
            xdotool key Right
            ;;
        Right)
            # Undo right arrow with left arrow
            xdotool key Left
            ;;
        Up)
            # Undo up arrow with down arrow
            xdotool key Down
            ;;
        Down)
            # Undo down arrow with up arrow
            xdotool key Up
            ;;
        Home)
            # Undo Home with End
            xdotool key End
            ;;
        End)
            # Undo End with Home
            xdotool key Home
            ;;
        Return|KP_Enter)
            # Undo Enter - backspace to delete the newline
            xdotool key BackSpace
            ;;
        space)
            # Undo space with backspace
            xdotool key BackSpace
            ;;
        Tab)
            # Undo tab with backspace
            xdotool key BackSpace
            ;;
        *)
            # Regular character key - send backspace
            xdotool key BackSpace
            ;;
    esac
elif echo "$COMMAND" | grep -q "xdotool keydown"; then
    # It's a modifier combo (keydown/key/keyup) - use Ctrl+Z
    xdotool key ctrl+z
fi

POSITION=$((POSITION - 1))
echo "$POSITION" > "$POSITION_FILE"

TOTAL_COMMANDS=$(grep -c "^xdotool" "$MACRO_FILE")

# Get corresponding event from events file for display
if [ -f "$MACRO_EVENTS" ] && [ $POSITION -gt 0 ]; then
    EVENT=$(sed -n "${POSITION}p" "$MACRO_EVENTS")
    notify-send "Macro Step ◀" "$EVENT ($POSITION/$TOTAL_COMMANDS)" -t 500 --hint=string:synchronous:macro-step
else
    notify-send "Macro Step ◀" "Position $POSITION/$TOTAL_COMMANDS" -t 500 --hint=string:synchronous:macro-step
fi
