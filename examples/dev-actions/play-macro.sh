#!/bin/bash
# Play Macro - Plays a recorded macro
# This is a template script that will be customized per button

# Get the button number from the script name
SCRIPT_NAME=$(basename "$0")
BUTTON_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'button-\K\d+')

# If called directly (not from daemon), ask for button number
if [ -z "$BUTTON_NUM" ]; then
    echo "Button number not found in script name"
    exit 1
fi

# Project directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MACRO_DIR="$PROJECT_DIR/macros"
MACRO_FILE="$MACRO_DIR/button-$BUTTON_NUM.json"

# Check if macro exists
if [ ! -f "$MACRO_FILE" ]; then
    echo "No macro recorded for button $BUTTON_NUM"
    echo "Record a macro first using: ./record-macro.sh $BUTTON_NUM"
    exit 1
fi

# Play the macro
python3 "$PROJECT_DIR/utils/macro-player.py" "$MACRO_FILE"
