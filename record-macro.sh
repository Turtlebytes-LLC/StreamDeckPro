#!/bin/bash
# Record Macro - Records keyboard input for a button
# Usage: ./record-macro.sh <button-number>

if [ -z "$1" ]; then
    echo "Usage: ./record-macro.sh <button-number>"
    echo "Example: ./record-macro.sh 5"
    exit 1
fi

BUTTON_NUM=$1
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MACRO_DIR="$SCRIPT_DIR/macros"
MACRO_FILE="$MACRO_DIR/button-$BUTTON_NUM.json"

# Create macros directory if it doesn't exist
mkdir -p "$MACRO_DIR"

echo "======================================"
echo "Recording Macro for Button $BUTTON_NUM"
echo "======================================"
echo ""
echo "Instructions:"
echo "  - Press any keys you want to record"
echo "  - Modifier keys (Ctrl, Shift, Alt) are supported"
echo "  - Press and hold keys will be recorded with timing"
echo "  - Press ESC when done recording"
echo ""
read -p "Press ENTER to start recording..."
echo ""

# Record the macro
python3 "$SCRIPT_DIR/utils/macro-recorder.py" "$MACRO_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "Macro saved successfully!"
    echo "======================================"
    echo ""
    echo "To assign this macro to button $BUTTON_NUM:"
    echo "  1. Open the configurator"
    echo "  2. Assign 'play-macro' to button $BUTTON_NUM"
    echo ""
    echo "To test the macro manually:"
    echo "  python3 $SCRIPT_DIR/utils/macro-player.py $MACRO_FILE"
    echo ""
fi
