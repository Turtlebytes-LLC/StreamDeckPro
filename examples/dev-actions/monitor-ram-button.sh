#!/bin/bash
# RAM Usage Monitor for Stream Deck Button
# This script continuously updates a button with live RAM usage percentage
# Updates every 2 seconds

# Get the button number from the script name
SCRIPT_NAME=$(basename "$0")
BUTTON_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'button-\K\d+')

# If called directly (not from daemon), use button 2
if [ -z "$BUTTON_NUM" ]; then
    BUTTON_NUM=2
fi

# Project directory
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUTTONS_DIR="$PROJECT_DIR/buttons"
IMAGE_FILE="$BUTTONS_DIR/button-$BUTTON_NUM.png"
PID_FILE="/tmp/streamdeck-ram-button-monitor-$BUTTON_NUM.pid"

# Check if monitor is already running for this button
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        kill "$OLD_PID" 2>/dev/null
        sleep 0.2
    fi
fi

# Function to get RAM usage
get_ram_usage() {
    free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}'
}

# Function to generate RAM button image
generate_ram_button_image() {
    local ram_percent=$1

    # Choose color based on usage
    if [ "$ram_percent" -ge 80 ]; then
        COLOR="#ef4444"  # Red
        BG_COLOR="#2a0a0a"
    elif [ "$ram_percent" -ge 60 ]; then
        COLOR="#f59e0b"  # Orange
        BG_COLOR="#2a1a0a"
    else
        COLOR="#10b981"  # Green
        BG_COLOR="#0a2a1a"
    fi

    # Create square button image (120x120 for Stream Deck Plus)
    convert -size 120x120 xc:"$BG_COLOR" \
        -gravity center \
        -fill "$COLOR" -pointsize 48 -font DejaVu-Sans-Bold \
        -annotate +0-10 "${ram_percent}%" \
        -fill '#666666' -pointsize 16 \
        -annotate +0+28 "RAM" \
        "$IMAGE_FILE"
}

# Run in background
(
    # Save our PID
    echo $$ > "$PID_FILE"

    # Initial update
    RAM=$(get_ram_usage)
    generate_ram_button_image "$RAM"

    # Update every 2 seconds
    while true; do
        sleep 2
        RAM=$(get_ram_usage)
        generate_ram_button_image "$RAM"
    done
) &

# Save background process PID
BG_PID=$!
echo $BG_PID > "$PID_FILE"

echo "RAM monitor started for button $BUTTON_NUM (PID: $BG_PID)"
echo "Updates every 2 seconds at: $IMAGE_FILE"
