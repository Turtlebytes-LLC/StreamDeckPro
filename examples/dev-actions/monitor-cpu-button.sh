#!/bin/bash
# CPU Usage Monitor for Stream Deck Button
# This script continuously updates a button with live CPU usage percentage
# Updates every 2 seconds

# Get the button number from the script name
SCRIPT_NAME=$(basename "$0")
BUTTON_NUM=$(echo "$SCRIPT_NAME" | grep -oP 'button-\K\d+')

# If called directly (not from daemon), use button 1
if [ -z "$BUTTON_NUM" ]; then
    BUTTON_NUM=1
fi

# Project directory
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUTTONS_DIR="$PROJECT_DIR/buttons"
IMAGE_FILE="$BUTTONS_DIR/button-$BUTTON_NUM.png"
PID_FILE="/tmp/streamdeck-cpu-button-monitor-$BUTTON_NUM.pid"

# Check if monitor is already running for this button
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        # Already running, kill it to restart
        kill "$OLD_PID" 2>/dev/null
        sleep 0.2
    fi
fi

# Function to get CPU usage
get_cpu_usage() {
    top -bn2 -d 0.5 | grep "Cpu(s)" | tail -1 | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'
}

# Function to generate CPU button image
generate_cpu_button_image() {
    local cpu_percent=$1
    local cpu_int=$(printf "%.0f" "$cpu_percent")

    # Choose color based on usage
    if [ "$cpu_int" -ge 80 ]; then
        COLOR="#ef4444"  # Red
        BG_COLOR="#2a0a0a"
    elif [ "$cpu_int" -ge 50 ]; then
        COLOR="#f59e0b"  # Orange
        BG_COLOR="#2a1a0a"
    else
        COLOR="#3b82f6"  # Blue
        BG_COLOR="#0a1a2a"
    fi

    # Create square button image (120x120 for Stream Deck Plus)
    convert -size 120x120 xc:"$BG_COLOR" \
        -gravity center \
        -fill "$COLOR" -pointsize 48 -font DejaVu-Sans-Bold \
        -annotate +0-10 "${cpu_int}%" \
        -fill '#666666' -pointsize 16 \
        -annotate +0+28 "CPU" \
        "$IMAGE_FILE"
}

# Run in background
(
    # Save our PID
    echo $$ > "$PID_FILE"

    # Initial update
    CPU=$(get_cpu_usage)
    generate_cpu_button_image "$CPU"

    # Update every 2 seconds
    while true; do
        sleep 2
        CPU=$(get_cpu_usage)
        generate_cpu_button_image "$CPU"
    done
) &

# Save background process PID
BG_PID=$!
echo $BG_PID > "$PID_FILE"

echo "CPU monitor started for button $BUTTON_NUM (PID: $BG_PID)"
echo "Updates every 2 seconds at: $IMAGE_FILE"
