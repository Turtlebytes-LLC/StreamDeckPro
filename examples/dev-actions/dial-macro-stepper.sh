#!/bin/bash
# Dial Macro Stepper - Control macro playback with dial
# Press: Play macro
# Hold: Reset macro
# Rotate: Step through macro

# Get the dial number and action from the script name
SCRIPT_NAME=$(basename "$0")
DIAL_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'dial-\K\d+')

# If called directly, get from arguments
if [ -z "$DIAL_NUM" ]; then
    if [ -n "$1" ]; then
        DIAL_NUM=$1
        ACTION=$2
    else
        echo "Usage: $0 <dial-num> <action>"
        echo "Actions: press, hold, left, right"
        exit 1
    fi
else
    # Called by daemon, action is in $1
    ACTION=$1
fi

# Project directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MACRO_FILE="$PROJECT_DIR/macros/dial-$DIAL_NUM.json"
STATE_FILE="/tmp/streamdeck-dial-$DIAL_NUM-macro-state.json"
CONTROLLER="$PROJECT_DIR/utils/dial-macro-controller.py"

# Handle different actions
case "$ACTION" in
    press)
        # If no macro exists, launch recorder
        if [ ! -f "$MACRO_FILE" ]; then
            echo "No macro recorded yet - launching recorder..."

            # Detect available terminal
            TERMINAL=""
            for term_cmd in konsole gnome-terminal xfce4-terminal xterm alacritty kitty terminator; do
                if command -v $term_cmd >/dev/null 2>&1; then
                    TERMINAL=$term_cmd
                    break
                fi
            done

            if [ -z "$TERMINAL" ]; then
                echo "Error: No terminal emulator found"
                exit 1
            fi

            # Launch recorder in terminal
            RECORDER="$PROJECT_DIR/utils/macro-recorder.py"
            if [ "$TERMINAL" = "konsole" ]; then
                konsole -e bash -c "python3 '$RECORDER' '$MACRO_FILE'; echo ''; echo 'Press ENTER to close...'; read" &
            elif [ "$TERMINAL" = "gnome-terminal" ]; then
                gnome-terminal -- bash -c "python3 '$RECORDER' '$MACRO_FILE'; echo ''; echo 'Press ENTER to close...'; read" &
            else
                $TERMINAL -e bash -c "python3 '$RECORDER' '$MACRO_FILE'; echo ''; echo 'Press ENTER to close...'; read" &
            fi

            echo "Recording terminal opened. Press ESC when done."
        else
            echo "Playing macro..."
            python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" play
        fi
        ;;
    hold)
        if [ -f "$MACRO_FILE" ]; then
            echo "Clearing macro..."
            # Reset state first
            if [ -f "$STATE_FILE" ]; then
                python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" reset
            fi
            # Delete the macro file
            rm -f "$MACRO_FILE" "$STATE_FILE"
            echo "Macro cleared! Press dial to record a new one."
        else
            echo "No macro to clear"
        fi
        ;;
    left)
        if [ ! -f "$MACRO_FILE" ]; then
            echo "No macro recorded yet. Press dial to record."
            exit 0
        fi
        echo "Step backward..."
        python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" backward
        ;;
    right)
        if [ ! -f "$MACRO_FILE" ]; then
            echo "No macro recorded yet. Press dial to record."
            exit 0
        fi
        echo "Step forward..."
        python3 "$CONTROLLER" "$MACRO_FILE" "$STATE_FILE" forward
        ;;
    *)
        echo "Unknown action: $ACTION"
        echo "Actions: press, hold, left, right"
        exit 1
        ;;
esac
